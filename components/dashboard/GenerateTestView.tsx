'use client';

import React, { useState, useRef } from 'react';
import { UserAccount } from '@/types/auth';
import { TestMetadata, Section, Question } from '@/types/exam';
import { createNewTest } from '@/lib/admin-utils';
import {
  extractTextFromPdfFile,
  parseQuestionsFromRawText,
  unpackQuestionOptions,
  validateExtractedQuestion,
  ExtractedQuestion,
} from '@/lib/pdf-parser';
import {
  UploadIcon,
  FileTextIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  TrashIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  SearchIcon,
  SparklesIcon,
  AwardIcon,
  XIcon,
} from '@/components/ui/Icons';

interface GenerateTestViewProps {
  students: UserAccount[];
  onTestCreated: (test: TestMetadata) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

// Built-in sample question paper for quick testing without needing an external file
const SAMPLE_PAPER_TEXT = `1. Which of the following data structures provides the fastest average-case search time complexity?
(A) Balanced Binary Search Tree
(B) Hash Table with uniform hashing
(C) Singly Linked List
(D) Sorted Dynamic Array
Answer: B
Explanation: A Hash Table with an effective hash function provides O(1) average time complexity for lookups.

2. In the Raft consensus algorithm, what state does a node transition to if its election timer expires without receiving a heartbeat?
(A) Follower
(B) Candidate
(C) Leader
(D) Observer
Answer: B
Explanation: When an election timeout elapses in Raft, a follower transitions to the candidate state, increments its term, and requests votes.

3. What mechanism does the Transmission Control Protocol (TCP) utilize to detect duplicate packet reception and ensure in-order byte delivery?
(A) CRC-32 Checksum
(B) Sequence Numbers and Acknowledgement Numbers
(C) Sliding Window Flow Control
(D) Selective Repeat Timer
Answer: B
Explanation: TCP sequence numbers uniquely identify each byte transmitted, allowing the receiver to reorder out-of-order packets and discard duplicates.

4. Which database isolation level strictly prevents dirty reads, non-repeatable reads, and phantom reads?
(A) Read Committed
(B) Repeatable Read
(C) Serializable
(D) Read Uncommitted
Answer: C
Explanation: The Serializable isolation level ensures that concurrent transactions execute with results equivalent to some serial ordering, preventing all read anomalies.

5. What is the worst-case space complexity of Depth First Search (DFS) on a tree of height h and maximum branching factor b?
(A) O(b^h)
(B) O(b * h)
(C) O(h)
(D) O(b + h)
Answer: C
Explanation: DFS stores only the current path from the root to the leaf node on the call stack, which is bounded by the maximum tree height O(h).`;

export const GenerateTestView: React.FC<GenerateTestViewProps> = ({
  students,
  onTestCreated,
  showToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [rawText, setRawText] = useState('');
  const [showRawTextEditor, setShowRawTextEditor] = useState(false);

  // Expected option count setting (auto, 4, 5)
  const [expectedOptionCount, setExpectedOptionCount] = useState<'auto' | 4 | 5>('auto');

  // Review Queue filter mode: 'all' vs 'needs-review'
  const [filterMode, setFilterMode] = useState<'all' | 'needs-review'>('all');

  // Extracted questions state
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  // Test Configuration fields
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Computer Science');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [marksPerQuestion, setMarksPerQuestion] = useState(4);
  const [negativeMarks, setNegativeMarks] = useState(1);
  const [passPercentage, setPassPercentage] = useState(60);

  // Scheduling fields
  const [scheduledDate, setScheduledDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 2);
    return today.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [status, setStatus] = useState<'upcoming' | 'active'>('upcoming');

  // Audience targeting fields
  const [targetAudience, setTargetAudience] = useState<'all' | 'specific'>('all');
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to revalidate an extracted question against the expected option count and sanity rules
  const revalidateQuestion = (
    q: ExtractedQuestion,
    optPref?: 'auto' | 4 | 5
  ): ExtractedQuestion => {
    const pref = optPref || expectedOptionCount;
    const target = pref === 'auto' ? (q.options.length === 5 ? 5 : 4) : pref;
    const val = validateExtractedQuestion(q, target, 150);
    return {
      ...q,
      needsReview: val.needsReview,
      reviewReasons: [...val.errors, ...val.warnings],
    };
  };

  // Handle PDF file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
      showToast('Please upload a valid .pdf document', 'error');
      return;
    }

    setFile(selected);
    setIsExtracting(true);

    try {
      const extracted = await extractTextFromPdfFile(selected);
      setRawText(extracted);
      const usedFallback = await processExtractedText(
        extracted,
        selected.name.replace(/\.[^/.]+$/, '')
      );
      if (!usedFallback) {
        showToast(`Successfully extracted text from "${selected.name}"`);
      }
    } catch (err: any) {
      console.error('PDF extraction error:', err);
      showToast(err.message || 'Failed to extract text from PDF. You can paste text directly.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // Process raw text into structured questions with pre-segmentation and option caps
  const processExtractedText = async (
    text: string,
    defaultName?: string,
    optCountOverride?: 'auto' | 4 | 5
  ): Promise<boolean> => {
    const activePref = optCountOverride !== undefined ? optCountOverride : expectedOptionCount;
    const countParam = activePref === 'auto' ? undefined : activePref;

    // Primary path: Fast local pre-segmented regex parser
    let res = parseQuestionsFromRawText(text, { expectedOptionsCount: countParam });
    let usedFallback = false;

    // Check if regex extraction was empty or insufficient
    const isInsufficient =
      res.questions.length === 0 ||
      res.questions.some(
        (q) =>
          !q.options ||
          q.options.length < 2 ||
          q.options.every((o) => o.text.startsWith('Option ')) ||
          !q.correctOptionKey ||
          !q.correctOptionKey.trim()
      ) ||
      res.identifiedAnswersCount < res.questions.length;

    // Fallback path: Groq LLM extraction if local parser cannot extract questions
    if (isInsufficient) {
      setIsExtracting(true);
      try {
        const response = await fetch('/api/generate-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: text,
            expectedOptionCount: countParam,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${response.status}`);
        }

        const fallbackResult = await response.json();
        if (fallbackResult.questions && fallbackResult.questions.length > 0) {
          res = fallbackResult;
          usedFallback = true;
          showToast('Parsed questions using Groq LLM fallback');
        } else {
          showToast('LLM fallback was unable to extract questions from the document', 'error');
        }
      } catch (err: any) {
        console.error('Groq LLM extraction fallback failed:', err);
        showToast(
          err.message || 'LLM parsing fallback failed. You can paste or edit questions manually.',
          'error'
        );
      } finally {
        setIsExtracting(false);
      }
    }

    setQuestions(res.questions);
    setParseWarnings(res.warnings);
    setHasParsed(true);

    if (res.flaggedQuestionsCount > 0) {
      setFilterMode('needs-review');
    } else {
      setFilterMode('all');
    }

    // Auto-generate title & code if blank
    if (!title) {
      const cleanName = (defaultName || 'Assessment')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(cleanName);
    }
    if (!code) {
      const randomId = Math.floor(100 + Math.random() * 900);
      setCode(`TEST-${randomId}`);
    }
    if (!description) {
      setDescription(
        `Comprehensive evaluation extracted from uploaded question paper covering ${res.questions.length} questions.`
      );
    }

    return usedFallback;
  };

  // Load sample paper text
  const handleLoadSample = () => {
    setFile(null);
    setRawText(SAMPLE_PAPER_TEXT);
    processExtractedText(SAMPLE_PAPER_TEXT, 'System Architecture & Algorithms Screening');
    showToast('Loaded sample question paper with 5 MCQs and answer key.');
  };

  // Dedicated manual AI parse trigger
  const triggerAiParse = async () => {
    if (!rawText.trim()) {
      showToast('Please upload a PDF or paste text into the raw editor first.', 'error');
      return;
    }
    setIsExtracting(true);
    const countParam = expectedOptionCount === 'auto' ? undefined : expectedOptionCount;
    try {
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, expectedOptionCount: countParam }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${response.status}`);
      }

      const fallbackResult = await response.json();
      if (fallbackResult.questions && fallbackResult.questions.length > 0) {
        setQuestions(fallbackResult.questions);
        setParseWarnings(fallbackResult.warnings || []);
        setHasParsed(true);
        if (fallbackResult.flaggedQuestionsCount > 0) {
          setFilterMode('needs-review');
        }
        showToast(`AI successfully extracted ${fallbackResult.questions.length} questions!`);
      } else {
        showToast('AI parser was unable to detect questions in the text.', 'error');
      }
    } catch (err: any) {
      console.error('Groq LLM extraction failed:', err);
      showToast(err.message || 'AI parsing failed. Please verify GROQ_API_KEY.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // Question editing handlers with instant re-validation
  const handleUpdatePrompt = (qId: string, newPrompt: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? revalidateQuestion({ ...q, prompt: newPrompt }) : q))
    );
  };

  const handleUpdateOption = (qId: string, optIndex: number, newText: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const newOpts = [...q.options];
        newOpts[optIndex] = { ...newOpts[optIndex], text: newText };
        return revalidateQuestion({ ...q, options: newOpts });
      })
    );
  };

  const handleSetCorrectOption = (qId: string, optKey: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? revalidateQuestion({ ...q, correctOptionKey: optKey }) : q
      )
    );
  };

  const handleUpdateExplanation = (qId: string, newExp: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, explanation: newExp } : q))
    );
  };

  const handleDeleteQuestion = (qId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
    showToast('Question removed.');
  };

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1;
    const targetCount = expectedOptionCount === 5 ? 5 : 4;
    const defaultOptions = [
      { id: `opt_${nextNum}_a`, key: 'A', text: 'Option A' },
      { id: `opt_${nextNum}_b`, key: 'B', text: 'Option B' },
      { id: `opt_${nextNum}_c`, key: 'C', text: 'Option C' },
      { id: `opt_${nextNum}_d`, key: 'D', text: 'Option D' },
    ];
    if (targetCount === 5) {
      defaultOptions.push({ id: `opt_${nextNum}_e`, key: 'E', text: 'Option E' });
    }

    const newQ: ExtractedQuestion = {
      id: `q_manual_${Date.now()}`,
      questionNumber: nextNum,
      prompt: `New Question ${nextNum}`,
      options: defaultOptions,
      correctOptionKey: 'A',
      explanation: 'Explanation for correct response.',
      marks: marksPerQuestion,
      negativeMarks: negativeMarks,
    };
    setQuestions((prev) => [...prev, revalidateQuestion(newQ)]);
  };

  // Student selection handlers
  const toggleStudent = (stuId: string) => {
    setAssignedStudentIds((prev) =>
      prev.includes(stuId) ? prev.filter((id) => id !== stuId) : [...prev, stuId]
    );
  };

  const handleSelectAllStudents = () => {
    setAssignedStudentIds(students.map((s) => s.id));
  };

  const handleClearAllStudents = () => {
    setAssignedStudentIds([]);
  };

  // Final submission handler ("Upload Paper") with strict validation gating
  const handleUploadPaper = () => {
    if (!title.trim()) {
      showToast('Please provide a test title', 'error');
      return;
    }
    if (!code.trim()) {
      showToast('Please provide a test code', 'error');
      return;
    }
    if (questions.length === 0) {
      showToast('At least one question is required to upload the test', 'error');
      return;
    }
    if (targetAudience === 'specific' && assignedStudentIds.length === 0) {
      showToast('Please select at least one student when specific visibility is selected', 'error');
      return;
    }

    // GATING PASS: Reject publishing if any question has critical validation errors
    const targetOptCount = expectedOptionCount === 'auto' ? undefined : expectedOptionCount;
    const unresolvedQuestions = questions.filter((q) => {
      const v = validateExtractedQuestion(q, targetOptCount || q.options.length, 150);
      return v.needsReview && v.errors.length > 0;
    });

    if (unresolvedQuestions.length > 0) {
      showToast(
        `${unresolvedQuestions.length} question(s) have unresolved errors (option count mismatch or invalid text). Please fix them in the review queue before publishing.`,
        'error'
      );
      setFilterMode('needs-review');
      return;
    }

    setIsSubmitting(true);

    const testId = `test_gen_${Date.now()}`;
    const totalMarks = questions.length * marksPerQuestion;
    const passMarks = Math.round((totalMarks * passPercentage) / 100);

    // Convert parsed questions to formal Question models
    const formalQuestions: Question[] = questions.map((q, idx) => {
      const qId = `q_${testId}_${idx + 1}`;
      const baseOptions = q.options.map((opt) => ({
        id: opt.id,
        text: opt.text.trim(),
      }));
      const unpackedOptions = unpackQuestionOptions(baseOptions, qId);

      // Find the correct option ID from the POST-unpack array to avoid stale IDs.
      const correctKeyLower = (q.correctOptionKey || 'A').toLowerCase();
      let correctOptionId = unpackedOptions.find(
        (opt) => opt.id.endsWith(`_${correctKeyLower}`)
      )?.id;

      if (!correctOptionId) {
        const matchedOpt = q.options.find((opt) => opt.key === q.correctOptionKey);
        if (matchedOpt && unpackedOptions.some((u) => u.id === matchedOpt.id)) {
          correctOptionId = matchedOpt.id;
        }
      }

      if (!correctOptionId) {
        const keyIndex = (q.correctOptionKey || 'A').charCodeAt(0) - 65;
        correctOptionId = unpackedOptions[keyIndex]?.id || unpackedOptions[0]?.id || 'opt_a';
      }

      // If question has an associated reading comprehension passage, prepend it cleanly or store it
      const promptWithPassage = q.passageContext
        ? `[Passage Context: ${q.passageContext.slice(0, 160)}...]\n\n${q.prompt}`
        : q.prompt;

      return {
        id: qId,
        sectionId: 'sec_main',
        type: 'single-choice',
        prompt: promptWithPassage,
        codeSnippet: q.codeSnippet,
        options: unpackedOptions,
        marks: marksPerQuestion,
        negativeMarks: negativeMarks,
        correctOptionIds: [correctOptionId],
        explanation: q.explanation,
      };
    });

    // Final integrity check
    const validQuestions: Question[] = [];
    const rejectedWarnings: string[] = [];
    for (const q of formalQuestions) {
      const issues: string[] = [];
      if (!q.prompt || (q.prompt.startsWith('Question ') && q.prompt.match(/^Question \d+$/))) {
        issues.push('empty prompt');
      }
      if (!q.options || q.options.length < 2) {
        issues.push('fewer than 2 options');
      }
      if (q.options && q.options.length >= 2 && q.options.every((o) => o.text.startsWith('Option '))) {
        issues.push('all placeholder options');
      }
      if (q.correctOptionIds.length === 0 || !q.options?.some((o) => q.correctOptionIds.includes(o.id))) {
        issues.push('correct answer not in options');
      }
      if (issues.length > 0) {
        rejectedWarnings.push(`Q${validQuestions.length + 1}: ${issues.join(', ')}`);
      } else {
        validQuestions.push(q);
      }
    }

    if (rejectedWarnings.length > 0) {
      showToast(
        `${rejectedWarnings.length} malformed question(s) excluded: ${rejectedWarnings.slice(0, 3).join('; ')}${rejectedWarnings.length > 3 ? '...' : ''}`,
        'error'
      );
    }

    if (validQuestions.length === 0) {
      showToast('No valid questions to upload after validation. Please review the parsed questions.', 'error');
      setIsSubmitting(false);
      return;
    }

    const mainSection: Section = {
      id: 'sec_main',
      title: 'Section 1: General Assessment',
      questions: validQuestions,
    };

    const newTest: TestMetadata = {
      id: testId,
      title: title.trim(),
      code: code.trim().toUpperCase(),
      category: category.trim(),
      description: description.trim() || `Assessment with ${validQuestions.length} questions.`,
      durationMinutes: durationMinutes,
      totalMarks: validQuestions.length * marksPerQuestion,
      passMarks: Math.round((validQuestions.length * marksPerQuestion * passPercentage) / 100),
      totalQuestions: validQuestions.length,
      instructions: [
        `This test consists of ${validQuestions.length} multiple-choice questions.`,
        `Each correct response awards +${marksPerQuestion} marks.`,
        `Each incorrect response incurs a penalty of -${negativeMarks} mark(s).`,
        'Ensure an uninterrupted network connection during the scheduled exam window.',
      ],
      sections: [mainSection],
      createdAt: new Date().toISOString(),
      status: status,
      scheduledDate: scheduledDate || undefined,
      scheduledTime: scheduledTime || undefined,
      targetAudience: targetAudience,
      assignedStudentIds: targetAudience === 'specific' ? assignedStudentIds : undefined,
    };

    // Persist into localStorage
    createNewTest(newTest);
    setIsSubmitting(false);

    showToast(`Test "${newTest.title}" published successfully! Showcase live on student portal.`);
    onTestCreated(newTest);
  };

  const filteredStudents = students.filter((stu) => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      stu.name.toLowerCase().includes(q) ||
      stu.email.toLowerCase().includes(q) ||
      (stu.studentId && stu.studentId.toLowerCase().includes(q)) ||
      (stu.batch && stu.batch.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 pb-36 lg:pb-12 space-y-5 sm:space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-800 pb-5 sm:pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <UploadIcon size={12} />
              PDF Question Paper Parser
            </span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">Generate New Test</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Upload a PDF question paper to automatically extract MCQs, options, and answers, then schedule and showcase the test on the student portal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer shrink-0 w-full sm:w-auto active:scale-95"
        >
          <SparklesIcon size={14} className="text-amber-400" />
          Load Sample Paper
        </button>
      </div>

      {/* STEP 1: PDF DROPZONE & UPLOADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileTextIcon size={15} className="text-indigo-400" />
            1. Upload PDF Question Paper
          </label>
          {file && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircleIcon size={14} /> File loaded ({file.name})
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/40 hover:bg-indigo-950/10 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group"
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-800 group-hover:bg-indigo-600/20 text-indigo-400 flex items-center justify-center transition-colors">
              {isExtracting ? (
                <div className="h-6 w-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadIcon size={28} />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {isExtracting
                  ? 'Extracting text from PDF pages...'
                  : file
                  ? `Selected: ${file.name}`
                  : 'Click or drag PDF question paper here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Standard format: Question statements, options (A, B, C, D), and answer keys (e.g. "Ans: B" or end answer table)
              </p>
            </div>
          </div>
        </div>

        {/* Expected Options Setting (Hard Cap & Target Count) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Expected Options per Question:</span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Enforces option cap & cross-section boundary protection)
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setExpectedOptionCount('auto');
                if (rawText) processExtractedText(rawText, undefined, 'auto');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                expectedOptionCount === 'auto'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Auto-Detect
            </button>
            <button
              type="button"
              onClick={() => {
                setExpectedOptionCount(4);
                if (rawText) processExtractedText(rawText, undefined, 4);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                expectedOptionCount === 4
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              4 Options (A–D)
            </button>
            <button
              type="button"
              onClick={() => {
                setExpectedOptionCount(5);
                if (rawText) processExtractedText(rawText, undefined, 5);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                expectedOptionCount === 5
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              5 Options (A–E)
            </button>
          </div>
        </div>

        {/* Toggle Manual Text Review */}
        <div className="flex items-center justify-between pt-2 text-xs">
          <button
            type="button"
            onClick={() => setShowRawTextEditor((prev) => !prev)}
            className="text-slate-400 hover:text-indigo-400 font-semibold underline underline-offset-4 cursor-pointer"
          >
            {showRawTextEditor ? 'Hide raw text' : 'View / paste raw question paper text'}
          </button>
          {questions.length > 0 && (
            <span className="text-slate-400">
              Extracted <strong className="text-white">{questions.length}</strong> questions
            </span>
          )}
        </div>

        {showRawTextEditor && (
          <div className="space-y-3 pt-3 border-t border-slate-800 animate-fade-in">
            <label className="text-xs font-semibold text-slate-400 block">
              Raw Extracted Text (editable):
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste question paper text here if you prefer manual input..."
              className="w-full bg-slate-950 font-mono text-xs text-slate-300 p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isExtracting}
                onClick={() => processExtractedText(rawText, 'Custom Question Paper')}
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                {isExtracting && (
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isExtracting ? 'Parsing...' : 'Reparse (Fast Regex)'}
              </button>

              <button
                type="button"
                disabled={isExtracting}
                onClick={triggerAiParse}
                className="text-xs font-bold text-amber-200 bg-amber-950/70 hover:bg-amber-900 border border-amber-800 disabled:opacity-50 px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <SparklesIcon size={13} className="text-amber-400" />
                <span>AI Smart Parse (Groq LLM)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: TEST METADATA & SCHEDULE CONFIGURATION */}
      {hasParsed && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <CalendarIcon size={15} className="text-indigo-400" />
            2. Assessment Details & Scheduling
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Assessment Title:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Systems Final"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Test Code:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SYS-DIST-501"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Category:</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Duration (Mins):</label>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Marks Per Question:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={marksPerQuestion}
                onChange={(e) => setMarksPerQuestion(Number(e.target.value) || 4)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Negative Mark Penalty:</label>
              <input
                type="number"
                min={0}
                max={10}
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(Number(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Passing Score (%):</label>
              <input
                type="number"
                min={10}
                max={100}
                value={passPercentage}
                onChange={(e) => setPassPercentage(Number(e.target.value) || 60)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* SCHEDULE DAY & TIME */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Particular Day / Date:</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Particular Time for That Day:</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Initial Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'upcoming' | 'active')}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="upcoming">Upcoming (Scheduled for Date & Time)</option>
                <option value="active">Active (Live immediately)</option>
              </select>
            </div>
          </div>

          {/* STUDENT VISIBILITY SELECTION */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <UsersIcon size={14} className="text-indigo-400" />
              Student Portal Visibility
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetAudience('all')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  targetAudience === 'all'
                    ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">All Students</span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      targetAudience === 'all' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                    }`}
                  >
                    {targetAudience === 'all' && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Every enrolled candidate sees this test in "Browse Assessments".
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience('specific')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  targetAudience === 'specific'
                    ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Specific Students Only</span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      targetAudience === 'specific' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                    }`}
                  >
                    {targetAudience === 'specific' && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Only assigned students will see this assessment on their portal.
                </p>
              </button>
            </div>

            {/* Roster Picker if 'specific' */}
            {targetAudience === 'specific' && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectAllStudents}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllStudents}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-300 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-800 rounded-2xl p-2 bg-slate-950/40">
                  {filteredStudents.map((stu) => {
                    const isChecked = assignedStudentIds.includes(stu.id);
                    return (
                      <div
                        key={stu.id}
                        onClick={() => toggleStudent(stu.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-indigo-950/40 border-indigo-700/60 text-white'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded text-indigo-600 bg-slate-800 border-slate-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold">{stu.name}</span>
                          {stu.studentId && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              {stu.studentId}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isChecked ? 'Assigned' : 'Excluded'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: INTERACTIVE QUESTIONS REVIEW & REVIEW QUEUE */}
      {hasParsed && (() => {
        const flaggedQuestions = questions.filter((q) => q.needsReview);
        const flaggedCount = flaggedQuestions.length;
        const displayedQuestions =
          filterMode === 'needs-review' ? flaggedQuestions : questions;

        return (
          <div className="space-y-4">
            {/* Header & Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircleIcon size={16} className="text-emerald-400" />
                  Review & Edit Extracted Questions ({questions.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify each question prompt, options, and designated correct answer before publishing.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 cursor-pointer transition-all self-start sm:self-auto"
              >
                <PlusIcon size={13} />
                Add Question
              </button>
            </div>

            {/* NEEDS REVIEW QUEUE BANNER */}
            {flaggedCount > 0 && (
              <div className="bg-amber-950/30 border border-amber-600/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangleIcon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-200">
                      Review Queue: {flaggedCount} Question{flaggedCount > 1 ? 's' : ''} Require Verification
                    </h4>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      Validation detected questions with abnormal option counts, excessive text length, or potential section boundary conflicts. Please review and resolve them before publishing.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterMode(filterMode === 'needs-review' ? 'all' : 'needs-review')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  {filterMode === 'needs-review' ? 'View All Questions' : `Show Needs Review (${flaggedCount})`}
                </button>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Questions ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('needs-review')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'needs-review'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Needs Review</span>
                {flaggedCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {flaggedCount}
                  </span>
                )}
              </button>
            </div>

            {parseWarnings.length > 0 && (
              <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-2xl text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-200">
                  <AlertTriangleIcon size={14} /> Parser Notices:
                </div>
                {parseWarnings.map((w, idx) => (
                  <p key={idx}>• {w}</p>
                ))}
              </div>
            )}

            {/* Question Cards List */}
            <div className="space-y-4">
              {displayedQuestions.length === 0 ? (
                <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-xs">
                  No questions match the current filter.
                </div>
              ) : (
                displayedQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`bg-slate-900 rounded-3xl p-5 sm:p-6 space-y-4 transition-colors border ${
                      q.needsReview
                        ? 'border-amber-600/50 shadow-md shadow-amber-950/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Question Top Bar */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs font-black bg-indigo-600 text-white px-2.5 py-1 rounded-lg">
                          Q{q.questionNumber}
                        </span>

                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircleIcon size={12} />
                          Correct: Option {q.correctOptionKey}
                        </span>

                        {q.sectionTitle && (
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-md">
                            {q.sectionTitle}
                          </span>
                        )}

                        {q.needsReview && (
                          <span className="text-[11px] font-black text-amber-300 bg-amber-950/60 border border-amber-700/60 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                            <AlertTriangleIcon size={12} /> Needs Review
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete this question"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>

                    {/* Review Warnings Box */}
                    {q.needsReview && q.reviewReasons && q.reviewReasons.length > 0 && (
                      <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300 space-y-1">
                        <span className="font-bold text-amber-200">Validation flags:</span>
                        {q.reviewReasons.map((r, rIdx) => (
                          <p key={rIdx} className="text-[11px] text-amber-300/90">• {r}</p>
                        ))}
                      </div>
                    )}

                    {/* Associated Reading Passage Box (if any) */}
                    {q.passageContext && (
                      <div className="p-3.5 bg-indigo-950/20 border border-indigo-800/40 rounded-2xl text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                          <FileTextIcon size={13} />
                          <span>Associated Passage / Directions:</span>
                          {q.sectionTitle && (
                            <span className="text-[10px] font-medium text-slate-400">({q.sectionTitle})</span>
                          )}
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed italic line-clamp-4 hover:line-clamp-none transition-all">
                          {q.passageContext}
                        </p>
                      </div>
                    )}

                    {/* Prompt Textarea */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Question Statement:
                      </label>
                      <textarea
                        rows={2}
                        value={q.prompt}
                        onChange={(e) => handleUpdatePrompt(q.id, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium leading-relaxed"
                      />
                    </div>

                    {/* Options List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-400">
                          Options (Click the radio to set Correct Answer):
                        </label>
                        <span className="text-[10px] text-slate-500">
                          Green indicates student results key
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOptionKey === opt.key;
                          const isLengthy = opt.text.length > 150;
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-950/30 border-emerald-600/70'
                                  : isLengthy
                                  ? 'bg-rose-950/20 border-rose-700/60'
                                  : 'bg-slate-800/70 border-slate-700/80 hover:border-slate-600'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSetCorrectOption(q.id, opt.key)}
                                className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer font-bold text-xs ${
                                  isCorrect
                                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-xs'
                                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                                }`}
                                title={`Mark Option ${opt.key} as correct answer`}
                              >
                                {opt.key}
                              </button>

                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                                className="flex-1 bg-transparent text-xs text-white focus:outline-none placeholder-slate-500"
                                placeholder={`Option ${opt.key} text...`}
                              />

                              {isCorrect && (
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider shrink-0 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                  ✓ Key
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Explanation / Solution Rationale (shown on results dashboard):
                      </label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => handleUpdateExplanation(q.id, e.target.value)}
                        placeholder="Provide solution breakdown..."
                        className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* STEP 4: UPLOAD PAPER BUTTON */}
            <div className="sticky bottom-20 lg:bottom-6 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-white">Ready to Publish Test?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total {questions.length} questions • Scheduled for{' '}
                  <span className="text-white font-bold">{scheduledDate || 'TBD'}</span> at{' '}
                  <span className="text-white font-bold">{scheduledTime || 'TBD'}</span>
                </p>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleUploadPaper}
                className="flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm px-5 sm:px-7 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto text-center"
              >
                <UploadIcon size={18} />
                <span>{isSubmitting ? 'Uploading Paper...' : 'Upload Paper & Showcase on Student Portal'}</span>
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
