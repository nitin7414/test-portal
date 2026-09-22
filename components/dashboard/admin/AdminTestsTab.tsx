'use client';

import React, { useState } from 'react';
import { TestMetadata } from '@/types/exam';
import { UserAccount } from '@/types/auth';
import {
  TestSchedulePayload,
  formatScheduledDateTime,
} from '@/lib/admin-utils';
import {
  BookOpenIcon,
  RefreshIcon,
  CalendarIcon,
  ClockIcon,
  AwardIcon,
  CheckCircleIcon,
  UsersIcon,
  SearchIcon,
  XIcon,
  TrashIcon,
} from '@/components/ui/Icons';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  upcoming: 'bg-amber-100 text-amber-800 border-amber-200',
  archived: 'bg-slate-100 text-slate-600 border-slate-200',
  suspended: 'bg-rose-100 text-rose-800 border-rose-200',
};

interface AdminTestsTabProps {
  tests: TestMetadata[];
  students: UserAccount[];
  isLoaded: boolean;
  onCycleStatus: (testId: string) => void;
  onUpdateDuration: (testId: string, duration: number) => void;
  onResetDefaults: () => void;
  onSaveSchedule: (payload: TestSchedulePayload, test: TestMetadata) => void;
  onDeleteTest?: (testId: string, title: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminTestsTab: React.FC<AdminTestsTabProps> = ({
  tests,
  students,
  isLoaded,
  onCycleStatus,
  onUpdateDuration,
  onResetDefaults,
  onSaveSchedule,
  onDeleteTest,
  showToast,
}) => {
  const [editingDuration, setEditingDuration] = useState<Record<string, string>>({});
  const [schedulingTest, setSchedulingTest] = useState<TestMetadata | null>(null);

  const handleUpdateDuration = (testId: string) => {
    const val = parseInt(editingDuration[testId] || '0', 10);
    if (!val || val < 1 || val > 300) {
      showToast('Enter 1–300 min.', 'error');
      return;
    }
    onUpdateDuration(testId, val);
    setEditingDuration((prev) => {
      const n = { ...prev };
      delete n[testId];
      return n;
    });
  };

  return (
    <div className={`p-6 lg:p-8 space-y-6 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Test Management</h2>
          <p className="text-sm text-slate-400 mt-0.5">Configure status, duration, and assess candidates</p>
        </div>
        <button
          onClick={onResetDefaults}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
        >
          <RefreshIcon size={14} />
          Reset Defaults
        </button>
      </div>

      <div className="space-y-4">
        {tests.map((test) => (
          <div key={test.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 hover:border-slate-700 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{test.code}</span>
                  <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[test.status]}`}>
                    {test.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full">
                    {test.category}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white leading-snug">{test.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{test.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSchedulingTest(test)}
                  className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <CalendarIcon size={13} />
                  Schedule & Assign
                </button>
                <button
                  onClick={() => onCycleStatus(test.id)}
                  className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
                  title="Cycle test status"
                >
                  Cycle Status
                </button>
                {onDeleteTest && (
                  <button
                    onClick={() => onDeleteTest(test.id, test.title)}
                    className="text-xs font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-700 px-2.5 py-2 rounded-xl transition-all cursor-pointer"
                    title="Delete test"
                  >
                    <TrashIcon size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Schedule & Target Student Access Overview Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CalendarIcon size={12} className="text-indigo-400" />
                  Scheduled Date & Time:
                </span>
                <div className="font-semibold text-slate-200">
                  {test.scheduledDate ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      {formatScheduledDateTime(test.scheduledDate, test.scheduledTime)}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">No scheduled date (Always Open)</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <UsersIcon size={12} className="text-indigo-400" />
                  Student Portal Visibility:
                </span>
                <div>
                  {test.targetAudience === 'specific' ? (
                    <span className="inline-flex items-center gap-1.5 font-bold text-purple-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                      Restricted to {test.assignedStudentIds?.length || 0} Assigned Student(s)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-bold text-sky-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      Visible to All Students ({students.length} enrolled)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap text-xs text-slate-400 pt-1 border-t border-slate-800/60">
              <div className="flex items-center gap-3.5 flex-wrap">
                <span className="flex items-center gap-1.5"><ClockIcon size={12} className="text-slate-500" />{test.durationMinutes}m</span>
                <span className="flex items-center gap-1.5"><BookOpenIcon size={12} className="text-slate-500" />{test.totalQuestions} Questions</span>
                <span className="flex items-center gap-1.5"><AwardIcon size={12} className="text-slate-500" />{test.totalMarks} Marks</span>
                <span className="flex items-center gap-1.5"><CheckCircleIcon size={12} className="text-slate-500" />Pass: {test.passMarks}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Quick Duration:</span>
                <input
                  type="number"
                  min={1}
                  max={300}
                  placeholder={String(test.durationMinutes)}
                  value={editingDuration[test.id] ?? ''}
                  onChange={(e) => setEditingDuration((prev) => ({ ...prev, [test.id]: e.target.value }))}
                  className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-center"
                />
                <span className="text-xs text-slate-500">min</span>
                {editingDuration[test.id] && (
                  <button
                    onClick={() => handleUpdateDuration(test.id)}
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {schedulingTest && (
        <ScheduleTestModal
          test={schedulingTest}
          students={students}
          onClose={() => setSchedulingTest(null)}
          onSave={(payload) => {
            onSaveSchedule(payload, schedulingTest);
            setSchedulingTest(null);
          }}
        />
      )}
    </div>
  );
};

/* ======================================================
   SCHEDULE & ASSIGN STUDENTS MODAL
   ====================================================== */
interface ScheduleTestModalProps {
  test: TestMetadata;
  students: UserAccount[];
  onClose: () => void;
  onSave: (payload: TestSchedulePayload) => void;
}

const ScheduleTestModal: React.FC<ScheduleTestModalProps> = ({ test, students, onClose, onSave }) => {
  const [date, setDate] = useState<string>(test.scheduledDate || '');
  const [time, setTime] = useState<string>(test.scheduledTime || '10:00');
  const [status, setStatus] = useState<'active' | 'upcoming' | 'archived'>(test.status);
  const [durationMinutes, setDurationMinutes] = useState<number>(test.durationMinutes || 30);
  const [audience, setAudience] = useState<'all' | 'specific'>(test.targetAudience || 'all');
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>(test.assignedStudentIds || []);
  const [search, setSearch] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleStudent = (stuId: string) => {
    setValidationError(null);
    setAssignedStudentIds((prev) =>
      prev.includes(stuId) ? prev.filter((id) => id !== stuId) : [...prev, stuId]
    );
  };

  const handleSelectAll = () => {
    setValidationError(null);
    setAssignedStudentIds(students.map((s) => s.id));
  };

  const handleClearAll = () => {
    setAssignedStudentIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (audience === 'specific' && assignedStudentIds.length === 0) {
      setValidationError('Please select at least one student when restricting to specific candidates.');
      return;
    }

    onSave({
      scheduledDate: date || undefined,
      scheduledTime: time || undefined,
      status,
      durationMinutes,
      targetAudience: audience,
      assignedStudentIds,
    });
  };

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.studentId && s.studentId.toLowerCase().includes(q)) ||
      (s.batch && s.batch.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" data-lenis-prevent="true">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-750 rounded-3xl p-6 sm:p-7 w-full max-w-2xl shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-mono font-bold bg-slate-800 text-indigo-400 px-2 py-0.5 rounded border border-slate-700">
                {test.code}
              </span>
              <span className="text-[11px] font-bold text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full">
                {test.category}
              </span>
            </div>
            <h3 className="text-xl font-black text-white">Schedule Test & Assign Students</h3>
            <p className="text-xs text-slate-400 mt-1">{test.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <XIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: SCHEDULE FOR PARTICULAR DAY AND PARTICULAR TIME */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <CalendarIcon size={14} className="text-indigo-400" />
                1. Test Schedule & Timing
              </label>
              <span className="text-[11px] text-slate-500">Day & Time configuration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Particular Day / Date:
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Particular Time for That Day:
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Assessment Status:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'upcoming' | 'archived')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="upcoming">Upcoming (Scheduled for Date & Time)</option>
                  <option value="active">Active (Available right now)</option>
                  <option value="archived">Archived (Closed)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Duration (Minutes):
                </label>
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: SELECT WHICH STUDENT WILL SEE THAT TEST ON HIS/HER PORTAL */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <UsersIcon size={14} className="text-indigo-400" />
                2. Student Portal Visibility
              </label>
              <span className="text-[11px] text-slate-400">
                Select who will see this test on their portal
              </span>
            </div>

            {/* Audience Radio selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setAudience('all'); setValidationError(null); }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${audience === 'all'
                    ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">All Students</span>
                  <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${audience === 'all' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                    }`}>
                    {audience === 'all' && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Visible to all registered students across all batches and sections.
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setAudience('specific'); setValidationError(null); }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${audience === 'specific'
                    ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Specific Students Only</span>
                  <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${audience === 'specific' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                    }`}>
                    {audience === 'specific' && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Only assigned students will see this test on their portal.
                </p>
              </button>
            </div>

            {/* Student Picker (When 'specific' is chosen) */}
            {audience === 'specific' && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search students by name, email, or student ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-300 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] px-1 font-medium">
                  <span className="text-slate-400">Total Enrolled Students: {students.length}</span>
                  <span className="text-indigo-400 font-bold">
                    {assignedStudentIds.length} of {students.length} student(s) selected
                  </span>
                </div>

                {validationError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl font-medium">
                    {validationError}
                  </p>
                )}

                <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-800 rounded-2xl p-2 bg-slate-950/50">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No students match "{search}"
                    </div>
                  ) : (
                    filteredStudents.map((stu) => {
                      const isSelected =
                        assignedStudentIds.includes(stu.id) ||
                        (stu.studentId && assignedStudentIds.includes(stu.studentId)) ||
                        assignedStudentIds.includes(stu.email);

                      return (
                        <div
                          key={stu.id}
                          onClick={() => toggleStudent(stu.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                              ? 'bg-indigo-950/40 border-indigo-600/70 text-white'
                              : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => { }} // handled by parent onClick
                              className="h-4 w-4 rounded text-indigo-600 bg-slate-800 border-slate-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold truncate">{stu.name}</span>
                                {stu.studentId && (
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                    {stu.studentId}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {stu.email} {stu.batch ? `• ${stu.batch}` : ''}
                              </p>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                            {isSelected ? '✓ Assigned' : 'Excluded'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-300 hover:text-white px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs font-bold text-white px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Save Schedule & Access Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
