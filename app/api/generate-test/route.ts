import Groq from 'groq-sdk';
import {
  ExtractedOption,
  ExtractedQuestion,
  ParseResult,
  normalizeOptionKey,
  cleanOptionText,
  inferExpectedOptionCount,
  validateExtractedQuestion,
  sanityCheckOptionText,
} from '@/lib/pdf-parser';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const rawText = body?.rawText;
    const requestedOptionCount = body?.expectedOptionCount || body?.expectedOptionsCount;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return Response.json(
        { error: 'Invalid request: "rawText" string is required in the request body.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error:
            'GROQ_API_KEY environment variable is not configured. Please add GROQ_API_KEY to your environment variables.',
        },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    // Determine target option count: explicit preference or inferred from text
    const targetOptionCount =
      typeof requestedOptionCount === 'number' && (requestedOptionCount === 4 || requestedOptionCount === 5)
        ? requestedOptionCount
        : inferExpectedOptionCount(rawText) || 4;

    // Smart chunking by question boundaries to prevent context window / completion truncation
    const chunkRawText = (text: string, maxChunkLength = 7000): string[] => {
      if (text.length <= maxChunkLength) return [text];

      const lines = text.split('\n');
      const chunks: string[] = [];
      let currentChunk: string[] = [];
      let currentLength = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isBoundary = /^\s*(?:Q(?:uestion)?\s*\.?\s*\d+|\d+[\.\)])/i.test(line);

        if (isBoundary && currentLength > maxChunkLength * 0.6) {
          chunks.push(currentChunk.join('\n'));
          currentChunk = [line];
          currentLength = line.length + 1;
        } else {
          currentChunk.push(line);
          currentLength += line.length + 1;
          if (currentLength >= maxChunkLength && line.trim() === '') {
            chunks.push(currentChunk.join('\n'));
            currentChunk = [];
            currentLength = 0;
          }
        }
      }

      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
      }

      return chunks;
    };

    const textChunks = chunkRawText(rawText);
    const rawQuestions: any[] = [];

    const expectedKeys = targetOptionCount === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
    const sampleOptionsJson = expectedKeys
      .map((k) => `        { "key": "${k}", "text": "Option text without prefix" }`)
      .join(',\n');

    const systemPrompt =
      'You are an expert exam question paper parser. Your task is to extract all multiple-choice questions (MCQs), their answer choices, correct answers, and explanations from the provided raw question paper text.\n\n' +
      'CRITICAL STRUCTURAL RULES:\n' +
      `1. FIXED-LENGTH OPTIONS ARRAY: Every question MUST return an options array of EXACTLY ${targetOptionCount} items (${expectedKeys.join(', ')}). Never add more or fewer options.\n` +
      '2. SECTION & PASSAGE ISOLATION: If you encounter a passage, section header, directions text, or reading comprehension passage instead of an answer option, STOP and treat it as the start of new content — DO NOT include it as an option, and do not append it to an option.\n' +
      '3. PROMPT PURITY: The "prompt" field must contain ONLY the question statement / problem scenario. NEVER embed or duplicate option choices (e.g. "(A) ... (B) ...") or section banners inside the "prompt" text.\n' +
      '4. CLEAN OPTION TEXT: In the "options" array, each option\'s "text" field must contain ONLY the concise option text itself, WITHOUT the letter prefix, and under 150 characters. For example: "Paris", NOT "(B) Paris" and NOT "B. Paris".\n' +
      `5. OPTION KEYS: "key" must be standardized uppercase letters: ${expectedKeys.map((k) => `"${k}"`).join(', ')}. If the document uses numbers or roman numerals, map them sequentially.\n` +
      `6. ANSWER EXTRACTION: Extract the correct option letter (${expectedKeys.map((k) => `"${k}"`).join(', ')}) from inline answer markers (e.g. "Ans: B"), bottom answer keys, or solve the question accurately if not explicitly provided.\n` +
      '7. EXPLANATION: Provide or preserve a clear explanation for why the designated option is correct.\n\n' +
      'You must return a JSON object with this exact schema:\n' +
      '{\n' +
      '  "questions": [\n' +
      '    {\n' +
      '      "questionNumber": 1,\n' +
      '      "prompt": "Question statement text only",\n' +
      '      "codeSnippet": null,\n' +
      '      "options": [\n' +
      sampleOptionsJson + '\n' +
      '      ],\n' +
      '      "correctOptionKey": "A",\n' +
      '      "explanation": "Detailed explanation for why this option is correct."\n' +
      '    }\n' +
      '  ]\n' +
      '}\n\n' +
      'Return ONLY the JSON object.';

    for (const chunk of textChunks) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: chunk,
            },
          ],
          temperature: 0.1,
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed?.questions)) {
            rawQuestions.push(...parsed.questions);
          }
        }
      } catch (chunkErr) {
        console.error('Error parsing text chunk with Groq:', chunkErr);
      }
    }

    if (rawQuestions.length === 0) {
      return Response.json(
        { error: 'Groq LLM was unable to extract any questions from the document.' },
        { status: 502 }
      );
    }
    const timestamp = Date.now();

    const questions: ExtractedQuestion[] = rawQuestions.map((q, idx) => {
      const qNum = typeof q.questionNumber === 'number' ? q.questionNumber : idx + 1;
      const opts: any[] = Array.isArray(q.options) ? q.options : [];

      const formattedOptions: ExtractedOption[] = [];
      const seenKeys = new Set<string>();

      for (let oIdx = 0; oIdx < opts.length; oIdx++) {
        // Enforce hard option cap
        if (formattedOptions.length >= targetOptionCount) break;

        const opt = opts[oIdx];
        const key = normalizeOptionKey(opt.key || String.fromCharCode(65 + oIdx));
        if (seenKeys.has(key)) continue;

        const rawOptText = opt.text || `Option ${key}`;
        const clean = cleanOptionText(rawOptText);

        // Sanity check option text
        const sanity = sanityCheckOptionText(clean, 150);
        if (!sanity.valid) {
          // If option text contains passage / is invalid, do not silently swallow it as option text
          continue;
        }

        seenKeys.add(key);
        formattedOptions.push({
          id: `opt_${qNum}_${key.toLowerCase()}`,
          key,
          text: clean || `Option ${key}`,
        });
      }

      // If fewer than target options were found, ensure expected keys exist
      if (formattedOptions.length < targetOptionCount) {
        expectedKeys.forEach((k) => {
          if (!seenKeys.has(k) && formattedOptions.length < targetOptionCount) {
            seenKeys.add(k);
            formattedOptions.push({
              id: `opt_${qNum}_${k.toLowerCase()}`,
              key: k,
              text: `Option ${k}`,
            });
          }
        });
      }

      let correctKey = normalizeOptionKey((q.correctOptionKey || '').toString());
      if (!formattedOptions.some((o) => o.key === correctKey)) {
        correctKey = formattedOptions[0]?.key || 'A';
      }

      let promptText = (q.prompt || `Question ${qNum}`).trim();

      const candidateQ: ExtractedQuestion = {
        id: `q_parsed_${qNum}_${timestamp}_${idx}`,
        questionNumber: qNum,
        prompt: promptText,
        codeSnippet: q.codeSnippet?.trim() || undefined,
        options: formattedOptions,
        correctOptionKey: correctKey,
        explanation:
          (q.explanation || '').trim() ||
          'Refer to the assessment reference materials for detailed solution rationale.',
        marks: 4,
        negativeMarks: 1,
      };

      // Run post-generation validation pass
      const validation = validateExtractedQuestion(candidateQ, targetOptionCount, 150);
      candidateQ.needsReview = validation.needsReview;
      candidateQ.reviewReasons = [...validation.errors, ...validation.warnings];

      return candidateQ;
    });

    const identifiedAnswersCount = questions.filter(
      (q) => q.correctOptionKey && q.options.some((o) => o.key === q.correctOptionKey)
    ).length;

    const flaggedQuestionsCount = questions.filter((q) => q.needsReview).length;

    const result: ParseResult = {
      questions,
      rawText,
      totalQuestions: questions.length,
      identifiedAnswersCount,
      flaggedQuestionsCount,
      warnings: [
        'Parsed via Groq LLM (llama-3.1-8b-instant).',
        ...(flaggedQuestionsCount > 0
          ? [`${flaggedQuestionsCount} question(s) flagged for admin review.`]
          : []),
      ],
    };

    return Response.json(result);
  } catch (error: any) {
    console.error('Error in /api/generate-test route:', error);
    return Response.json(
      { error: error?.message || 'Internal server error while processing paper with Groq LLM.' },
      { status: 500 }
    );
  }
}
