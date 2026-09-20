import Groq from 'groq-sdk';
import { ExtractedOption, ExtractedQuestion, ParseResult } from '@/lib/pdf-parser';

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
            'You must return a JSON object with this exact schema:\n' +
            '{\n' +
            '  "questions": [\n' +
            '    {\n' +
            '      "questionNumber": 1,\n' +
            '      "prompt": "Question statement text",\n' +
            '      "codeSnippet": "optional code snippet or null",\n' +
            '      "options": [\n' +
            '        { "key": "A", "text": "Option text" },\n' +
            '        { "key": "B", "text": "Option text" },\n' +
            '        { "key": "C", "text": "Option text" },\n' +
            '        { "key": "D", "text": "Option text" }\n' +
            '      ],\n' +
            '      "correctOptionKey": "A",\n' +
            '      "explanation": "Detailed explanation for why this option is correct."\n' +
            '    }\n' +
            '  ]\n' +
            '}\n\n' +
            'Rules:\n' +
            '- Extract every question present in the text.\n' +
            '- Each question must have its options extracted with keys (A, B, C, D, etc.).\n' +
            '- "correctOptionKey" must be the uppercase letter matching one of the options.\n' +
            '- Check the text for any answer keys (inline like "Ans: B", or bottom table/list). If no answer key is found, deduce the correct answer accurately.\n' +
            '- Return ONLY the JSON object.',
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
        const key = (opt.key || String.fromCharCode(65 + oIdx)).toUpperCase();
        return {
          id: `opt_${qNum}_${key.toLowerCase()}`,
          key,
          text: (opt.text || `Option ${key}`).trim(),
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

      let correctKey = (q.correctOptionKey || '').toString().trim().toUpperCase();
      if (!formattedOptions.some((o) => o.key === correctKey)) {
        correctKey = formattedOptions[0]?.key || 'A';
      }

      return {
        id: `q_parsed_${qNum}_${timestamp}_${idx}`,
        questionNumber: qNum,
        prompt: (q.prompt || `Question ${qNum}`).trim(),
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
