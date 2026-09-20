'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllTests } from '@/lib/admin-utils';
import { Button } from '@/components/ui/Button';
import {
  ClockIcon,
  AwardIcon,
  ShieldIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BookOpenIcon,
} from '@/components/ui/Icons';

interface TestBriefingModalProps {
  testId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStartExam?: (testId: string) => void;
}

export const TestBriefingModal: React.FC<TestBriefingModalProps> = ({
  testId,
  isOpen,
  onClose,
  onStartExam,
}) => {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  if (!isOpen || !testId) return null;

  const test = getAllTests().find((t) => t.id === testId) || {
    id: testId,
    title: 'Assessment Examination',
    category: 'Computer Science',
    description: 'Standard institutional assessment evaluating technical and reasoning proficiencies.',
    durationMinutes: 30,
    totalMarks: 40,
    passMarks: 24,
    totalQuestions: 10,
    instructions: [
      'Each correct single-choice answer awards +4 marks.',
      'Each incorrect response incurs a negative penalty of -1 mark.',
      'Unanswered or skipped questions carry 0 marks penalty.',
      'Session responses are automatically saved to local cache synchronously.',
      'Do not close or switch browser tabs; proctoring logs tab-switching activity.',
    ],
    sections: [],
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-lenis-prevent="true"
      aria-labelledby="briefing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div data-lenis-prevent="true" className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="px-6 py-5 bg-black text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <BookOpenIcon size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Assessment Briefing & Instructions
              </span>
              <h2 id="briefing-modal-title" className="text-lg font-bold text-white leading-tight">
                {test.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-light p-1 leading-none rounded-lg cursor-pointer"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div data-lenis-prevent="true" className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Key Parameters Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Duration</div>
              <div className="text-base font-extrabold text-black mt-0.5 flex items-center justify-center gap-1">
                <ClockIcon size={14} className="text-slate-600" />
                <span>{test.durationMinutes} Mins</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Questions</div>
              <div className="text-base font-extrabold text-black mt-0.5">
                {test.totalQuestions} MCQs
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Marks</div>
              <div className="text-base font-extrabold text-emerald-700 mt-0.5 flex items-center justify-center gap-1">
                <AwardIcon size={14} />
                <span>{test.totalMarks} pts</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Passing</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">
                {test.passMarks} pts
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="text-xs text-slate-600 leading-relaxed bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100">
            {test.description}
          </div>

          {/* Guidelines */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Examination Instructions
            </h3>
            <div className="space-y-1.5">
              {test.instructions.map((inst, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircleIcon size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{inst}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Proctoring notice */}
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
            <ShieldIcon size={16} className="text-amber-600 shrink-0" />
            <span>
              Real-time tab switching detection and proctoring activity will be active during this test.
            </span>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-black focus:ring-black cursor-pointer"
            />
            <span className="text-xs text-slate-800 font-medium">
              I have read the instructions and understand the marking scheme and proctoring rules.
            </span>
          </label>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="secondary"
            size="md"
            disabled={!agreed}
            onClick={() => {
              onClose();
              if (onStartExam) {
                onStartExam(test.id);
              } else {
                router.push(`/exam/${test.id}`);
              }
            }}
            rightIcon={<ArrowRightIcon size={15} />}
          >
            Start Assessment Now
          </Button>
        </div>
      </div>
    </div>
  );
};
