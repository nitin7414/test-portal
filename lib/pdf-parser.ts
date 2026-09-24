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
  prompt: string;
  codeSnippet?: string;
  options: ExtractedOption[];
  correctOptionKey: string; // e.g. 'A', 'B', 'C', 'D'
  explanation: string;
  marks: number;
  negativeMarks: number;
}

export interface ParseResult {
  questions: ExtractedQuestion[];
  rawText: string;
  totalQuestions: number;
  identifiedAnswersCount: number;
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

/**
 * Sharpened Question & Option Parser
 * Accurately extracts questions, options, correct answers, and explanations.
 */
export function parseQuestionsFromRawText(rawText: string): ParseResult {
  const text = normalizeText(rawText);
  const answerKeyMap = extractAnswerKeyMap(text);
  const questions: ExtractedQuestion[] = [];
  const warnings: string[] = [];

  // Remove the answer key section from the main text body so it doesn't get parsed as questions
  let bodyText = text;
  const keyHeaderIdx = text.search(
    /\n\s*(?:answer\s*key|answers\s*:|solutions\s*:|correct\s*options|answer\s*sheet)/i
  );
  if (keyHeaderIdx !== -1) {
    bodyText = text.substring(0, keyHeaderIdx);
  }

  const lines = bodyText.split('\n');

  interface IntermediateQ {
    qNum: number;
    prompt: string;
    options: { key: string; text: string; isMarkedAsterisk?: boolean }[];
    answer?: string;
    explanation?: string;
  }

  const intermediateList: IntermediateQ[] = [];

  let currentQNum = 0;
  let currentPromptLines: string[] = [];
  let currentOptions: { key: string; text: string; isMarkedAsterisk?: boolean }[] = [];
  let currentOptKey: string | null = null;
  let currentOptText = '';
  let currentOptHasAsterisk = false;
  let currentAnswer = '';
  let currentExplanation = '';

  const commitOption = () => {
    if (currentOptKey) {
      const clean = cleanOptionText(currentOptText.trim());
      const isMarkedAsterisk =
        currentOptHasAsterisk ||
        currentOptText.startsWith('*') ||
        currentOptText.endsWith('*');

      // Check for inline horizontal sub-options: e.g. "32 B) 36 C) 38 D) 40 E) 42"
      // or "32 (B) 36 (C) 38 (D) 40 (E) 42"
      const subOptionRegex = /(?:^|\s+)(?:[\(\[]([B-Eb-e])[\)\]]|([B-Eb-e])[\)\].:\-–])\s+/g;
      const subMatches: { index: number; length: number; key: string }[] = [];
      let sm: RegExpExecArray | null;
      while ((sm = subOptionRegex.exec(clean)) !== null) {
        const k = (sm[1] || sm[2]).toUpperCase();
        subMatches.push({ index: sm.index, length: sm[0].length, key: k });
      }

      if (subMatches.length > 0) {
        const firstText = cleanOptionText(clean.substring(0, subMatches[0].index).trim());
        currentOptions.push({
          key: currentOptKey,
          text: firstText,
          isMarkedAsterisk,
        });
        for (let i = 0; i < subMatches.length; i++) {
          const cur = subMatches[i];
          const start = cur.index + cur.length;
          const end = i + 1 < subMatches.length ? subMatches[i + 1].index : clean.length;
          const txt = cleanOptionText(clean.substring(start, end).trim());
          currentOptions.push({ key: cur.key, text: txt });
        }
      } else {
        currentOptions.push({
          key: currentOptKey,
          text: clean,
          isMarkedAsterisk,
        });
      }

      if (isMarkedAsterisk && !currentAnswer) {
        currentAnswer = currentOptKey;
      }

      currentOptKey = null;
      currentOptText = '';
      currentOptHasAsterisk = false;
    }
  };

  const commitQuestion = () => {
    commitOption();
    const prompt = currentPromptLines.join('\n').trim();
    if (prompt || currentOptions.length > 0) {
      currentQNum++;
      // Strictly deduplicate options by key and limit to standard choices A-E (max 5)
      const seenKeys = new Set<string>();
      const validOptions: { key: string; text: string; isMarkedAsterisk?: boolean }[] = [];
      for (const opt of currentOptions) {
        if (!seenKeys.has(opt.key) && validOptions.length < 5) {
          seenKeys.add(opt.key);
          validOptions.push(opt);
        }
      }

      // If fewer than 2 options were extracted, attempt prompt rescue for trapped options
      let finalPrompt = prompt;
      if (validOptions.length < 2 && finalPrompt) {
        const rescued = rescueOptionsFromPrompt(finalPrompt);
        if (rescued && rescued.options.length >= 2) {
          finalPrompt = rescued.cleanedPrompt;
          validOptions.length = 0;
          for (const ro of rescued.options) {
            if (!seenKeys.has(ro.key) && validOptions.length < 5) {
              seenKeys.add(ro.key);
              validOptions.push(ro);
            }
          }
          if (rescued.detectedAnswer && !currentAnswer) {
            currentAnswer = rescued.detectedAnswer;
          }
          if (rescued.explanation && !currentExplanation) {
            currentExplanation = rescued.explanation;
          }
        }
      }

      // Check external answer key map
      if (answerKeyMap.has(currentQNum) && !currentAnswer) {
        currentAnswer = answerKeyMap.get(currentQNum)!;
      }

      intermediateList.push({
        qNum: currentQNum,
        prompt: finalPrompt || `Question ${currentQNum}`,
        options: validOptions,
        answer: currentAnswer || (validOptions[0]?.key || 'A'),
        explanation: currentExplanation,
      });

      currentPromptLines = [];
      currentOptions = [];
      currentAnswer = '';
      currentExplanation = '';
    }
  };

  // Question number header: e.g. "1.", "1)", "1:", "1 -", "Question 1:", "Q.1", "Q1:"
  // OR "1 In an array..." (number at start of line followed by space and letter)
  const questionHeaderRegex =
    /^\s*(?:(?:Question|Que|Problem|Q)\.?\s*(\d+)[\s.:)\-–]*|(\d+)[\.:)\-–]+|(\d+)\s+([A-Za-z].*))\s*(.*)$/i;

  // Single option start: (A), A), A., A:, [A], Option A:
  // ONLY letters A-F
  const letterOptionStartRegex =
    /^\s*\*?\s*(?:(?:Option|Opt|Choice)\s+)?(?:[\(\[]([A-Fa-f])[\)\]]|([A-Fa-f])[\)\].:\-–])\s*\*?\s*(.*)$/i;

  // Multi inline option regex: e.g. "(A) 10 (B) 20 (C) 30 (D) 40" or "A) 10 B) 20 C) 30 D) 40"
  const multiInlineRegex =
    /(?:^|\s{2,}|\t|\s+)(?:[\(\[]([A-Fa-f])[\)\]]|([A-Fa-f])[\)\].:\-–])\s+/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. Check for inline answer or explanation
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

    // 2. Check if line starts an explicit question number (1., 2., Q1, 1 Which...)
    const qMatch = line.match(questionHeaderRegex);
    if (qMatch) {
      let remainder = '';
      if (qMatch[3] && qMatch[4]) {
        remainder = `${qMatch[4]} ${qMatch[5] || ''}`.trim();
      } else {
        remainder = (
          qMatch[5] ||
          line.replace(/^\s*(?:(?:Question|Que|Problem|Q)\.?\s*\d+[\s.:)\-–]*|\d+[\.:)\-–]+)\s*/i, '')
        ).trim();
      }

      // If we already have options for the current question (or are in an option), this is a NEW question!
      if (currentOptions.length > 0 || currentOptKey) {
        commitQuestion();
        if (remainder) currentPromptLines.push(remainder);
        continue;
      }

      // If this is the start of a question block
      if (currentPromptLines.length === 0) {
        if (remainder) currentPromptLines.push(remainder);
        continue;
      }
    }

    // 3. Check for multi-options on a single line: "A) 10 B) 20 C) 30 D) 40"
    const inlineMatches: { key: string; index: number; length: number }[] = [];
    let im: RegExpExecArray | null;
    multiInlineRegex.lastIndex = 0;
    while ((im = multiInlineRegex.exec(line)) !== null) {
      const k = normalizeOptionKey(im[1] || im[2]);
      inlineMatches.push({ key: k, index: im.index, length: im[0].length });
    }

    if (inlineMatches.length >= 2 && inlineMatches[0].key === 'A') {
      // If current question already has options, commit previous question first!
      if (currentOptions.length > 0 || currentOptKey) {
        commitQuestion();
      }
      commitOption();

      const prefix = line.substring(0, inlineMatches[0].index).trim();
      if (prefix) {
        currentPromptLines.push(prefix);
      }

      for (let j = 0; j < inlineMatches.length; j++) {
        const cur = inlineMatches[j];
        const start = cur.index + cur.length;
        const end = j + 1 < inlineMatches.length ? inlineMatches[j + 1].index : line.length;
        const txt = cleanOptionText(line.substring(start, end).trim());
        currentOptions.push({ key: cur.key, text: txt });
      }
      continue;
    }

    // 4. Check for single option: "A) ...", "(A) ...", "A. ..."
    const optMatch = line.match(letterOptionStartRegex);
    if (optMatch) {
      const key = normalizeOptionKey(optMatch[1] || optMatch[2]);

      // SHARP QUESTION BOUNDARY ENFORCEMENT:
      // If this question already has this option key (e.g. key is 'A' and we already parsed 'A', 'B', 'C', 'D'),
      // or if we have at least 3 options and 'A' arrives:
      // Then this line CANNOT belong to the current question. It is the start of the NEXT question's options!
      const alreadyHasKey = currentOptions.some((o) => o.key === key) || currentOptKey === key;
      if (alreadyHasKey || (key === 'A' && currentOptions.length >= 2)) {
        commitQuestion();
      }

      commitOption();
      currentOptKey = key;
      currentOptText = optMatch[3] ? optMatch[3].trim() : '';
      currentOptHasAsterisk = line.includes('*');
      continue;
    }

    // 5. Regular text line
    if (currentOptKey) {
      // Check if this line looks like a question prompt that didn't have a question number
      // occurring after options A, B, C, D have already been accumulated.
      // This is the primary fix for PDFs where questions appear without numbered headers.
      const hasSufficientOptions =
        currentOptions.length >= 3 || currentOptKey === 'D' || currentOptKey === 'E';
      const isQuestionStem =
        line.endsWith('?') ||
        line.endsWith(':') ||
        /^(?:what|which|how|why|when|where|who|whom|whose|calculate|find|simplify|solve|evaluate|determine|identify|select|choose|consider|the\b|a\b|an\b|if\b|in\b|for\b|given\b|suppose\b|assume\b|according\b|among\b|between\b)/i.test(
          line
        ) ||
        // Lines that are long enough to be a question and don't look like option continuations
        (line.length > 40 && !line.match(/^\s*[a-d]\s/i));

      if (hasSufficientOptions && isQuestionStem) {
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

  if (intermediateList.length === 0) {
    warnings.push(
      'Could not detect standard numbered questions (1., 2., Q1.). Review raw text or use AI extraction.'
    );
  }

  let identifiedAnswersCount = 0;

  intermediateList.forEach((item, idx) => {
    const qNum = item.qNum || idx + 1;
    if (item.answer) {
      identifiedAnswersCount++;
    }

    const formattedOptions: ExtractedOption[] = item.options.map((opt) => ({
      id: `opt_${qNum}_${opt.key.toLowerCase()}`,
      key: opt.key,
      text: opt.text || `Option ${opt.key}`,
    }));

    if (formattedOptions.length === 0) {
      warnings.push(`Question ${qNum} has no standard options detected. Review manually.`);
      ['A', 'B', 'C', 'D'].forEach((k) => {
        formattedOptions.push({
          id: `opt_${qNum}_${k.toLowerCase()}`,
          key: k,
          text: `Option ${k}`,
        });
      });
    }

    questions.push({
      id: `q_parsed_${qNum}_${Date.now()}_${idx}`,
      questionNumber: qNum,
      prompt: item.prompt || `Question ${qNum}`,
      options: formattedOptions,
      correctOptionKey: item.answer || 'A',
      explanation:
        item.explanation ||
        'Refer to the assessment reference materials for detailed solution rationale.',
      marks: 4,
      negativeMarks: 1,
    });
  });

  return {
    questions,
    rawText: text,
    totalQuestions: questions.length,
    identifiedAnswersCount,
    warnings,
  };
}
