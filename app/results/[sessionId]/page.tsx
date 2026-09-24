'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TestResult, QuestionResultAnalysis } from '@/types/exam';
import { getTestResultBySessionId, formatDuration } from '@/lib/student-history';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  AwardIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RotateCcwIcon,
  SparklesIcon,
  BookOpenIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
} from '@/components/ui/Icons';
import { TestBriefingModal } from '@/components/exam/TestBriefingModal';
import { unpackQuestionOptions } from '@/lib/pdf-parser';

export default function CandidateResponsePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [retakeModalOpen, setRetakeModalOpen] = useState(false);

  useEffect(() => {
    if (sessionId) {
      const data = getTestResultBySessionId(sessionId);
      setResult(data);
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Loading candidate response...
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm space-y-4">
          <AlertCircleIcon size={36} className="text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Response Record Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Could not find an evaluation record matching session identifier <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{sessionId}</code>.
          </p>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => router.push('/')}
            leftIcon={<ChevronLeftIcon size={16} />}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const correctCount = result.questions.filter((q) => q.isCorrect).length;
  const incorrectCount = result.questions.filter((q) => !q.isCorrect).length;

  const filteredQuestions = result.questions.filter((q) => {
    if (activeFilter === 'correct') return q.isCorrect;
    if (activeFilter === 'incorrect') return !q.isCorrect;
    return true;
  });

  const isDistinction = result.percentage >= 75;
  const isPassed = result.percentage >= 60;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between">
      {/* Top Floating Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-black bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <ChevronLeftIcon size={15} />
              <span>Back to Dashboard</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Candidate:</span>
              <strong className="text-xs text-slate-900">{result.candidateName}</strong>
              <Badge variant="primary" dot size="sm">
                Enrolled Student
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRetakeModalOpen(true)}
              leftIcon={<RotateCcwIcon size={14} />}
            >
              Retake Test
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6 flex-1">
        {/* Top Hero Scorecard */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          {/* Subtle accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600 absolute top-0 left-0" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="primary" size="sm">
                  Candidate Evaluation & Responses
                </Badge>
                {result.topic && (
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                    {result.topic}
                  </span>
                )}
                {result.category && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                    {result.category}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-tight">
                {result.testTitle}
              </h1>

              <p className="text-xs text-slate-400 font-mono">
                Submitted on{' '}
                {new Date(result.submittedAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                • Session ID: <code className="text-slate-600">{result.sessionId}</code>
              </p>
            </div>

            {/* Score Big Display Pill */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shrink-0 min-w-[170px]">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Final Score
              </span>
              <div className="text-3xl sm:text-4xl font-black text-black tracking-tight my-0.5">
                {result.totalScore}
                <span className="text-sm font-semibold text-slate-400"> / {result.maxScore}</span>
              </div>
              <Badge
                variant={isDistinction ? 'success' : isPassed ? 'primary' : 'danger'}
                size="md"
              >
                {result.percentage.toFixed(1)}% • {isDistinction ? 'Distinction' : isPassed ? 'Passed' : 'Needs Review'}
              </Badge>
            </div>
          </div>

          {/* 4 Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                <AwardIcon size={14} className="text-emerald-600" />
                <span>Score Ratio</span>
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {result.totalScore} / {result.maxScore} Pts
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                <SparklesIcon size={14} className="text-indigo-600" />
                <span>Accuracy</span>
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {result.accuracy}%
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                <ClockIcon size={14} className="text-amber-600" />
                <span>Duration</span>
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {formatDuration(result.timeTakenSeconds)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                of {formatDuration(result.totalTimeSeconds)} allotted
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                <CheckCircleIcon size={14} className="text-blue-600" />
                <span>Correct Rate</span>
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {correctCount} / {result.questions.length} Correct
              </div>
            </div>
          </div>
        </section>

        {/* Section Score Breakdown if available */}
        {result.sections && result.sections.length > 0 && (
          <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Section-wise Evaluation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.sections.map((sec) => (
                <div
                  key={sec.sectionId}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{sec.sectionTitle}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {sec.correctQuestions} correct • {sec.incorrectQuestions} incorrect
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900">
                      {sec.score} / {sec.maxScore}
                    </span>
                    <div className="text-[10px] font-semibold text-emerald-600">
                      {sec.accuracy}% accuracy
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Question Solutions List Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Question Responses & Solutions
              </h2>
              <p className="text-xs text-slate-500">
                Detailed audit showing submitted responses, correct choices, and explanatory reasoning
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-black text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({result.questions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('correct')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                  activeFilter === 'correct'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <CheckCircleIcon size={13} />
                <span>Correct ({correctCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('incorrect')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                  activeFilter === 'incorrect'
                    ? 'bg-rose-700 text-white'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                <AlertCircleIcon size={13} />
                <span>Incorrect ({incorrectCount})</span>
              </button>
            </div>
          </div>

          {/* Render Questions */}
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => (
              <QuestionDetailCard
                key={q.questionId}
                question={q}
                questionIndex={idx + 1}
              />
            ))}
          </div>
        </section>

        {/* Bottom Action Ribbon */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="font-bold text-sm text-slate-900">Want to improve your percentile?</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Launch a fresh attempt to reinforce concepts and test your retention.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/" className="flex-1 sm:flex-initial">
              <Button variant="outline" size="md" fullWidth>
                Back to Dashboard
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="md"
              onClick={() => setRetakeModalOpen(true)}
              leftIcon={<RotateCcwIcon size={15} />}
              className="flex-1 sm:flex-initial"
            >
              Retake Assessment
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-5 px-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        <p>© 2025 Test Portal Systems. Verified candidate response record.</p>
      </footer>

      {/* Retake Briefing Modal */}
      <TestBriefingModal
        testId={result.testId}
        isOpen={retakeModalOpen}
        onClose={() => setRetakeModalOpen(false)}
        onStartExam={(testId) => {
          setRetakeModalOpen(false);
          router.push(`/exam/${testId}`);
        }}
      />
    </div>
  );
}

/* ========================================================================= */
/* DETAILED QUESTION CARD FOR CANDIDATE RESPONSE PAGE                        */
/* ========================================================================= */
interface QuestionDetailCardProps {
  question: QuestionResultAnalysis;
  questionIndex: number;
}

const QuestionDetailCard: React.FC<QuestionDetailCardProps> = ({
  question,
  questionIndex,
}) => {
  const isCorrect = question.isCorrect;

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border p-5 sm:p-7 transition-shadow bg-white ${
        isCorrect
          ? 'border-emerald-200/90 shadow-xs'
          : 'border-rose-200/90 shadow-xs'
      }`}
    >
      {/* Top Meta */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-xs bg-slate-900 text-white px-2.5 py-1 rounded-lg">
            Question {questionIndex}
          </span>
          <Badge
            variant={isCorrect ? 'success' : 'danger'}
            size="sm"
            dot
          >
            {isCorrect ? 'Correct Response' : 'Incorrect Response'}
          </Badge>
          <span className="text-[11px] font-mono text-slate-400 capitalize">
            {question.type}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
            {question.marksAwarded > 0 ? `+${question.marksAwarded}` : '0'} / {question.maxMarks} Marks
          </span>
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            <ClockIcon size={12} />
            <span>{question.timeSpentSeconds}s</span>
          </span>
        </div>
      </div>

      {/* Prompt */}
      <p className="text-sm sm:text-base font-bold text-slate-900 mb-4 leading-relaxed">
        {question.prompt}
      </p>

      {/* Options List */}
      {question.options && question.options.length > 0 && (() => {
        const displayOptions = unpackQuestionOptions(question.options, question.questionId);
        return (
          <div className="space-y-2 mb-4">
            {displayOptions.map((opt) => {
              const isUserChosen = question.userSelectedOptionIds.includes(opt.id);
              const isCorrectOption = question.correctOptionIds.includes(opt.id);

              let containerClass = 'border-slate-200 bg-white text-slate-800';
              let statusTag = null;

              if (isCorrectOption && isUserChosen) {
                containerClass = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold';
                statusTag = (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Your Answer ✓
                  </span>
                );
              } else if (isUserChosen && !isCorrectOption) {
                containerClass = 'border-rose-400 bg-rose-50/80 text-rose-950 font-medium';
                statusTag = (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                    Your Answer ✗
                  </span>
                );
              } else if (isCorrectOption) {
                containerClass = 'border-emerald-300 bg-emerald-50/40 text-emerald-900 border-dashed font-medium';
                statusTag = (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    Correct Answer
                  </span>
                );
              }

              return (
                <div
                  key={opt.id}
                  className={`p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 transition-colors ${containerClass}`}
                >
                  <span>{opt.text.replace(/^\s*(?:(?:Option|Opt)\s+)?[\(\[]?[A-Fa-f0-9][\)\].:\-–]\s*/i, '')}</span>
                  {statusTag}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Numerical Answer Output */}
      {question.type === 'numerical' && (
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 mb-4 text-xs space-y-1">
          <div>
            <span className="text-slate-500 font-medium">Your Submitted Value: </span>
            <strong className={`font-mono text-sm ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
              {question.userNumericalAnswer !== undefined
                ? question.userNumericalAnswer
                : 'No input provided'}
            </strong>
          </div>
        </div>
      )}

      {/* Step-by-step Detailed Explanation */}
      {question.explanation && (
        <div className="rounded-2xl bg-slate-50/90 p-4 text-xs text-slate-700 border border-slate-200 space-y-1">
          <div className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <SparklesIcon size={14} className="text-blue-600" />
            <span>Explanation & Solution:</span>
          </div>
          <p className="whitespace-pre-line text-slate-600 leading-relaxed font-sans pt-0.5">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
