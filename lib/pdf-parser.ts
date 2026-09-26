/**
 * PDF & MCQ Parsing Engine
 * Extracts text from uploaded PDF question papers and parses them into structured MCQs.
 * Detects questions, options (A/B/C/D, 1/2/3/4, i/ii/iii/iv), correct answer keys, and explanations.
 * Includes layout-aware PDF sorting and intelligent prompt-option separation.
 */

export interface ExtractedOption {
  id: string;
  key: string; // 'A' | 'B' | 'C' | 'D' | etc.
  text: string;
}

export interface ExtractedQuestion {
  id: string;
  questionNumber: number;
  sectionTitle?: string;
  passageContext?: string;
  prompt: string;
  codeSnippet?: string;
  options: ExtractedOption[];
  correctOptionKey: string; // e.g. 'A', 'B', 'C', 'D'
  explanation: string;
  marks: number;
  negativeMarks: number;
  needsReview?: boolean;
  reviewReasons?: string[];
}

export interface ParseOptions {
  expectedOptionsCount?: number; // 4 or 5 (auto-inferred if omitted)
  maxOptionLength?: number; // default 150
}

export interface ParseResult {
  questions: ExtractedQuestion[];
  rawText: string;
  totalQuestions: number;
  identifiedAnswersCount: number;
  flaggedQuestionsCount: number;
  warnings: string[];
}

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/**
 * Dynamically load PDF.js from reliable CDN in browser
 */
async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-pdfjs="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).pdfjsLib));
      existing.addEventListener('error', () => reject(new Error('PDF.js script load error')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.setAttribute('data-pdfjs', 'true');
    script.async = true;

    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(lib);
      } else {
        reject(new Error('PDF.js loaded but pdfjsLib object is missing'));
      }
    };

    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(script);
  });
}

/**
 * Extract raw text from a PDF file using PDF.js with spatial layout preservation.
 * Sorts text items top-to-bottom and left-to-right, handling single and multi-column formats.
 */
export async function extractTextFromPdfFile(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  if (!pdfjs) {
    throw new Error('PDF.js is only available in browser environment.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const pageWidth = viewport.width || 612;

    const items: PdfTextItem[] = [];
    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string' && item.str.length > 0) {
        const x = item.transform ? Math.round(item.transform[4]) : 0;
        const y = item.transform ? Math.round(item.transform[5]) : 0;
        items.push({
          str: item.str,
          x,
          y,
          width: item.width,
          height: item.height,
        });
      }
    }

    // Helper to group items by Y-lines and sort left-to-right by X
    const processItemsToLines = (colItems: PdfTextItem[]): string[] => {
      // Sort primarily by Y descending (PDF origin is bottom-left; higher Y is higher on page)
      const sorted = [...colItems].sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 4) {
          return yDiff;
        }
        return a.x - b.x;
      });

      const lines: string[] = [];
      let currentLineY: number | null = null;
      let currentLineItems: PdfTextItem[] = [];

      for (const item of sorted) {
        if (currentLineY === null || Math.abs(item.y - currentLineY) <= 4) {
          currentLineItems.push(item);
          if (currentLineY === null) currentLineY = item.y;
        } else {
          // Finish line: sort items left-to-right
          currentLineItems.sort((a, b) => a.x - b.x);
          let lineStr = '';
          for (const ci of currentLineItems) {
            if (lineStr && !lineStr.endsWith(' ') && !ci.str.startsWith(' ')) {
              lineStr += ' ';
            }
            lineStr += ci.str;
          }
          if (lineStr.trim()) lines.push(lineStr.trim());

          currentLineItems = [item];
          currentLineY = item.y;
        }
      }

      if (currentLineItems.length > 0) {
        currentLineItems.sort((a, b) => a.x - b.x);
        let lineStr = '';
        for (const ci of currentLineItems) {
          if (lineStr && !lineStr.endsWith(' ') && !ci.str.startsWith(' ')) {
            lineStr += ' ';
          }
          lineStr += ci.str;
        }
        if (lineStr.trim()) lines.push(lineStr.trim());
      }

      return lines;
    };

    // Detect 2-column layout (substantial text in both left and right halves)
    const midX = pageWidth * 0.5;
    const leftHalf = items.filter((it) => it.x < midX - 20 && it.str.trim());
    const rightHalf = items.filter((it) => it.x > midX + 20 && it.str.trim());
    const isTwoColumn =
      items.length > 25 &&
      leftHalf.length > items.length * 0.25 &&
      rightHalf.length > items.length * 0.25;

    let pageLines: string[] = [];
    if (isTwoColumn) {
      // Assign each item to left or right column; dead-zone items go to nearest
      const col1: PdfTextItem[] = [];
      const col2: PdfTextItem[] = [];
      for (const it of items) {
        if (it.x <= midX) {
          col1.push(it);
        } else {
          col2.push(it);
        }
      }

      // Process each column into tagged lines with representative Y for interleaving
      interface TaggedLine { y: number; text: string }
      const tagLines = (colItems: PdfTextItem[]): TaggedLine[] => {
        const sorted = [...colItems].sort((a, b) => {
          const yDiff = b.y - a.y;
          if (Math.abs(yDiff) > 4) return yDiff;
          return a.x - b.x;
        });
        const result: TaggedLine[] = [];
        let curY: number | null = null;
        let curItems: PdfTextItem[] = [];
        const flushLine = () => {
          if (curItems.length === 0) return;
          curItems.sort((a, b) => a.x - b.x);
          let s = '';
          for (const ci of curItems) {
            if (s && !s.endsWith(' ') && !ci.str.startsWith(' ')) s += ' ';
            s += ci.str;
          }
          if (s.trim()) result.push({ y: curY!, text: s.trim() });
        };
        for (const item of sorted) {
          if (curY === null || Math.abs(item.y - curY) <= 4) {
            curItems.push(item);
            if (curY === null) curY = item.y;
          } else {
            flushLine();
            curItems = [item];
            curY = item.y;
          }
        }
        flushLine();
        return result;
      };

      // Interleave by Y-coordinate (top-to-bottom: higher Y first) so
      // cross-column questions maintain reading order
      const left = tagLines(col1);
      const right = tagLines(col2);
      const merged = [...left, ...right].sort((a, b) => b.y - a.y);
      pageLines = merged.map((tl) => tl.text);
    } else {
      pageLines = processItemsToLines(items);
    }

    fullText += `\n[--- PAGE ${pageNum} ---]\n` + pageLines.join('\n') + '\n';
  }

  return fullText;
}

/**
 * Clean and normalize text extracted from PDF
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove page markers
    .replace(/\[---\s*PAGE\s*\d+\s*---\]/gi, '')
    // Normalize unicode quotation marks and spaces
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Normalize unicode hyphens/dashes
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u00A0/g, ' ');
}

/**
 * Maps raw option markers (letters A-F, numbers 1-5, roman numerals i-v)
 * to standard uppercase 'A' | 'B' | 'C' | 'D' | 'E'
 */
export function normalizeOptionKey(rawKey: string): string {
  const k = rawKey.trim().toUpperCase();
  if (['A', 'B', 'C', 'D', 'E', 'F'].includes(k)) return k;
  if (k === '1') return 'A';
  if (k === '2') return 'B';
  if (k === '3') return 'C';
  if (k === '4') return 'D';
  if (k === '5') return 'E';
  if (k === 'I') return 'A';
  if (k === 'II') return 'B';
  if (k === 'III') return 'C';
  if (k === 'IV') return 'D';
  if (k === 'V') return 'E';
  return k;
}

/**
 * Strips leading option badges/prefixes, asterisks, and markers from option text.
 * e.g. "(A) Apple" -> "Apple"
 *      "A. Apple" -> "Apple"
 *      "1) Apple" -> "Apple"
 *      "Option A: Apple" -> "Apple"
 *      "* Apple" -> "Apple"
 */
export function cleanOptionText(text: string): string {
  return text
    .replace(/^\*+|\*+$/g, '')
    // Strip leading option badges: (A), [A], A., A), A:, A -, 1., 1), (1), (i), Option A:, Opt A.
    .replace(
      /^\s*(?:(?:Option|Opt|Choice)\s+)?(?:[\(\[]?(?:[A-Fa-f]|[1-5]|i{1,3}|iv|v)[\)\].:\-–]|[\(\[][A-Fa-f0-9]+[\)\]])\s*/i,
      ''
    )
    .replace(/^\*+|\*+$/g, '')
    .trim();
}

/**
 * Unpacks any option whose text inadvertently contains multiple collapsed options.
 * e.g. text: "32 B) 36 C) 38 D) 40 E) 42"
 * becomes:
 * [
 *   { id: 'opt_1_a', key: 'A', text: '32' },
 *   { id: 'opt_1_b', key: 'B', text: '36' },
 *   { id: 'opt_1_c', key: 'C', text: '38' },
 *   { id: 'opt_1_d', key: 'D', text: '40' },
 *   { id: 'opt_1_e', key: 'E', text: '42' }
 * ]
 */
export function unpackExtractedOptions(
  options: ExtractedOption[],
  qNum: number = 1
): ExtractedOption[] {
  if (!options || options.length === 0) return options;

  const subOptionRegex =
    /(?:^|\s+)(?:[\(\[]?([B-Eb-e])[\)\].:\-–]|[\(\[]([B-Eb-e])[\)\]])\s+/;

  const hasEmbedded = options.some((opt) => subOptionRegex.test(opt.text));
  if (!hasEmbedded) return options;

  const unpacked: ExtractedOption[] = [];
  const seenKeys = new Set<string>();

  for (const opt of options) {
    const text = (opt.text || '').trim();
    const markerRegex =
      /(?:^|\s+)(?:[\(\[]([A-Ea-e])[\)\]]|(?:Option\s+)?([A-Ea-e])[\)\].:\-–])\s+/gi;

    const matches: { index: number; length: number; key: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = markerRegex.exec(text)) !== null) {
      const rawKey = (m[1] || m[2]).toUpperCase();
      if (rawKey) {
        matches.push({
          index: m.index,
          length: m[0].length,
          key: rawKey,
        });
      }
    }

    if (matches.length === 0) {
      const key = opt.key || 'A';
      if (!seenKeys.has(key) && unpacked.length < 5) {
        seenKeys.add(key);
        unpacked.push({
          id: opt.id,
          key,
          text: cleanOptionText(opt.text),
        });
      }
    } else {
      const initialText = cleanOptionText(text.substring(0, matches[0].index).trim());
      const parentKey = opt.key || 'A';
      if (!seenKeys.has(parentKey) && unpacked.length < 5) {
        seenKeys.add(parentKey);
        unpacked.push({
          id: `opt_${qNum}_${parentKey.toLowerCase()}`,
          key: parentKey,
          text: initialText || cleanOptionText(text),
        });
      }

      for (let i = 0; i < matches.length; i++) {
        const cur = matches[i];
        const textStart = cur.index + cur.length;
        const textEnd = i + 1 < matches.length ? matches[i + 1].index : text.length;
        const subText = cleanOptionText(text.substring(textStart, textEnd).trim());
        const key = cur.key;
        if (!seenKeys.has(key) && unpacked.length < 5) {
          seenKeys.add(key);
          unpacked.push({
            id: `opt_${qNum}_${key.toLowerCase()}`,
            key,
            text: subText,
          });
        }
      }
    }
  }

  return unpacked.length > 0 ? unpacked : options;
}

/**
 * Unpacks formal QuestionOption[] models during exam runtime or admin review.
 * Converts collapsed options like "32 B) 36 C) 38 D) 40 E) 42" into distinct options A, B, C, D, E.
 * Strictly guarantees that options do not multiply or exceed 5 choices.
 */
export function unpackQuestionOptions(
  options: { id: string; text: string; codeSnippet?: string }[],
  questionId: string = 'q'
): { id: string; text: string; codeSnippet?: string }[] {
  if (!options || options.length === 0) return options;

  const subOptionRegex =
    /(?:^|\s+)(?:[\(\[]?([B-Eb-e])[\)\].:\-–]|[\(\[]([B-Eb-e])[\)\]])\s+/;

  const hasEmbedded = options.some((opt) => subOptionRegex.test(opt.text));
  if (!hasEmbedded) return options;

  const unpacked: { id: string; text: string; codeSnippet?: string }[] = [];
  const seenKeys = new Set<string>();

  options.forEach((opt, optIdx) => {
    const text = (opt.text || '').trim();
    const markerRegex =
      /(?:^|\s+)(?:[\(\[]([A-Ea-e])[\)\]]|(?:Option\s+)?([A-Ea-e])[\)\].:\-–])\s+/gi;

    const matches: { index: number; length: number; key: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = markerRegex.exec(text)) !== null) {
      const rawKey = (m[1] || m[2]).toUpperCase();
      if (rawKey) {
        matches.push({
          index: m.index,
          length: m[0].length,
          key: rawKey,
        });
      }
    }

    if (matches.length === 0) {
      const parentKey = String.fromCharCode(65 + optIdx);
      if (!seenKeys.has(parentKey) && unpacked.length < 5) {
        seenKeys.add(parentKey);
        unpacked.push({
          ...opt,
          text: cleanOptionText(opt.text),
        });
      }
    } else {
      const initialText = cleanOptionText(text.substring(0, matches[0].index).trim());
      const parentLetter = String.fromCharCode(65 + optIdx);
      if (!seenKeys.has(parentLetter) && unpacked.length < 5) {
        seenKeys.add(parentLetter);
        unpacked.push({
          id: opt.id || `${questionId}_${parentLetter.toLowerCase()}`,
          text: initialText || cleanOptionText(text),
          codeSnippet: opt.codeSnippet,
        });
      }

      for (let i = 0; i < matches.length; i++) {
        const cur = matches[i];
        const textStart = cur.index + cur.length;
        const textEnd = i + 1 < matches.length ? matches[i + 1].index : text.length;
        const subText = cleanOptionText(text.substring(textStart, textEnd).trim());
        const key = cur.key;
        if (!seenKeys.has(key) && unpacked.length < 5) {
          seenKeys.add(key);
          unpacked.push({
            id: `${questionId}_${key.toLowerCase()}`,
            text: subText,
          });
        }
      }
    }
  });

  return unpacked.length > 0 ? unpacked : options;
}

/**
 * Extract an external answer key table/list if present at the bottom of the document
 * e.g. "Answer Key: 1. A, 2. C, 3. B" or "Answers: 1 - A, 2 - D" or "1: 2" (mapped to B)
 */
function extractAnswerKeyMap(text: string): Map<number, string> {
  const map = new Map<number, string>();

  // Look for sections titled "Answer Key", "Answers", "Answer sheet", "Solutions", etc.
  const keySectionRegex =
    /(?:answer\s*key|answers\s*:|solutions\s*:|correct\s*options|answer\s*sheet)\s*[:\n]([\s\S]*)$/i;
  const match = text.match(keySectionRegex);

  if (match && match[1]) {
    const keyContent = match[1];
    // Match patterns like "1. A", "1) B", "1: C", "1 - D", "Q1: A", "1. (B)", "1. 2"
    const entryRegex =
      /(?:Q(?:uestion)?\.?\s*)?(\d+)[\s.:)\-–]+\(?([A-Fa-f1-5]|i{1,3}|iv)\)?\b/gi;
    let entry: RegExpExecArray | null;
    while ((entry = entryRegex.exec(keyContent)) !== null) {
      const qNum = parseInt(entry[1], 10);
      const ansKey = normalizeOptionKey(entry[2]);
      map.set(qNum, ansKey);
    }
  }

  return map;
}

// Regex to detect the start of a single option at beginning of line:
// (A), [A], A., A), A:, A -, (1), 1), 1., 1:, (i), i., Option A:, Opt A.
const singleOptionStartRegex =
  /^\s*\*?\s*(?:(?:Option|Opt|Choice)\s+)?(?:[\(\[]([A-Fa-f]|[1-5]|i{1,3}|iv|v)[\)\]]|([A-Fa-f]|[1-5]|i{1,3}|iv|v)[\)\].:\-–])\s*\*?\s*(.*)$/i;

// Regex to detect inline answer indicators:
// e.g. "Ans: (A)", "Answer: B", "Correct Option: C", "Ans - 2", "[Ans: A]"
const inlineAnswerRegex =
  /(?:ans(?:wer)?|correct\s*option|key)\s*[:\-–\s]+\(?([A-Fa-f1-5]|i{1,3}|iv)\)?/i;

// Regex to detect explanation indicators:
// e.g. "Explanation: ...", "Solution: ..."
const explanationRegex = /^(?:explanation|solution|rationale|hint)\s*[:\-–\s]+(.*)$/i;

interface InlineOptionMatch {
  key: string;
  text: string;
  isMarkedAsterisk: boolean;
}

interface InlineOptionsParseResult {
  prefixText: string;
  options: InlineOptionMatch[];
}

/**
 * Parse lines containing multiple inline options (e.g. "(A) Apple  (B) Banana  (C) Carrot  (D) Date")
 * or "A. Apple  B. Banana  C. Carrot  D. Date"
 * Returns prefixText (any statement before the first option) and the parsed options.
 */
function parseMultipleInlineOptions(line: string): InlineOptionsParseResult | null {
  const tokenRegex =
    /(?:^|\s{2,}|\t|\s+)(?:\*|\s)*(?:[\(\[]([A-Fa-f]|[1-5]|i{1,3}|iv|v)[\)\]]|(?:Option\s+)?([A-Fa-f]|[1-5]|i{1,3}|iv|v)[\)\].:\-–])(?:\*|\s)*/gi;

  const matches: { index: number; length: number; rawKey: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(line)) !== null) {
    const rawKey = m[1] || m[2];
    if (rawKey) {
      matches.push({
        index: m.index,
        length: m[0].length,
        rawKey,
      });
    }
  }

  if (matches.length < 2) return null;

  const normalizedKeys = matches.map((item) => normalizeOptionKey(item.rawKey));
  const hasValidProgression =
    normalizedKeys.includes('A') && (normalizedKeys.includes('B') || normalizedKeys.includes('C'));

  if (!hasValidProgression && matches.length < 2) return null;

  const prefixText = line.substring(0, matches[0].index).trim();
  const options: InlineOptionMatch[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const textStart = current.index + current.length;
    const textEnd = i + 1 < matches.length ? matches[i + 1].index : line.length;
    const rawText = line.substring(textStart, textEnd).trim();
    const isMarkedAsterisk =
      line.substring(current.index, textStart).includes('*') ||
      rawText.startsWith('*') ||
      rawText.endsWith('*');

    options.push({
      key: normalizeOptionKey(current.rawKey),
      text: cleanOptionText(rawText),
      isMarkedAsterisk,
    });
  }

  return {
    prefixText,
    options,
  };
}

interface PromptRescueResult {
  cleanedPrompt: string;
  options: { key: string; text: string; isMarkedAsterisk?: boolean }[];
  detectedAnswer?: string;
  explanation?: string;
}

/**
 * Rescue options that were inadvertently accumulated into prompt text.
 * Scans the prompt, finds where options begin, extracts structured options,
 * and trims the prompt so the options are NOT displayed as plain text.
 */
function rescueOptionsFromPrompt(fullPrompt: string): PromptRescueResult | null {
  const lines = fullPrompt.split('\n');
  const rescuedOptions: { key: string; text: string; isMarkedAsterisk?: boolean }[] = [];
  const promptLines: string[] = [];
  let foundFirstOption = false;
  let currentKey: string | null = null;
  let currentText = '';
  let currentOptHasAsterisk = false;
  let detectedAnswer: string | undefined = undefined;
  let explanation: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (!foundFirstOption) promptLines.push('');
      continue;
    }

    // 1. Check for inline answer
    const ansMatch = line.match(inlineAnswerRegex);
    if (ansMatch) {
      detectedAnswer = normalizeOptionKey(ansMatch[1]);
      continue;
    }

    // 2. Check for explanation
    const expMatch = line.match(explanationRegex);
    if (expMatch) {
      explanation = expMatch[1].trim();
      continue;
    }

    // 3. Check for multiple inline options on this line
    const multi = parseMultipleInlineOptions(line);
    if (multi && multi.options.length >= 2) {
      if (currentKey) {
        rescuedOptions.push({
          key: currentKey,
          text: cleanOptionText(currentText),
          isMarkedAsterisk: currentOptHasAsterisk,
        });
        currentKey = null;
        currentText = '';
        currentOptHasAsterisk = false;
      }
      if (multi.prefixText) {
        promptLines.push(multi.prefixText);
      }
      foundFirstOption = true;
      for (const opt of multi.options) {
        rescuedOptions.push(opt);
        if (opt.isMarkedAsterisk && !detectedAnswer) {
          detectedAnswer = opt.key;
        }
      }
      continue;
    }

    // 4. Check for single option start
    const singleMatch = line.match(singleOptionStartRegex);
    if (singleMatch) {
      const rawKey = singleMatch[1] || singleMatch[2];
      const optKey = normalizeOptionKey(rawKey);

      if (['A', 'B', 'C', 'D', 'E', 'F'].includes(optKey)) {
        if (currentKey) {
          rescuedOptions.push({
            key: currentKey,
            text: cleanOptionText(currentText),
            isMarkedAsterisk: currentOptHasAsterisk,
          });
        }
        foundFirstOption = true;
        currentKey = optKey;
        currentText = singleMatch[3] || '';
        currentOptHasAsterisk = line.includes('*');
        continue;
      }
    }

    if (foundFirstOption && currentKey) {
      currentText += ' ' + line;
    } else {
      promptLines.push(line);
    }
  }

  if (currentKey) {
    rescuedOptions.push({
      key: currentKey,
      text: cleanOptionText(currentText),
      isMarkedAsterisk: currentOptHasAsterisk,
    });
  }

  if (rescuedOptions.length >= 2) {
    return {
      cleanedPrompt: promptLines.join('\n').trim(),
      options: rescuedOptions,
      detectedAnswer,
      explanation,
    };
  }

  return null;
}

// Section & Passage Boundary Regexes for Pre-Segmentation
const SECTION_HEADER_REGEX =
  /^\s*(?:(?:SECTION|Section)\s*(?:[A-Za-z0-9]+|:\s*[A-Za-z\s&]+)|(?:PART|Part)\s*[A-Za-z0-9]+)(?:[\s—–\-:]+(.*))?$/i;

const SUBJECT_HEADER_REGEX =
  /^\s*(?:Quantitative Aptitude|Reasoning Ability|English Language|General English|Reading Comprehension|Verbal Ability(?: and Reading Comprehension)?|Data Interpretation(?: and Logical Reasoning)?|General Awareness|Current Affairs|General Knowledge|Computer Aptitude|Financial Awareness|Simplification)(?:\s*[\(—–\-].*)?$/i;

const DIRECTIONS_PASSAGE_REGEX =
  /^\s*(?:(?:DIRECTIONS|Directions)\s*(?:for\s+(?:the\s+)?questions?|for\s+Q\.?|\(Q(?:s)?\.?\s*\d+[\s–\-to]+\d+\)|[:\-–])|(?:Passage|PASSAGE)\s*(?:\d+|[:\-–]|\(Q(?:s)?\.?\s*\d+[\s–\-to]+\d+\))?|Read the following (?:passage|information|text|graph|chart|data|table|case)|Study the following (?:information|data|table|graph|chart|passage)|Questions?\s+(?:\d+\s+(?:to|through|–|-)\s+\d+|\d+\s*-\s*\d+)\s+(?:are based on|refer to))\s*(.*)$/i;

const PAGE_FOOTER_REGEX =
  /^\s*(?:--\s*\d+\s+of\s+\d+\s*--|Page\s+\d+(?:\s+of\s+\d+)?|\d+\s+of\s+\d+)\s*$/i;

export interface PreSegmentedBlock {
  type: 'SECTION_HEADER' | 'PASSAGE' | 'QUESTION_BLOCK';
  title?: string;
  passageText?: string;
  lines: string[];
}

/**
 * Pre-segment raw document text into discrete blocks BEFORE individual question parsing.
 * Detects section headers, reading comprehension passages, directions blocks, and neutralizes page footers.
 */
export function preSegmentDocument(rawText: string): PreSegmentedBlock[] {
  const rawLines = rawText.split('\n');
  const blocks: PreSegmentedBlock[] = [];

  let currentBlock: PreSegmentedBlock = {
    type: 'QUESTION_BLOCK',
    lines: [],
  };

  const questionHeaderRegex =
    /^\s*(?:(?:Question|Que|Problem|Q)\.?\s*(\d+)[\s.:)\-–]*|(\d+)[\.:)\-–]+|(\d+)\s+([A-Za-z].*))\s*(.*)$/i;

  let activeSection = '';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    // Ignore page footers/headers: e.g. "-- 1 of 4 --"
    if (PAGE_FOOTER_REGEX.test(line)) {
      continue;
    }

    // 1. Check for Section Header
    const secMatch = line.match(SECTION_HEADER_REGEX);
    const subjMatch = line.match(SUBJECT_HEADER_REGEX);
    if (secMatch || subjMatch) {
      if (currentBlock.lines.length > 0) {
        blocks.push(currentBlock);
      }
      activeSection = line;
      currentBlock = {
        type: 'SECTION_HEADER',
        title: line,
        lines: [line],
      };
      blocks.push(currentBlock);
      currentBlock = {
        type: 'QUESTION_BLOCK',
        title: activeSection,
        lines: [],
      };
      continue;
    }

    // 2. Check for Directions / Passage Header
    const dirMatch = line.match(DIRECTIONS_PASSAGE_REGEX);
    if (dirMatch) {
      if (currentBlock.lines.length > 0) {
        blocks.push(currentBlock);
      }
      const passageLines = [line];
      let j = i + 1;
      while (j < rawLines.length) {
        const nextLine = rawLines[j].trim();
        if (PAGE_FOOTER_REGEX.test(nextLine)) {
          j++;
          continue;
        }
        if (SECTION_HEADER_REGEX.test(nextLine) || SUBJECT_HEADER_REGEX.test(nextLine)) {
          break;
        }
        if (questionHeaderRegex.test(nextLine)) {
          break;
        }
        if (nextLine) {
          passageLines.push(nextLine);
        }
        j++;
      }
      i = j - 1;
      const passageText = passageLines.join('\n');
      blocks.push({
        type: 'PASSAGE',
        title: activeSection,
        passageText,
        lines: passageLines,
      });
      currentBlock = {
        type: 'QUESTION_BLOCK',
        title: activeSection,
        passageText,
        lines: [],
      };
      continue;
    }

    // 3. Regular lines belonging to current question block
    currentBlock.lines.push(line);
  }

  if (currentBlock.lines.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

/**
 * Sanity check on option text:
 * Rejects options whose length exceeds max threshold, contains multiple complete sentences,
 * or contains section/passage keyword markers.
 */
export function sanityCheckOptionText(
  text: string,
  maxLength = 150
): { valid: boolean; reason?: string } {
  const clean = text.trim();
  if (!clean) return { valid: true };

  // 1. Length check: real MCQ options are concise (typically under 150 chars)
  if (clean.length > maxLength) {
    return {
      valid: false,
      reason: `Option text exceeds length limit (${clean.length} > ${maxLength} chars)`,
    };
  }

  // 2. Sentence count check: options rarely have 2+ complete sentences
  const sentenceEndings = clean.match(/[.!?](?:\s+[A-Z]|\s*$)/g);
  if (sentenceEndings && sentenceEndings.length >= 2) {
    return {
      valid: false,
      reason: `Option text contains multiple sentences (${sentenceEndings.length} sentences)`,
    };
  }

  // 3. Section/Passage keywords forbidden in option text
  if (
    /(?:section\s+[a-z]|reading comprehension|directions(?:\s*\(|:)|read the following|study the following|passage\s*[:\d]|questions?\s+\d+\s*[-–to]\s*\d+)/i.test(
      clean
    )
  ) {
    return {
      valid: false,
      reason: `Option text contains section/passage keyword marker`,
    };
  }

  return { valid: true };
}

/**
 * Infer expected option count (4 vs 5) from document option frequency.
 */
export function inferExpectedOptionCount(rawText: string): number {
  const eMatches = rawText.match(/(?:^|\s|\t)(?:[\(\[]E[\)\]]|E[\)\].:\-–])\s+/gi);
  const dMatches = rawText.match(/(?:^|\s|\t)(?:[\(\[]D[\)\]]|D[\)\].:\-–])\s+/gi);
  const eCount = eMatches ? eMatches.length : 0;
  const dCount = dMatches ? dMatches.length : 0;

  if (dCount > 0 && eCount / dCount >= 0.35) {
    return 5;
  }
  return 4;
}

export interface QuestionValidation {
  needsReview: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Run comprehensive validation on an extracted question object.
 */
export function validateExtractedQuestion(
  q: ExtractedQuestion,
  expectedOptionCount = 4,
  maxOptionLength = 150
): QuestionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Option count validation
  if (q.options.length !== expectedOptionCount) {
    errors.push(
      `Option count mismatch: has ${q.options.length} options, expected exactly ${expectedOptionCount}`
    );
  }

  // Option text validation
  for (const opt of q.options) {
    if (opt.text.length > maxOptionLength) {
      errors.push(
        `Option [${opt.key}] length exceeds limit: ${opt.text.length} chars (max ${maxOptionLength})`
      );
    }
    const sanity = sanityCheckOptionText(opt.text, maxOptionLength);
    if (!sanity.valid && sanity.reason) {
      errors.push(`Option [${opt.key}]: ${sanity.reason}`);
    }
    if (opt.text.startsWith('Option ') && opt.text.length < 10) {
      warnings.push(`Option [${opt.key}] has placeholder text: "${opt.text}"`);
    }
  }

  // Prompt validation
  if (!q.prompt || q.prompt.trim().length === 0 || q.prompt === `Question ${q.questionNumber}`) {
    errors.push('Empty or placeholder prompt');
  }

  // Prompt must not contain raw section header delimiters
  if (/(?:^|\n)\s*(?:SECTION|Section)\s+[A-Za-z0-9]+(?:\s*[:—–\-])/i.test(q.prompt)) {
    warnings.push('Prompt contains raw section marker keyword');
  }

  // Correct answer check
  if (!q.correctOptionKey || !q.options.some((o) => o.key === q.correctOptionKey)) {
    errors.push(`Designated correct answer "${q.correctOptionKey}" does not match any valid option`);
  }

  const needsReview = errors.length > 0 || warnings.length > 0;
  return { needsReview, errors, warnings };
}

/**
 * Robust Pre-Segmented Question & Option Parser
 * Accurately extracts questions, options, correct answers, and explanations
 * with zero cross-section/passage leakage and hard option caps.
 */
export function parseQuestionsFromRawText(rawText: string, options?: ParseOptions): ParseResult {
  const text = normalizeText(rawText);
  const answerKeyMap = extractAnswerKeyMap(text);
  const questions: ExtractedQuestion[] = [];
  const warnings: string[] = [];

  // Inferred or user-specified expected option count
  const expectedOptionsCount =
    options?.expectedOptionsCount || inferExpectedOptionCount(text) || 4;
  const maxOptionLength = options?.maxOptionLength || 150;

  // Remove the answer key section from the main text body so it doesn't get parsed as questions
  let bodyText = text;
  const keyHeaderIdx = text.search(
    /\n\s*(?:answer\s*key|answers\s*:|solutions\s*:|correct\s*options|answer\s*sheet)/i
  );
  if (keyHeaderIdx !== -1) {
    bodyText = text.substring(0, keyHeaderIdx);
  }

  // Pre-segment document into isolated blocks
  const blocks = preSegmentDocument(bodyText);

  const questionHeaderRegex =
    /^\s*(?:(?:Question|Que|Problem|Q)\.?\s*(\d+)[\s.:)\-–]*|(\d+)[\.:)\-–]+|(\d+)\s+([A-Za-z].*))\s*(.*)$/i;

  const letterOptionStartRegex =
    /^\s*\*?\s*(?:(?:Option|Opt|Choice)\s+)?(?:[\(\[]([A-Fa-f])[\)\]]|([A-Fa-f])[\)\].:\-–])\s*\*?\s*(.*)$/i;

  const multiInlineRegex =
    /(?:^|\s{2,}|\t|\s+)(?:[\(\[]([A-Fa-f])[\)\]]|([A-Fa-f])[\)\].:\-–])\s+/g;

  let activeSection = '';
  let activePassage = '';

  for (const block of blocks) {
    if (block.type === 'SECTION_HEADER') {
      activeSection = block.title || '';
      activePassage = '';
      continue;
    }
    if (block.type === 'PASSAGE') {
      activePassage = block.passageText || '';
      continue;
    }

    const lines = block.lines;
    let currentQNum: number | null = null;
    let currentPromptLines: string[] = [];
    let currentOptions: { key: string; text: string }[] = [];
    let currentOptKey: string | null = null;
    let currentOptText = '';
    let currentAnswer = '';
    let currentExplanation = '';

    // Check if initial lines of this block are an untagged passage/directions
    const firstQIndex = lines.findIndex((l) => questionHeaderRegex.test(l));
    let blockPassage = activePassage;
    let startIdx = 0;

    if (firstQIndex > 0) {
      const leadingLines = lines.slice(0, firstQIndex);
      const leadingText = leadingLines.join('\n').trim();
      if (leadingText.length > 80 || /reading comprehension|passage|directions/i.test(activeSection)) {
        blockPassage = leadingText;
      }
      startIdx = firstQIndex;
    }

    const commitOption = () => {
      if (currentOptKey) {
        const clean = cleanOptionText(currentOptText.trim());
        const sanity = sanityCheckOptionText(clean, maxOptionLength);
        if (sanity.valid) {
          // Check for horizontal inline sub-options
          const subOptionRegex = /(?:^|\s+)(?:[\(\[]([B-Eb-e])[\)\]]|([B-Eb-e])[\)\].:\-–])\s+/g;
          const subMatches: { index: number; length: number; key: string }[] = [];
          let sm: RegExpExecArray | null;
          while ((sm = subOptionRegex.exec(clean)) !== null) {
            subMatches.push({
              index: sm.index,
              length: sm[0].length,
              key: (sm[1] || sm[2]).toUpperCase(),
            });
          }

          if (subMatches.length > 0) {
            const firstText = cleanOptionText(clean.substring(0, subMatches[0].index).trim());
            currentOptions.push({ key: currentOptKey, text: firstText });
            for (let i = 0; i < subMatches.length; i++) {
              if (currentOptions.length >= expectedOptionsCount) break; // Hard Cap
              const cur = subMatches[i];
              const start = cur.index + cur.length;
              const end = i + 1 < subMatches.length ? subMatches[i + 1].index : clean.length;
              currentOptions.push({ key: cur.key, text: cleanOptionText(clean.substring(start, end).trim()) });
            }
          } else {
            currentOptions.push({ key: currentOptKey, text: clean });
          }
        }
        currentOptKey = null;
        currentOptText = '';
      }
    };

    const commitQuestion = () => {
      commitOption();
      const prompt = currentPromptLines.join('\n').trim();
      // Only commit if we have at least prompt or options
      if ((prompt && currentOptions.length >= 2) || (prompt && !prompt.startsWith('IBPS') && currentOptions.length > 0)) {
        const qNum = currentQNum || (questions.length + 1);
        let ans = answerKeyMap.get(qNum) || currentAnswer;

        // If fewer than 2 options were extracted, attempt prompt rescue
        let finalPrompt = prompt;
        if (currentOptions.length < 2 && finalPrompt) {
          const rescued = rescueOptionsFromPrompt(finalPrompt);
          if (rescued && rescued.options.length >= 2) {
            finalPrompt = rescued.cleanedPrompt;
            currentOptions = rescued.options.slice(0, expectedOptionsCount).map(o => ({ key: o.key, text: o.text }));
            if (rescued.detectedAnswer && !ans) ans = rescued.detectedAnswer;
            if (rescued.explanation && !currentExplanation) currentExplanation = rescued.explanation;
          }
        }

        const cappedOptions = currentOptions.slice(0, expectedOptionsCount);
        if (!ans) {
          ans = cappedOptions[0]?.key || 'A';
        }

        const formattedOptions: ExtractedOption[] = cappedOptions.map((opt) => ({
          id: `opt_${qNum}_${opt.key.toLowerCase()}`,
          key: opt.key,
          text: opt.text || `Option ${opt.key}`,
        }));

        // Run validation pass
        const tempQ: ExtractedQuestion = {
          id: `q_parsed_${qNum}_${Date.now()}_${questions.length}`,
          questionNumber: qNum,
          sectionTitle: activeSection || undefined,
          passageContext: blockPassage || undefined,
          prompt: finalPrompt || `Question ${qNum}`,
          options: formattedOptions,
          correctOptionKey: ans,
          explanation:
            currentExplanation ||
            'Refer to the assessment reference materials for detailed solution rationale.',
          marks: 4,
          negativeMarks: 1,
        };

        const validation = validateExtractedQuestion(tempQ, expectedOptionsCount, maxOptionLength);
        tempQ.needsReview = validation.needsReview;
        tempQ.reviewReasons = validation.needsReview
          ? [...validation.errors, ...validation.warnings]
          : undefined;

        questions.push(tempQ);

        currentQNum = null;
        currentPromptLines = [];
        currentOptions = [];
        currentAnswer = '';
        currentExplanation = '';
      }
    };

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Stop if answer key header
      if (/^(?:answer\s*key|answers\s*:|solutions\s*:)/i.test(line)) {
        commitQuestion();
        break;
      }

      // Check for inline answer / explanation
      const ansMatch = line.match(inlineAnswerRegex);
      if (ansMatch) {
        commitOption();
        currentAnswer = normalizeOptionKey(ansMatch[1]);
        continue;
      }
      const expMatch = line.match(explanationRegex);
      if (expMatch) {
        commitOption();
        currentExplanation = expMatch[1].trim();
        continue;
      }

      // Check question number header
      const qMatch = line.match(questionHeaderRegex);
      if (qMatch) {
        commitQuestion();
        const num = parseInt(qMatch[1] || qMatch[2] || qMatch[3], 10);
        currentQNum = !isNaN(num) ? num : (questions.length + 1);
        let remainder = '';
        if (qMatch[3] && qMatch[4]) {
          remainder = `${qMatch[4]} ${qMatch[5] || ''}`.trim();
        } else {
          remainder = (
            qMatch[5] ||
            line.replace(/^\s*(?:(?:Question|Que|Problem|Q)\.?\s*\d+[\s.:)\-–]*|\d+[\.:)\-–]+)\s*/i, '')
          ).trim();
        }
        if (remainder) currentPromptLines.push(remainder);
        continue;
      }

      // Multi inline options: "A) 10 B) 20 C) 30 D) 40 E) 50"
      const inlineMatches: { key: string; index: number; length: number }[] = [];
      let im: RegExpExecArray | null;
      multiInlineRegex.lastIndex = 0;
      while ((im = multiInlineRegex.exec(line)) !== null) {
        inlineMatches.push({
          key: normalizeOptionKey(im[1] || im[2]),
          index: im.index,
          length: im[0].length,
        });
      }

      if (inlineMatches.length >= 2 && inlineMatches[0].key === 'A') {
        commitOption();
        const prefix = line.substring(0, inlineMatches[0].index).trim();
        if (prefix) currentPromptLines.push(prefix);

        for (let j = 0; j < inlineMatches.length; j++) {
          if (currentOptions.length >= expectedOptionsCount) break; // Hard Cap
          const cur = inlineMatches[j];
          const start = cur.index + cur.length;
          const end = j + 1 < inlineMatches.length ? inlineMatches[j + 1].index : line.length;
          currentOptions.push({ key: cur.key, text: cleanOptionText(line.substring(start, end).trim()) });
        }

        // Hard cap: If options satisfied, commit immediately to prevent subsequent lines bleeding into this question
        if (currentOptions.length >= expectedOptionsCount) {
          commitQuestion();
        }
        continue;
      }

      // Single option: "A) ...", "B) ..."
      const optMatch = line.match(letterOptionStartRegex);
      if (optMatch) {
        const key = normalizeOptionKey(optMatch[1] || optMatch[2]);
        // If question already has this option or has reached cap:
        if (currentOptions.some((o) => o.key === key) || currentOptions.length >= expectedOptionsCount) {
          commitQuestion();
        }

        commitOption();
        currentOptKey = key;
        currentOptText = optMatch[3] ? optMatch[3].trim() : '';
        continue;
      }

      // Regular text line
      if (currentOptKey) {
        const potentialOptionText = currentOptText + ' ' + line;
        const sanity = sanityCheckOptionText(potentialOptionText, maxOptionLength);
        if (!sanity.valid) {
          // Sanity violation: close option & question immediately
          commitQuestion();
          currentPromptLines.push(line);
          continue;
        }
        currentOptText += ' ' + line;
      } else {
        currentPromptLines.push(line);
      }
    }

    commitQuestion();
  }

  let identifiedAnswersCount = 0;
  let flaggedQuestionsCount = 0;

  questions.forEach((q) => {
    if (q.correctOptionKey && q.options.some((o) => o.key === q.correctOptionKey)) {
      identifiedAnswersCount++;
    }
    if (q.needsReview) {
      flaggedQuestionsCount++;
    }
  });

  if (questions.length === 0) {
    warnings.push(
      'Could not detect standard numbered questions (1., 2., Q1.). Review raw text or use AI extraction.'
    );
  }

  return {
    questions,
    rawText: text,
    totalQuestions: questions.length,
    identifiedAnswersCount,
    flaggedQuestionsCount,
    warnings,
  };
}
