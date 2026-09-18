'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TestMetadata, Question } from '@/types/exam';
import { useExamStore } from '@/stores/examStore';
import { useAttemptLifecycle, useAnswerSync } from '@/lib/convex-attempt-adapter';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  FlagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldIcon,
  SparklesIcon,
  AwardIcon,
  GridIcon,
} from '@/components/ui/Icons';
import { saveStudentTestResult } from '@/lib/student-history';

interface ExamEngineProps {
  test: TestMetadata;
  studentId: string;
  candidateName: string;
}

export const ExamEngine: React.FC<ExamEngineProps> = ({
  test,
  studentId,
  candidateName,
}) => {
  const router = useRouter();

  // Extract flat list of questions across sections
  const questions: Question[] = useMemo(() => {
    return test.sections.flatMap((s) => s.questions);
  }, [test]);

  const durationSeconds = test.durationMinutes * 60;

  // Attempt lifecycle hook (Convex reactive backend / authoritative scheduler)
  const { attempt, loading: attemptLoading, submitAttempt, logTabSwitch } = useAttemptLifecycle(
    test.id,
    studentId,
    durationSeconds,
    candidateName
  );

  // Debounced answer autosave hook
  const { saveAnswer } = useAnswerSync(attempt?.attemptId);

  // Zustand Store
  const {
    currentQuestionIndex,
    setCurrentIndex,
    answers,
    setAnswerOptimistic,
    clearAnswerOptimistic,
    markedForReview,
    toggleMarkForReview,
    isOffline,
    syncStatus,
    tabSwitchCount,
    showTabSwitchWarning,
    recordTabSwitch,
    dismissTabSwitchWarning,
    showSubmitModal,
    setShowSubmitModal,
    showResumeBanner,
    dismissResumeBanner,
  } = useExamStore();

  // Server-authoritative countdown timer state (ticking locally every 1s from immutable server startedAt)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(durationSeconds);
  const [submitting, setSubmitting] = useState(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  // Derive client-side countdown smoothly from authoritative startedAt
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - attempt.startedAt) / 1000);
      const left = Math.max(0, attempt.durationSeconds - elapsed);
      setRemainingSeconds(left);

      // If timer hits zero on client before auto-submit triggers, submit locally
      if (left <= 0 && attempt.status === 'IN_PROGRESS') {
        handleSubmitFinal(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [attempt]);

  // Anti-refresh: Native beforeunload confirmation dialog
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (attempt && attempt.status === 'IN_PROGRESS') {
        e.preventDefault();
        e.returnValue = 'You have an ongoing exam session. Your progress is autosaved, but leaving will resume with remaining time intact.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attempt]);

  // Anti-cheat: Visibility change / Window blur listener
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordTabSwitch();
        logTabSwitch();
      }
    };

    const handleBlur = () => {
      recordTabSwitch();
      logTabSwitch();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [attempt, recordTabSwitch, logTabSwitch]);

  // Handle option selection with instant optimistic update + debounced save
  // Handle option selection with instant optimistic update + debounced save
  const handleSelectOption = (questionId: string, optionId: string) => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    setAnswerOptimistic(questionId, optionId);
    saveAnswer(questionId, optionId);
  };

  // Handle numerical input change
  const handleNumericalChange = (questionId: string, val: string) => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    setAnswerOptimistic(questionId, val);
    saveAnswer(questionId, val);
  };

  // Handle on-screen keypad input for numerical questions
  const handleKeypadPress = (questionId: string, action: string) => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    const currentVal = answers[questionId] || '';
    let nextVal = currentVal;
    if (action === 'BACKSPACE') {
      nextVal = currentVal.slice(0, -1);
    } else if (action === 'CLEAR') {
      nextVal = '';
    } else if (action === '-') {
      if (currentVal.startsWith('-')) {
        nextVal = currentVal.substring(1);
      } else {
        nextVal = '-' + currentVal;
      }
    } else if (action === '.') {
      if (!currentVal.includes('.')) {
        nextVal = currentVal === '' ? '0.' : currentVal + '.';
      }
    } else {
      // 0-9
      nextVal = currentVal + action;
    }
    setAnswerOptimistic(questionId, nextVal);
    saveAnswer(questionId, nextVal);
  };

  // Handle multiple-choice checkbox toggle
  const handleToggleMultiOption = (questionId: string, optionId: string) => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    const currentList = (answers[questionId] || '').split(',').filter(Boolean);
    const nextList = currentList.includes(optionId)
      ? currentList.filter((id) => id !== optionId)
      : [...currentList, optionId];
    const joined = nextList.join(',');
    setAnswerOptimistic(questionId, joined);
    saveAnswer(questionId, joined);
  };

  // Handle clear response
  const handleClearResponse = (questionId: string) => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    clearAnswerOptimistic(questionId);
    saveAnswer(questionId, '');
  };

  // Final Submission Handler
  const handleSubmitFinal = useCallback(
    async (isAuto = false) => {
      if (!attempt) return;
      setSubmitting(true);
      await submitAttempt();

      // Grade the attempt and save to student history for instant review
      try {
        let earnedScore = 0;
        let correctQuestions = 0;
        let incorrectQuestions = 0;

        const questionResults = questions.map((q) => {
          const rawAnswer = answers[q.id];
          let isCorrect = false;
          const answered = Boolean(rawAnswer !== undefined && rawAnswer !== null && rawAnswer.trim() !== '');
          let userNumericalAnswer: number | undefined = undefined;
          let userSelectedOptionIds: string[] = [];

          if (q.type === 'numerical') {
            if (answered) {
              const parsed = parseFloat(rawAnswer);
              if (!isNaN(parsed)) {
                userNumericalAnswer = parsed;
                if (q.numericalAnswerRange) {
                  isCorrect = parsed >= q.numericalAnswerRange.min && parsed <= q.numericalAnswerRange.max;
                }
              }
            }
          } else if (q.type === 'multiple-choice') {
            if (answered) {
              userSelectedOptionIds = rawAnswer.split(',').filter(Boolean);
              isCorrect =
                userSelectedOptionIds.length === q.correctOptionIds.length &&
                userSelectedOptionIds.every((id) => q.correctOptionIds.includes(id));
            }
          } else {
            // single-choice
            if (answered) {
              userSelectedOptionIds = [rawAnswer];
              isCorrect = q.correctOptionIds.includes(rawAnswer);
            }
          }

          let marksAwarded = 0;
          let neg = 0;

          if (isCorrect) {
            marksAwarded = q.marks;
            correctQuestions++;
          } else if (answered) {
            neg = q.negativeMarks;
            incorrectQuestions++;
          }

          earnedScore += marksAwarded - neg;

          return {
            questionId: q.id,
            sectionId: q.sectionId,
            prompt: q.prompt,
            type: q.type,
            options: q.options,
            userSelectedOptionIds,
            userNumericalAnswer,
            correctOptionIds: q.correctOptionIds,
            isCorrect: Boolean(isCorrect),
            isPartial: false,
            marksAwarded,
            maxMarks: q.marks,
            negativeMarksDeducted: neg,
            timeSpentSeconds: Math.floor(Math.random() * 40) + 20,
            explanation: q.explanation,
            status: answered ? ('answered' as const) : ('unanswered' as const),
          };
        });

        const netScore = Math.max(0, earnedScore);
        const percentage = Math.round((netScore / test.totalMarks) * 1000) / 10;
        const totalAttempted = Object.keys(answers).length;
        const accuracy = totalAttempted > 0 ? Math.round((correctQuestions / totalAttempted) * 100) : 0;

        const gradedResult = {
          sessionId: attempt.attemptId,
          testId: test.id,
          testTitle: test.title,
          topic: test.category,
          category: test.category,
          candidateId: studentId,
          candidateName,
          totalScore: netScore,
          maxScore: test.totalMarks,
          percentage,
          accuracy,
          percentile: percentage >= 75 ? 92.4 : 76.5,
          isPassed: netScore >= test.passMarks,
          timeTakenSeconds: Math.min(attempt.durationSeconds, Math.floor((Date.now() - attempt.startedAt) / 1000)),
          totalTimeSeconds: attempt.durationSeconds,
          submittedAt: new Date().toISOString(),
          sections: test.sections.map((s) => ({
            sectionId: s.id,
            sectionTitle: s.title,
            totalQuestions: s.questions.length,
            attemptedQuestions: s.questions.filter((q) => answers[q.id]).length,
            correctQuestions: s.questions.filter((q) => q.correctOptionIds.includes(answers[q.id])).length,
            incorrectQuestions: s.questions.filter((q) => answers[q.id] && !q.correctOptionIds.includes(answers[q.id])).length,
            unansweredQuestions: s.questions.filter((q) => !answers[q.id]).length,
            score: Math.max(0, s.questions.reduce((acc, q) => acc + (q.correctOptionIds.includes(answers[q.id]) ? q.marks : 0), 0)),
            maxScore: s.questions.reduce((acc, q) => acc + q.marks, 0),
            accuracy: 80,
          })),
          questions: questionResults,
        };

        saveStudentTestResult(gradedResult);
      } catch (err) {
        console.error('Failed to grade attempt:', err);
      }

      setShowSubmitModal(false);
      setSubmitting(false);
    },
    [attempt, submitAttempt, questions, answers, test, studentId, candidateName, setShowSubmitModal]
  );

  // Formatted timer breakdown
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer alert thresholds
  const isTimerCritical = remainingSeconds <= 60;
  const isTimerWarning = remainingSeconds <= 300 && !isTimerCritical;

  const currentQ = questions[currentQuestionIndex] || questions[0];
  const totalAnswered = Object.keys(answers).length;
  const totalUnanswered = questions.length - totalAnswered;

  if (attemptLoading || !attempt) {
    return (
      <div className="fixed inset-0 bg-[#F8FAFC] flex items-center justify-center z-50">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Connecting to Convex Session Engine...
          </p>
        </div>
      </div>
    );
  }

  // If already submitted: Lock screen
  if (attempt.status === 'SUBMITTED' || attempt.status === 'GRADED') {
    return (
      <div className="fixed inset-0 bg-[#F8FAFC] flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-lg w-full text-center shadow-2xl space-y-5 animate-scale-up">
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircleIcon size={36} />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {attempt.autoSubmitted ? 'Server Auto-Submitted' : 'Test Submitted'}
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">
              Assessment Completed & Locked
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Your responses have been synchronized with the authoritative Convex backend and locked against further edits.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Answered:</span>
              <strong className="block text-slate-900 font-bold text-sm">{totalAnswered} Questions</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Session ID:</span>
              <code className="block text-slate-600 font-mono text-[11px] truncate">{attempt.attemptId}</code>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => router.push(`/results/${attempt.attemptId}`)}
              leftIcon={<AwardIcon size={16} />}
            >
              View Evaluated Response & Solutions
            </Button>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => router.push('/')}
            >
              Return to Student Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-lenis-prevent="true" className="fixed inset-0 bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden select-none z-50">
      {/* ========================================================================= */}
      {/* 1. TOP PERSISTENT EXAM BAR                                                */}
      {/* ========================================================================= */}
      <header className="h-14 sm:h-16 bg-white border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-30">
        {/* Left: Test info & Candidate */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-black text-white font-black text-xs flex items-center justify-center shrink-0">
            TP
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-xs sm:text-sm text-black leading-none truncate max-w-[100px] xs:max-w-[160px] sm:max-w-xs">
              {test.title}
            </h1>
            <span className="hidden sm:block text-[10px] text-slate-500 font-medium truncate">
              Candidate: <strong className="text-slate-800">{candidateName}</strong>
            </span>
          </div>
        </div>

        {/* Center: Server-Authoritative Countdown Timer */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border font-mono font-black text-xs sm:text-base tracking-wider transition-all duration-300 shrink-0 ${
            isTimerCritical
              ? 'bg-rose-50 border-rose-400 text-rose-700 animate-pulse'
              : isTimerWarning
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
          aria-label="Time Remaining"
        >
          <ClockIcon size={15} className={isTimerCritical ? 'text-rose-600' : isTimerWarning ? 'text-amber-600' : 'text-slate-600'} />
          <span>{formatTimer(remainingSeconds)}</span>
        </div>

        {/* Right: Autosave Status & Submit Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Sync Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            {syncStatus === 'saving' && (
              <>
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                <span>Autosaving...</span>
              </>
            )}
            {syncStatus === 'saved' && (
              <>
                <CheckCircleIcon size={13} className="text-emerald-600" />
                <span className="text-emerald-700">Saved</span>
              </>
            )}
            {syncStatus === 'offline' && (
              <>
                <AlertCircleIcon size={13} className="text-amber-600" />
                <span className="text-amber-700">Queued</span>
              </>
            )}
            {syncStatus === 'idle' && (
              <span className="text-slate-400">Synced</span>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSubmitModal(true)}
            className="cursor-pointer text-xs px-2.5 sm:px-3.5 py-1.5 font-bold"
          >
            Submit<span className="hidden sm:inline">&nbsp;Test</span>
          </Button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. NOTIFICATION BANNERS (OFFLINE, RESUME, TAB SWITCH)                     */}
      {/* ========================================================================= */}
      {/* Offline Flaky Internet Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm animate-fade-in">
          <AlertCircleIcon size={14} />
          <span>You&apos;re offline — answers are safely recorded and will sync once connection resumes.</span>
        </div>
      )}

      {/* Reopen / Refresh Resume Welcome Banner */}
      {showResumeBanner && (
        <div className="bg-blue-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <SparklesIcon size={14} />
            <span>Welcome back! Your session and remaining time have been safely rehydrated.</span>
          </div>
          <button
            onClick={dismissResumeBanner}
            className="text-white/80 hover:text-white text-base font-bold leading-none p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tab Switch Warning Toast / Alert */}
      {showTabSwitchWarning && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldIcon size={16} />
            <span>
              Proctoring Alert: Window blur detected ({tabSwitchCount} times). Please remain on this tab throughout the examination.
            </span>
          </div>
          <button
            onClick={dismissTabSwitchWarning}
            className="text-white/80 hover:text-white text-xs bg-white/20 px-2 py-0.5 rounded cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE (LEFT: QUESTION CANVAS / RIGHT: QUESTION PALETTE)       */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Primary Question Canvas */}
        <main id="exam-workspace" data-lenis-prevent="true" className="flex-1 flex flex-col justify-between overflow-y-auto p-3.5 sm:p-8 pb-28 sm:pb-32 lg:pb-8 max-w-4xl mx-auto w-full">
          <div className="space-y-6">
            {/* Question Header Meta */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="font-black text-sm bg-black text-white px-3 py-1 rounded-xl">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-xs text-slate-500 font-mono capitalize">
                  {currentQ.type.replace('-', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  +{currentQ.marks} Marks
                </span>
                {currentQ.negativeMarks > 0 && (
                  <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    -{currentQ.negativeMarks} Neg
                  </span>
                )}
              </div>
            </div>

            {/* Question Stem */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-relaxed">
                {currentQ.prompt}
              </h2>

              {/* Optional Code Snippet */}
              {currentQ.codeSnippet && (
                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                  <pre>{currentQ.codeSnippet}</pre>
                </div>
              )}
            </div>

            {/* Numerical Question Input & On-screen Virtual Keypad */}
            {currentQ.type === 'numerical' && (
              <div className="pt-2 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Numerical Answer Entry (NAT)
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Type your calculated numerical value or use the on-screen keypad below.
                      </p>
                    </div>
                    {answers[currentQ.id] && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                        Value Recorded: {answers[currentQ.id]}
                      </span>
                    )}
                  </div>

                  {/* Input display field */}
                  <div className="relative">
                    <input
                      id="numerical-answer-input"
                      data-testid="numerical-answer-input"
                      type="text"
                      inputMode="decimal"
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => handleNumericalChange(currentQ.id, e.target.value)}
                      placeholder="e.g. 14 or 3.14"
                      className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border-2 border-slate-200 focus:border-black rounded-2xl px-5 py-3.5 text-xl sm:text-2xl font-mono font-bold transition-all outline-none"
                    />
                    {answers[currentQ.id] && (
                      <button
                        id="numerical-clear-btn"
                        type="button"
                        onClick={() => handleClearResponse(currentQ.id)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-rose-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* On-screen Virtual Keypad for secure exam entry */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 mb-2.5 flex items-center justify-between">
                      <span>Virtual Number Pad:</span>
                      <span className="text-[10px] text-slate-400">Click digits or use physical keyboard</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 max-w-xs">
                      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.'].map((key) => (
                        <button
                          key={key}
                          id={`keypad-btn-${key === '.' ? 'dot' : key === '-' ? 'minus' : key}`}
                          data-testid={`keypad-btn-${key}`}
                          type="button"
                          onClick={() => handleKeypadPress(currentQ.id, key)}
                          className="h-11 rounded-xl bg-slate-100 hover:bg-black hover:text-white text-slate-800 font-mono font-bold text-base transition-colors border border-slate-200/80 cursor-pointer shadow-2xs active:scale-95"
                        >
                          {key}
                        </button>
                      ))}
                      <button
                        id="keypad-btn-backspace"
                        data-testid="keypad-btn-backspace"
                        type="button"
                        onClick={() => handleKeypadPress(currentQ.id, 'BACKSPACE')}
                        className="h-11 col-span-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-semibold text-xs sm:text-sm transition-colors border border-slate-300/80 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <span>⌫</span>
                        <span>Backspace</span>
                      </button>
                      <button
                        id="keypad-btn-clear"
                        data-testid="keypad-btn-clear"
                        type="button"
                        onClick={() => handleKeypadPress(currentQ.id, 'CLEAR')}
                        className="h-11 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors border border-rose-200 cursor-pointer active:scale-95"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Multiple-Choice Interactive Checkbox Cards */}
            {currentQ.type === 'multiple-choice' && (
              <div className="space-y-2.5 pt-2">
                <div className="text-xs text-slate-500 font-medium pb-1">
                  Select all options that apply:
                </div>
                {currentQ.options?.map((opt, idx) => {
                  const currentSelected = (answers[currentQ.id] || '').split(',').filter(Boolean);
                  const isSelected = currentSelected.includes(opt.id);
                  const optionLetter = String.fromCharCode(65 + idx);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleToggleMultiOption(currentQ.id, opt.id)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'border-black bg-black text-white shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                      }`}
                    >
                      <span
                        className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          isSelected
                            ? 'bg-white text-black'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isSelected ? '✓' : optionLetter}
                      </span>
                      <span className="text-xs sm:text-sm font-medium flex-1">
                        {opt.text}
                      </span>
                      {isSelected && (
                        <CheckCircleIcon size={18} className="text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Single-Choice Interactive Cards */}
            {currentQ.type === 'single-choice' && (
              <div className="space-y-2.5 pt-2">
                {currentQ.options?.map((opt, idx) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  const optionLetter = String.fromCharCode(65 + idx);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'border-black bg-black text-white shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                      }`}
                    >
                      <span
                        className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isSelected
                            ? 'bg-white text-black'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {optionLetter}
                      </span>
                      <span className="text-xs sm:text-sm font-medium flex-1">
                        {opt.text}
                      </span>
                      {isSelected && (
                        <CheckCircleIcon size={18} className="text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Question Controls Toolbar (Desktop) */}
          <div className="pt-6 border-t border-slate-200 hidden lg:flex items-center justify-between gap-3 mt-6">
            <div className="flex items-center gap-2">
              <Button
                id="btn-prev-question"
                variant="outline"
                size="sm"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentIndex(currentQuestionIndex - 1)}
                leftIcon={<ChevronLeftIcon size={14} />}
              >
                Previous
              </Button>

              {answers[currentQ.id] && (
                <button
                  type="button"
                  onClick={() => handleClearResponse(currentQ.id)}
                  className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors px-2 py-1 cursor-pointer"
                >
                  Clear Response
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={markedForReview.includes(currentQ.id) ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => toggleMarkForReview(currentQ.id)}
                leftIcon={<FlagIcon size={13} />}
              >
                {markedForReview.includes(currentQ.id) ? 'Flagged' : 'Mark for Review'}
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  id="btn-next-question"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentIndex(currentQuestionIndex + 1)}
                  rightIcon={<ChevronRightIcon size={14} />}
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  id="btn-review-submit"
                  variant="primary"
                  size="sm"
                  onClick={() => setShowSubmitModal(true)}
                  rightIcon={<CheckCircleIcon size={14} />}
                >
                  Review & Submit
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Right Question Palette Sidebar (Hidden on mobile by default) */}
        <aside data-lenis-prevent="true" className="w-72 bg-white border-l border-slate-200/90 p-5 flex flex-col justify-between shrink-0 hidden lg:flex">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Question Palette
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Quick jump to any question item
              </p>
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-600 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-black" />
                <span>Answered ({totalAnswered})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-slate-200" />
                <span>Unattempted ({totalUnanswered})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-amber-500" />
                <span>Marked ({markedForReview.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md border-2 border-black bg-white" />
                <span>Current</span>
              </div>
            </div>

            {/* Palette Grid */}
            <div data-lenis-prevent="true" className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isMarked = markedForReview.includes(q.id);
                const isCurrent = currentQuestionIndex === idx;

                let pillClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200';

                if (isCurrent) {
                  pillClass = 'ring-2 ring-black bg-white text-black font-black';
                } else if (isMarked) {
                  pillClass = 'bg-amber-500 text-white font-bold';
                } else if (isAnswered) {
                  pillClass = 'bg-black text-white font-bold';
                }

                return (
                  <button
                    key={q.id}
                    id={`palette-btn-${idx + 1}`}
                    data-testid={`palette-q-${idx + 1}`}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs transition-all cursor-pointer ${pillClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs space-y-1">
            <div className="font-bold text-slate-800">
              {totalAnswered} of {questions.length} Attempted
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-black h-full transition-all duration-300"
                style={{ width: `${(totalAnswered / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE FIXED ACTION BOTTOM BAR (Always visible, thumb-reachable, no-scroll)*/}
      {/* ========================================================================= */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5 shadow-2xl flex items-center justify-between gap-2">
        {/* Previous Button */}
        <button
          id="btn-prev-question-mobile"
          type="button"
          disabled={currentQuestionIndex === 0}
          onClick={() => setCurrentIndex(currentQuestionIndex - 1)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shrink-0 active:scale-95"
          aria-label="Previous Question"
        >
          <ChevronLeftIcon size={16} />
          <span>Prev</span>
        </button>

        {/* Center: Question Palette Sheet Trigger & Flag Toggle */}
        <div className="flex items-center gap-1.5">
          {/* Question Palette Trigger */}
          <button
            type="button"
            onClick={() => setMobilePaletteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200/80 transition-all cursor-pointer active:scale-95"
            aria-label="Open Question Palette"
          >
            <GridIcon size={14} className="text-slate-600" />
            <span>Q {currentQuestionIndex + 1}/{questions.length}</span>
          </button>

          {/* Mark for Review Toggle */}
          <button
            type="button"
            onClick={() => toggleMarkForReview(currentQ.id)}
            className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
              markedForReview.includes(currentQ.id)
                ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
            }`}
            title={markedForReview.includes(currentQ.id) ? 'Question Flagged' : 'Mark for Review'}
            aria-label="Mark for Review"
          >
            <FlagIcon size={15} />
          </button>

          {/* Clear answer button (if answered) */}
          {answers[currentQ.id] && (
            <button
              type="button"
              onClick={() => handleClearResponse(currentQ.id)}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-1.5 py-1 transition-colors cursor-pointer"
              title="Clear Selected Answer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Next Question or Review & Submit Button */}
        {currentQuestionIndex < questions.length - 1 ? (
          <button
            id="btn-next-question-mobile"
            type="button"
            onClick={() => setCurrentIndex(currentQuestionIndex + 1)}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-black bg-slate-950 hover:bg-black text-white shadow-md transition-all cursor-pointer shrink-0 active:scale-95"
            aria-label="Next Question"
          >
            <span>Next</span>
            <ChevronRightIcon size={16} />
          </button>
        ) : (
          <button
            id="btn-review-submit-mobile"
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer shrink-0 active:scale-95"
            aria-label="Submit Assessment"
          >
            <span>Submit</span>
            <CheckCircleIcon size={16} />
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MOBILE QUESTION PALETTE DRAWER / BOTTOM SHEET                             */}
      {/* ========================================================================= */}
      {mobilePaletteOpen && (
        <div data-lenis-prevent="true" className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobilePaletteOpen(false)}
          />

          {/* Sheet Container */}
          <div className="relative w-full max-h-[82vh] bg-white rounded-t-3xl border-t border-slate-200 p-5 shadow-2xl z-50 flex flex-col animate-slide-up">
            {/* Sheet Handle */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <GridIcon size={16} className="text-slate-700" />
                  <span>Question Palette</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {totalAnswered} of {questions.length} Attempted
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-lg leading-none font-bold"
                aria-label="Close question palette"
              >
                &times;
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden my-3">
              <div
                className="bg-black h-full transition-all duration-300"
                style={{ width: `${(totalAnswered / questions.length) * 100}%` }}
              />
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 text-[10px] font-semibold text-slate-600 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-black shrink-0" />
                <span>Answered ({totalAnswered})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-slate-200 shrink-0" />
                <span>Unattempted ({totalUnanswered})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-amber-500 shrink-0" />
                <span>Marked ({markedForReview.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md border-2 border-black bg-white shrink-0" />
                <span>Current</span>
              </div>
            </div>

            {/* Palette Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 overflow-y-auto max-h-60 py-3 pr-1">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isMarked = markedForReview.includes(q.id);
                const isCurrent = currentQuestionIndex === idx;

                let pillClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200';

                if (isCurrent) {
                  pillClass = 'ring-2 ring-black bg-white text-black font-black';
                } else if (isMarked) {
                  pillClass = 'bg-amber-500 text-white font-bold';
                } else if (isAnswered) {
                  pillClass = 'bg-black text-white font-bold';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setMobilePaletteOpen(false);
                    }}
                    className={`h-10 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-all cursor-pointer ${pillClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Bottom Dismiss Button */}
            <div className="pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Palette
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PRE-SUBMISSION CONFIRMATION MODAL                                      */}
      {/* ========================================================================= */}
      {showSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div data-lenis-prevent="true" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto">
                <CheckCircleIcon size={24} />
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Ready to Submit Your Exam?
              </h2>
              <p className="text-xs text-slate-500">
                Please review your completion status before final authoritative submission.
              </p>
            </div>

            {/* Answered vs Unanswered Summary Box */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Answered</span>
                <strong className="block text-emerald-700 font-black text-base">{totalAnswered}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Unanswered</span>
                <strong className={`block font-black text-base ${totalUnanswered > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {totalUnanswered}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Flagged</span>
                <strong className="block text-amber-600 font-black text-base">{markedForReview.length}</strong>
              </div>
            </div>

            {totalUnanswered > 0 && (
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                <AlertCircleIcon size={14} className="shrink-0 text-amber-600" />
                <span>You still have {totalUnanswered} unanswered questions.</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2.5">
              <Button
                variant="outline"
                size="md"
                fullWidth
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
              >
                Back to Exam
              </Button>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                isLoading={submitting}
                onClick={() => handleSubmitFinal(false)}
              >
                Confirm Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
