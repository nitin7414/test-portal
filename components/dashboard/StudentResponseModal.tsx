'use client';

import React, { useState } from 'react';
import { TestResult, QuestionResultAnalysis } from '@/types/exam';
import {
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  AwardIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/student-history';
import { unpackQuestionOptions } from '@/lib/pdf-parser';

interface StudentResponseModalProps {
  result: TestResult | null;
  isOpen: boolean;
  onClose: () => void;
  onRetakeTest?: (testId: string) => void;
}

export const StudentResponseModal: React.FC<StudentResponseModalProps> = ({
  result,
  isOpen,
  onClose,
  onRetakeTest,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  if (!isOpen || !result) return null;

  const filteredQuestions = result.questions.filter((q) => {
    if (activeFilter === 'correct') return q.isCorrect;
    if (activeFilter === 'incorrect') return !q.isCorrect;
    return true;
  });

  const correctCount = result.questions.filter((q) => q.isCorrect).length;
  const incorrectCount = result.questions.filter((q) => !q.isCorrect).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="response-modal-title"
      data-lenis-prevent="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div data-lenis-prevent="true" className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up">
        {/* Top Header */}
        <div className="px-5 sm:px-7 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="primary" size="sm">
                Candidate Response Review
              </Badge>
              {result.topic && (
                <span className="text-[11px] text-slate-300 font-mono">
                  {result.topic}
                </span>
              )}
            </div>
            <h2 id="response-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {result.testTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-light p-1 leading-none rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Score & Summary Ribbon */}
        <div className="bg-slate-50 px-5 sm:px-7 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <AwardIcon size={16} className="text-amber-500" />
              <span>
                Score:{' '}
                <strong className="text-black font-bold text-sm">
                  {result.totalScore} / {result.maxScore}
                </strong>
              </span>
              <Badge variant={result.percentage >= 75 ? 'success' : 'warning'} size="sm">
                {result.percentage.toFixed(1)}%
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              <ClockIcon size={15} className="text-slate-500" />
              <span>
                Duration:{' '}
                <strong className="text-slate-900">
                  {formatDuration(result.timeTakenSeconds)}
                </strong>{' '}
                <span className="text-slate-400">/ {formatDuration(result.totalTimeSeconds)}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <SparklesIcon size={15} className="text-indigo-500" />
              <span>
                Accuracy: <strong className="text-slate-900">{result.accuracy}%</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRetakeTest && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onRetakeTest(result.testId);
                }}
              >
                Retake This Test
              </Button>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="px-5 sm:px-7 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-black text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Questions ({result.questions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('correct')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
              activeFilter === 'correct'
                ? 'bg-emerald-700 text-white'
                : 'text-emerald-700 hover:bg-emerald-50'
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
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <AlertCircleIcon size={13} />
            <span>Incorrect / Skipped ({incorrectCount})</span>
          </button>
        </div>

        {/* Scrollable Questions List */}
        <div data-lenis-prevent="true" className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No questions found for this filter.
            </div>
          ) : (
            filteredQuestions.map((q, idx) => (
              <QuestionResponseCard
                key={q.questionId}
                question={q}
                questionNumber={idx + 1}
              />
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Review
          </Button>
        </div>
      </div>
    </div>
  );
};

interface QuestionResponseCardProps {
  question: QuestionResultAnalysis;
  questionNumber: number;
}

const QuestionResponseCard: React.FC<QuestionResponseCardProps> = ({
  question,
  questionNumber,
}) => {
  const isCorrect = question.isCorrect;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-shadow ${
        isCorrect
          ? 'border-emerald-200/90 bg-emerald-50/25'
          : 'border-rose-200/90 bg-rose-50/25'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded-md">
            Q{questionNumber}
          </span>
          <Badge
            variant={isCorrect ? 'success' : 'danger'}
            size="sm"
            dot
          >
            {isCorrect ? 'Correct' : 'Incorrect'}
          </Badge>
          <span className="text-[11px] text-slate-400 capitalize font-mono">
            {question.type}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
            {question.marksAwarded > 0 ? `+${question.marksAwarded}` : '0'} / {question.maxMarks} Marks
          </span>
          <span className="text-slate-400 text-[11px]">
            • {question.timeSpentSeconds}s spent
          </span>
        </div>
      </div>

      {/* Prompt */}
      <p className="text-sm font-semibold text-slate-900 mb-3 leading-relaxed">
        {question.prompt}
      </p>

      {/* Options Render */}
      {question.options && question.options.length > 0 && (() => {
        const displayOptions = unpackQuestionOptions(question.options, question.questionId);
        return (
          <div className="space-y-1.5 mb-3">
            {displayOptions.map((opt) => {
              const isUserChosen = question.userSelectedOptionIds.includes(opt.id);
              const isCorrectOption = question.correctOptionIds.includes(opt.id);

            let borderClass = 'border-slate-200 bg-white text-slate-800';
            let badgeEl = null;

            if (isCorrectOption && isUserChosen) {
              borderClass = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium';
              badgeEl = (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                  Your Answer ✓
                </span>
              );
            } else if (isUserChosen && !isCorrectOption) {
              borderClass = 'border-rose-400 bg-rose-50 text-rose-950';
              badgeEl = (
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                  Your Answer ✗
                </span>
              );
            } else if (isCorrectOption) {
              borderClass = 'border-emerald-300 bg-emerald-50/40 text-emerald-900 border-dashed';
              badgeEl = (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Correct Answer
                </span>
              );
            }

            return (
              <div
                key={opt.id}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${borderClass}`}
              >
                <span>{opt.text.replace(/^\s*(?:(?:Option|Opt)\s+)?[\(\[]?[A-Fa-f0-9][\)\].:\-–]\s*/i, '')}</span>
                {badgeEl}
              </div>
            );
          })}
        </div>
      );
    })()}

      {/* Numerical Answer Render */}
      {question.type === 'numerical' && (
        <div className="p-3 bg-white rounded-xl border border-slate-200 mb-3 text-xs space-y-1">
          <div>
            <span className="text-slate-500">Your Submitted Value: </span>
            <strong className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
              {question.userNumericalAnswer !== undefined
                ? question.userNumericalAnswer
                : 'Not provided'}
            </strong>
          </div>
        </div>
      )}

      {/* Step-by-step Solution Explanation */}
      {question.explanation && (
        <div className="mt-2.5 rounded-xl bg-slate-100/80 p-3 text-xs text-slate-700 border border-slate-200/60">
          <div className="font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
            <SparklesIcon size={13} className="text-blue-600" />
            <span>Explanation & Solution:</span>
          </div>
          <p className="whitespace-pre-line text-slate-600 leading-relaxed">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
