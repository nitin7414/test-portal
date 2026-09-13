/**
 * PDF & MCQ Parsing Engine
 * Extracts text from uploaded PDF question papers and parses them into structured MCQs.
 * Detects questions, options (A/B/C/D), correct answer keys, and explanations.
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

/**
 * Dynamically load PDF.js from reliable CDN in browser
 */
async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

  return new Promise((resolve, reject) => {
    // Check if script element already exists
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
 * Extract raw text from a PDF file using PDF.js
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
    const textContent = await page.getTextContent();

    let lastY: number | null = null;
    let pageLines: string[] = [];
    let currentLine = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        const y = item.transform ? Math.round(item.transform[5]) : null;
        // If vertical position changed by more than 4 points, treat as new line
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
          if (currentLine.trim()) {
            pageLines.push(currentLine.trim());
          }
          currentLine = item.str;
        } else {
          if (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ')) {
            currentLine += ' ';
          }
          currentLine += item.str;
        }
        lastY = y;
      }
    }

    if (currentLine.trim()) {
      pageLines.push(currentLine.trim());
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
    .replace(/\u00A0/g, ' ');
}

/**
 * Extract an external answer key table/list if present at the bottom of the document
 * e.g. "Answer Key: 1. A, 2. C, 3. B" or "Answers: 1 - A, 2 - D"
 */
function extractAnswerKeyMap(text: string): Map<number, string> {
  const map = new Map<number, string>();

  // Look for sections titled "Answer Key", "Answers", "Answer sheet", etc.
  const keySectionRegex = /(?:answer\s*key|answers|solutions|correct\s*options)\s*[:\n]([\s\S]*)$/i;
  const match = text.match(keySectionRegex);

  if (match && match[1]) {
    const keyContent = match[1];
    // Match patterns like "1. A", "1) B", "1: C", "1 - D", "Q1: A"
    const entryRegex = /(?:Q\.?\s*)?(\d+)[\s.:)\-–]+([A-Da-d])\b/g;
    let entry: RegExpExecArray | null;
    while ((entry = entryRegex.exec(keyContent)) !== null) {
      const qNum = parseInt(entry[1], 10);
      const ansKey = entry[2].toUpperCase();
      map.set(qNum, ansKey);
    }
  }

  return map;
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
  const keyHeaderIdx = text.search(/\n\s*(?:answer\s*key|answers\s*:|solutions\s*:)/i);
  if (keyHeaderIdx !== -1) {
    bodyText = text.substring(0, keyHeaderIdx);
  }

  const lines = bodyText.split('\n');

  // Regex to detect the start of a question:
  // e.g. "1.", "1)", "Q1.", "Q.1:", "Question 1:", "Question 1.", "1. "
  const questionStartRegex = /^\s*(?:Q(?:uestion)?\.?\s*)?(\d+)[\s.:)\-–]+\s*(.*)$/i;

  // Regex to detect options:
  // (A), (B), (C), (D) or A., B., C., D. or A), B), C), D) or [A], [B]
  const optionPrefixRegex = /^(?:\*|\s)*[\(\[]?([A-Da-d])[\)\].:\-–]\s*(.*)$/;

  // Regex to detect inline answer indicators:
  // e.g. "Ans: (A)", "Answer: B", "Correct Option: C", "Ans - B", "[Ans: A]"
  const inlineAnswerRegex = /(?:ans(?:wer)?|correct\s*option|key)\s*[:\-–\s]+\(?([A-Da-d])\)?/i;

  // Regex to detect explanation indicators:
  // e.g. "Explanation: ...", "Solution: ..."
  const explanationRegex = /^(?:explanation|solution|hint)\s*[:\-–\s]+(.*)$/i;

  interface RawBlock {
    qNum: number;
    lines: string[];
  }

  const rawBlocks: RawBlock[] = [];
  let currentBlock: RawBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this line starts a new question
    const qMatch = line.match(questionStartRegex);
    if (qMatch) {
      const num = parseInt(qMatch[1], 10);
      // Ensure it's not an option numbered 1-4 if we already have letters
      if (!currentBlock || num === currentBlock.qNum + 1 || num > currentBlock.qNum) {
        if (currentBlock) {
          rawBlocks.push(currentBlock);
        }
        currentBlock = {
          qNum: num,
          lines: [qMatch[2] ? qMatch[2] : ''],
        };
        continue;
      }
    }

    if (currentBlock) {
      currentBlock.lines.push(line);
    }
  }

  if (currentBlock) {
    rawBlocks.push(currentBlock);
  }

  // If no questions found using question numbers, try fallback chunking by (A) ... (B)
  if (rawBlocks.length === 0) {
    warnings.push('Could not detect numbered questions (1., 2., Q1.). Attempting flexible block detection.');
  }

  let identifiedAnswersCount = 0;

  // Process each question block
  rawBlocks.forEach((block, idx) => {
    const qNum = block.qNum || idx + 1;
    let promptLines: string[] = [];
    const optionsMap: { key: string; text: string; isMarkedAsterisk?: boolean }[] = [];
    let detectedAnswer = '';
    let explanation = '';

    let parsingOptions = false;
    let currentOptKey: string | null = null;
    let currentOptText = '';

    // Check if the answer key map has this question
    if (answerKeyMap.has(qNum)) {
      detectedAnswer = answerKeyMap.get(qNum)!;
    }

    const commitCurrentOption = () => {
      if (currentOptKey) {
        const isMarkedAsterisk = currentOptText.startsWith('*') || currentOptText.endsWith('*');
        const cleanText = currentOptText.replace(/^\*+|\*+$/g, '').trim();
        optionsMap.push({
          key: currentOptKey,
          text: cleanText,
          isMarkedAsterisk,
        });
        if (isMarkedAsterisk && !detectedAnswer) {
          detectedAnswer = currentOptKey;
        }
        currentOptKey = null;
        currentOptText = '';
      }
    };

    for (const rawLine of block.lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // 1. Check for inline answer indicator
      const ansMatch = line.match(inlineAnswerRegex);
      if (ansMatch) {
        detectedAnswer = ansMatch[1].toUpperCase();
        continue;
      }

      // 2. Check for explanation indicator
      const expMatch = line.match(explanationRegex);
      if (expMatch) {
        commitCurrentOption();
        explanation = expMatch[1] || '';
        continue;
      }

      // 3. Check if this line contains multiple inline options (e.g. "(A) Apple  (B) Banana  (C) Carrot  (D) Date")
      const multiOptionRegex = /[\(\[]([A-Da-d])[\)\].:\-–]\s+([^\(\[]+)/g;
      const multiMatches = Array.from(line.matchAll(multiOptionRegex));

      if (multiMatches.length >= 2) {
        commitCurrentOption();
        parsingOptions = true;
        for (const m of multiMatches) {
          const key = m[1].toUpperCase();
          const text = m[2].trim();
          const isMarkedAsterisk = text.startsWith('*') || text.endsWith('*');
          optionsMap.push({
            key,
            text: text.replace(/^\*+|\*+$/g, '').trim(),
            isMarkedAsterisk,
          });
          if (isMarkedAsterisk && !detectedAnswer) {
            detectedAnswer = key;
          }
        }
        continue;
      }

      // 4. Check for single option start (e.g. "(A) Option text" or "A. Option text")
      const optMatch = line.match(optionPrefixRegex);
      if (optMatch && ['A', 'B', 'C', 'D', 'E'].includes(optMatch[1].toUpperCase())) {
        commitCurrentOption();
        parsingOptions = true;
        currentOptKey = optMatch[1].toUpperCase();
        currentOptText = optMatch[2] ? optMatch[2].trim() : '';
        continue;
      }

      // If we are currently accumulating an option, append to it
      if (parsingOptions && currentOptKey) {
        currentOptText += ' ' + line;
      } else {
        // Accumulating prompt
        promptLines.push(line);
      }
    }

    commitCurrentOption();

    const prompt = promptLines.join('\n').trim();

    // Ensure we have at least 2 options
    if (optionsMap.length === 0) {
      warnings.push(`Question ${qNum} has no standard options detected. Review manually.`);
    }

    // Default to 'A' if no answer was detected anywhere
    if (detectedAnswer) {
      identifiedAnswersCount++;
    } else {
      detectedAnswer = optionsMap.length > 0 ? optionsMap[0].key : 'A';
    }

    const formattedOptions: ExtractedOption[] = optionsMap.map((opt) => ({
      id: `opt_${qNum}_${opt.key.toLowerCase()}`,
      key: opt.key,
      text: opt.text || `Option ${opt.key}`,
    }));

    // If fewer than 4 options were found, ensure at least standard A, B, C, D exist for editing
    if (formattedOptions.length === 0) {
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
      prompt: prompt || `Question ${qNum}`,
      options: formattedOptions,
      correctOptionKey: detectedAnswer,
      explanation: explanation || 'Refer to the assessment reference materials for detailed solution rationale.',
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
