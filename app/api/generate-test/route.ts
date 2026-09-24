import Groq from 'groq-sdk';
import {
  ExtractedOption,
  ExtractedQuestion,
  ParseResult,
  normalizeOptionKey,
  cleanOptionText,
} from '@/lib/pdf-parser';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const rawText = body?.rawText;

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

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an expert exam question paper parser. Your task is to extract all multiple-choice questions (MCQs), their answer choices, correct answers, and explanations from the provided raw question paper text.\n\n' +
            'CRITICAL STRUCTURAL RULES:\n' +
            '1. PROMPT PURITY: The "prompt" field must contain ONLY the question statement / problem scenario. NEVER embed or duplicate option choices (e.g. "(A) ... (B) ...") inside the "prompt" text.\n' +
            '2. CLEAN OPTION TEXT: In the "options" array, each option\'s "text" field must contain ONLY the option text itself, WITHOUT the letter prefix. For example: "Paris", NOT "(B) Paris" and NOT "B. Paris".\n' +
            '3. OPTION KEYS: "key" must be standardized uppercase letters: "A", "B", "C", "D" (or "E"). If the document uses numbers (1, 2, 3, 4) or roman numerals (i, ii, iii, iv), automatically map them to A, B, C, D.\n' +
            '4. ANSWER EXTRACTION: Extract the correct option letter ("A", "B", "C", "D") from inline answer markers (e.g. "Ans: B"), bottom answer keys, or solve the question accurately if not explicitly provided.\n' +
            '5. EXPLANATION: Provide or preserve a clear explanation for why the designated option is correct.\n\n' +
            'You must return a JSON object with this exact schema:\n' +
            '{\n' +
            '  "questions": [\n' +
            '    {\n' +
            '      "questionNumber": 1,\n' +
            '      "prompt": "Question statement text only",\n' +
            '      "codeSnippet": "optional code snippet or null",\n' +
            '      "options": [\n' +
            '        { "key": "A", "text": "Option text without prefix" },\n' +
            '        { "key": "B", "text": "Option text without prefix" },\n' +
            '        { "key": "C", "text": "Option text without prefix" },\n' +
            '        { "key": "D", "text": "Option text without prefix" }\n' +
            '      ],\n' +
            '      "correctOptionKey": "A",\n' +
            '      "explanation": "Detailed explanation for why this option is correct."\n' +
            '    }\n' +
            '  ]\n' +
            '}\n\n' +
            'Return ONLY the JSON object.',
        },
        {
          role: 'user',
          content: rawText,
        },
      ],
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return Response.json(
        { error: 'Groq LLM returned an empty response.' },
        { status: 502 }
      );
    }

    let parsed: { questions?: any[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      return Response.json(
        { error: 'Failed to parse JSON response from Groq LLM.' },
        { status: 502 }
      );
    }

    const rawQuestions: any[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const timestamp = Date.now();

    const questions: ExtractedQuestion[] = rawQuestions.map((q, idx) => {
      const qNum = typeof q.questionNumber === 'number' ? q.questionNumber : idx + 1;
      const opts: any[] = Array.isArray(q.options) ? q.options : [];

      const formattedOptions: ExtractedOption[] = opts.map((opt, oIdx) => {
        const key = normalizeOptionKey(opt.key || String.fromCharCode(65 + oIdx));
        const rawText = opt.text || `Option ${key}`;
        const clean = cleanOptionText(rawText);
        return {
          id: `opt_${qNum}_${key.toLowerCase()}`,
          key,
          text: clean || `Option ${key}`,
        };
      });

      // If fewer than standard options were found, ensure at least A, B, C, D exist
      if (formattedOptions.length === 0) {
        ['A', 'B', 'C', 'D'].forEach((k) => {
          formattedOptions.push({
            id: `opt_${qNum}_${k.toLowerCase()}`,
            key: k,
            text: `Option ${k}`,
          });
        });
      }

      let correctKey = normalizeOptionKey((q.correctOptionKey || '').toString());
      if (!formattedOptions.some((o) => o.key === correctKey)) {
        correctKey = formattedOptions[0]?.key || 'A';
      }

      // Ensure prompt doesn't retain accidental inline options at the end
      let promptText = (q.prompt || `Question ${qNum}`).trim();

      return {
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
    });

    const identifiedAnswersCount = questions.filter(
      (q) => q.correctOptionKey && q.options.some((o) => o.key === q.correctOptionKey)
    ).length;

    const result: ParseResult = {
      questions,
      rawText,
      totalQuestions: questions.length,
      identifiedAnswersCount,
      warnings: ['Parsed via Groq LLM fallback (llama-3.1-8b-instant).'],
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
