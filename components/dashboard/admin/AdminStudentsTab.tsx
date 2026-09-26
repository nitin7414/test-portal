'use client';

import React, { useState, useEffect } from 'react';
import { UserAccount } from '@/types/auth';
import {
  createStudentAccount,
  getNextStudentId,
  generateSecureTemporaryPassword,
} from '@/lib/auth';
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UserIcon,
  KeyIcon,
  BookOpenIcon,
  RefreshIcon,
  SparklesIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  AlertTriangleIcon,
  XIcon,
} from '@/components/ui/Icons';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  upcoming: 'bg-amber-100 text-amber-800 border-amber-200',
  archived: 'bg-slate-100 text-slate-600 border-slate-200',
  suspended: 'bg-rose-100 text-rose-800 border-rose-200',
};

const PRESET_SUBJECTS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Electrical Engineering',
  'Data Science & AI',
];

interface CreatedStudentData {
  name: string;
  studentId: string;
  subject: string;
  password: string;
}

interface AdminStudentsTabProps {
  students: UserAccount[];
  isLoaded: boolean;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  onToggleStatus: (userId: string) => void;
  onClearHistory: (userId: string, name: string) => void;
  onDeleteStudent: (userId: string, name: string) => void;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminStudentsTab: React.FC<AdminStudentsTabProps> = ({
  students,
  isLoaded,
  showAddModal,
  setShowAddModal,
  onToggleStatus,
  onClearHistory,
  onDeleteStudent,
  onRefresh,
  showToast,
}) => {
  const [studentSearch, setStudentSearch] = useState('');

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.studentId && s.studentId.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  return (
    <div className={`p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Student Management</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Provision accounts, manage access, and clear history</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-900/30 transition-all cursor-pointer w-full sm:w-auto active:scale-95"
        >
          <PlusIcon size={15} />
          Add Student
        </button>
      </div>

      <div className="relative">
        <SearchIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, email or student ID..."
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
        />
      </div>

      <div className="space-y-3">
        {filteredStudents.length === 0 && (
          <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800">
            <UsersIcon size={36} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 font-semibold text-xs sm:text-sm">No students found</p>
          </div>
        )}
        {filteredStudents.map((s) => (
          <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-sm shrink-0">
                {s.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">{s.name}</p>
                  <span className={`text-[9px] sm:text-[10px] font-bold border px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">{s.email}</p>
                {s.studentId && (
                  <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 mt-0.5">{s.studentId} · {s.batch}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-5 sm:flex sm:items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 shrink-0">
              <button
                onClick={() => onToggleStatus(s.id)}
                className={`col-span-2 text-xs font-bold py-2 px-3 sm:py-1.5 rounded-xl sm:rounded-lg border transition-all cursor-pointer text-center active:scale-95 ${s.status === 'active'
                    ? 'bg-rose-950/80 border-rose-700/80 text-rose-400 hover:bg-rose-900'
                    : 'bg-emerald-950/80 border-emerald-700/80 text-emerald-400 hover:bg-emerald-900'
                  }`}
              >
                {s.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
              <button
                onClick={() => onClearHistory(s.id, s.name)}
                className="col-span-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-700 py-2 px-3 sm:py-1.5 rounded-xl sm:rounded-lg transition-all cursor-pointer text-center active:scale-95 truncate"
              >
                Clear History
              </button>
              <button
                onClick={() => onDeleteStudent(s.id, s.name)}
                className="col-span-1 flex items-center justify-center text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-700 py-2 px-2.5 sm:py-1.5 rounded-xl sm:rounded-lg transition-all cursor-pointer active:scale-95"
                title="Delete Student Account"
                aria-label="Delete Student"
              >
                <TrashIcon size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => { onRefresh(); showToast(msg); }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
    </div>
  );
};

/* ======================================================
   ADD STUDENT MODAL
   ====================================================== */
const AddStudentModal: React.FC<{
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({
    name: '',
    studentId: '',
    subject: 'Computer Science',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdStudent, setCreatedStudent] = useState<CreatedStudentData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Initialize auto-generated ID & temporary password on mount
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      studentId: prev.studentId || getNextStudentId(),
      password: prev.password || generateSecureTemporaryPassword(),
    }));
  }, []);

  const handleRegenerateId = () => {
    setForm((prev) => ({ ...prev, studentId: getNextStudentId() }));
  };

  const handleRegeneratePassword = () => {
    setForm((prev) => ({ ...prev, password: generateSecureTemporaryPassword() }));
  };

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    }
  };

  const handleCopyFullPackage = () => {
    if (!createdStudent) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const formatted = [
      '==================================================',
      'TEST PORTAL — OFFICIAL STUDENT CREDENTIALS',
      '==================================================',
      `Student Name    : ${createdStudent.name}`,
      `Student ID      : ${createdStudent.studentId}`,
      `Subject         : ${createdStudent.subject}`,
      `Password        : ${createdStudent.password}`,
      `Portal Address  : ${origin}`,
      '--------------------------------------------------',
      'Instructions: Choose Student role on the login page',
      'and sign in with your Student ID (or Email) and Password.',
      '==================================================',
    ].join('\n');

    copyToClipboard(formatted, 'package');
  };

  const handleResetForAnother = () => {
    setCreatedStudent(null);
    setValidationError(null);
    setShowPassword(false);
    setForm({
      name: '',
      studentId: getNextStudentId(),
      subject: 'Computer Science',
      password: generateSecureTemporaryPassword(),
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const name = form.name.trim();
    let studentId = form.studentId.trim().toUpperCase();
    const subject = form.subject.trim();
    const password = form.password.trim();

    if (!name || !studentId || !subject || !password) {
      setValidationError('Please fill in Student Full Name, Student ID, Subject, and Password.');
      return;
    }

    if (name.length < 2) {
      setValidationError('Student name must be at least 2 characters long.');
      return;
    }

    // Auto prefix with STD- if user only entered numbers (e.g. 003 -> STD-003)
    if (/^\d+$/.test(studentId)) {
      studentId = `STD-${studentId.padStart(3, '0')}`;
    } else if (!studentId.startsWith('STD-')) {
      studentId = `STD-${studentId}`;
    }

    if (!/^STD-[A-Z0-9]{3,}$/i.test(studentId)) {
      setValidationError('Student ID must be in format STD-XXX (e.g. STD-001, STD-002, STD-003).');
      return;
    }

    if (password.length < 3) {
      setValidationError('Password must be at least 3 characters long.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = createStudentAccount(studentId, password, subject, name);
      setIsLoading(false);

      if (res.success && res.account) {
        onSuccess(res.message);
        setCreatedStudent({
          name: res.account.name || name,
          studentId: res.account.studentId || studentId,
          subject: res.account.subject || subject,
          password: password,
        });
      } else {
        setValidationError(res.message);
        onError(res.message);
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-3 sm:p-4 pb-safe" data-lenis-prevent="true">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-7 w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold">
              <UserIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {createdStudent ? 'Student Account Ready' : 'Add Student'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {createdStudent ? 'Account created and synced with database' : 'Enter Student Name, ID, Subject, and Password'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          {/* SUCCESS / CREDENTIAL HANDOVER STATE */}
          {createdStudent ? (
            <div className="space-y-5 py-1">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircleIcon size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-300">Student Account Created Successfully</h4>
                  <p className="text-xs text-emerald-400/90 mt-0.5 leading-relaxed">
                    Student <strong className="text-white font-bold">{createdStudent.name}</strong> (<span className="font-mono text-indigo-300">{createdStudent.studentId}</span> · {createdStudent.subject}) is active and can log in immediately.
                  </p>
                </div>
              </div>

              {/* CREDENTIAL CARD */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Credentials</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">Active</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Student Full Name</span>
                    <span className="font-bold text-white text-sm">{createdStudent.name}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Student ID (Login)</span>
                      <span className="font-mono font-bold text-indigo-400 text-base">{createdStudent.studentId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdStudent.studentId, 'id')}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'id' ? <CheckIcon size={12} className="text-emerald-400" /> : <CopyIcon size={12} />}
                      <span>{copiedKey === 'id' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Subject</span>
                    <span className="font-bold text-white text-sm">{createdStudent.subject}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Password</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {showPassword ? createdStudent.password : '••••••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdStudent.password, 'pass')}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'pass' ? <CheckIcon size={12} className="text-emerald-400" /> : <CopyIcon size={12} />}
                        <span>{copiedKey === 'pass' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyFullPackage}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/30 transition-all cursor-pointer text-sm"
                >
                  {copiedKey === 'package' ? (
                    <>
                      <CheckIcon size={16} className="text-emerald-300" />
                      <span>Copied Full Credential Package!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon size={16} />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleResetForAnother}
                    className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                  >
                    <PlusIcon size={14} />
                    <span>Add Another</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              {validationError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/40 flex items-center gap-2.5 text-xs text-rose-300 font-medium">
                  <AlertTriangleIcon size={16} className="text-rose-400 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* 1. Student Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <UserIcon size={13} className="text-indigo-400" />
                  <span>Student Full Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma, Emily Watson"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Appears on candidate dashboard, exam evaluations, and report cards</p>
              </div>

              {/* 2. Student ID & Auto-Generate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyIcon size={13} className="text-indigo-400" />
                    <span>Student ID</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateId}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshIcon size={11} />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. STD-003"
                  value={form.studentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all uppercase"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Format: STD-XXX (e.g. STD-001, STD-002, STD-003)</p>
              </div>

              {/* 2. Subject */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <BookOpenIcon size={13} className="text-indigo-400" />
                  <span>Subject</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science, Mathematics"
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  required
                />
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Quick:</span>
                  {PRESET_SUBJECTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, subject: s }))}
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        form.subject === s
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <SparklesIcon size={11} />
                    <span>Generate Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-4 pr-11 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition-all cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/30 transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon size={16} />
                      <span>Create Student</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
