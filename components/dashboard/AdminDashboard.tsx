'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuthSession, UserAccount } from '@/types/auth';
import { TestMetadata } from '@/types/exam';
import { getAllUsers, createStudentAccount } from '@/lib/auth';
import {
  getAllTests, cycleTestStatus, updateTestDuration, resetTestConfigs,
  toggleStudentStatus, deleteStudent, clearStudentResults, fullDemoReset, getPortalStats, PortalStats,
  updateTestScheduleAndAccess, formatScheduledDateTime, TestSchedulePayload,
} from '@/lib/admin-utils';
import {
  UsersIcon, BookOpenIcon, BarChartIcon, SettingsIcon, PlusIcon, TrashIcon,
  SearchIcon, RefreshIcon, DatabaseIcon, AlertTriangleIcon, XIcon, CheckCircleIcon,
  ClockIcon, ZapIcon, AwardIcon, ShieldIcon, LogOutIcon, ArrowRightIcon, ChevronRightIcon,
  MenuIcon, CalendarIcon, UploadIcon,
} from '@/components/ui/Icons';
import { GenerateTestView } from '@/components/dashboard/GenerateTestView';

interface AdminDashboardProps {
  session: AuthSession;
  onLogout: () => void;
  onSwitchToLanding?: () => void;
}

type Tab = 'overview' | 'students' | 'tests' | 'generate' | 'settings';

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  upcoming:  'bg-amber-100 text-amber-800 border-amber-200',
  archived:  'bg-slate-100 text-slate-600 border-slate-200',
  suspended: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ session, onLogout, onSwitchToLanding }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [students, setStudents] = useState<UserAccount[]>([]);
  const [tests, setTests] = useState<TestMetadata[]>([]);
  const [stats, setStats] = useState<PortalStats | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingDuration, setEditingDuration] = useState<Record<string, string>>({});
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [schedulingTest, setSchedulingTest] = useState<TestMetadata | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refresh = useCallback(() => {
    setStudents(getAllUsers().filter((u) => u.role === 'student'));
    setTests(getAllTests());
    setStats(getPortalStats());
  }, []);

  useEffect(() => {
    refresh();
    const timer = setTimeout(() => setIsLoaded(true), 100);

    const handleSync = () => {
      refresh();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('tp_tests_updated', handleSync);
    window.addEventListener('tp_users_updated', handleSync);
    window.addEventListener('tp_results_updated', handleSync);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('tp_tests_updated', handleSync);
      window.removeEventListener('tp_users_updated', handleSync);
      window.removeEventListener('tp_results_updated', handleSync);
    };
  }, [refresh]);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.studentId && s.studentId.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  const handleToggleStatus = (userId: string) => {
    setStudents(toggleStudentStatus(userId).filter((u) => u.role === 'student'));
    setStats(getPortalStats());
    showToast('Student status updated.');
  };

  const handleDeleteStudent = (userId: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setStudents(deleteStudent(userId).filter((u) => u.role === 'student'));
    setStats(getPortalStats());
    showToast('Student account deleted.');
  };

  const handleClearStudentHistory = (id: string, name: string) => {
    if (!confirm(`Clear all exam history for "${name}"?`)) return;
    clearStudentResults(id);
    showToast(`History cleared for ${name}.`);
  };

  const handleCycleStatus = (testId: string) => {
    setTests(cycleTestStatus(testId));
    showToast('Test status updated.');
  };

  const handleUpdateDuration = (testId: string) => {
    const val = parseInt(editingDuration[testId] || '0', 10);
    if (!val || val < 1 || val > 300) { showToast('Enter 1–300 min.', 'error'); return; }
    setTests(updateTestDuration(testId, val));
    setEditingDuration((prev) => { const n = { ...prev }; delete n[testId]; return n; });
    showToast('Duration updated.');
  };

  const handleSaveSchedule = (payload: TestSchedulePayload) => {
    if (!schedulingTest) return;
    const updated = updateTestScheduleAndAccess(schedulingTest.id, payload);
    setTests(updated);
    setStats(getPortalStats());
    setSchedulingTest(null);
    showToast(`Schedule & student access for "${schedulingTest.title}" saved successfully!`);
  };

  const handleSystemAction = (action: string) => {
    if (action === 'reset-sessions') { fullDemoReset(); showToast('Sessions cleared.'); }
    if (action === 'reset-tests') { setTests(resetTestConfigs()); showToast('Test configs reset.'); }
    if (action === 'full-reset') {
      fullDemoReset();
      setTests(resetTestConfigs());
      setStats(getPortalStats());
      showToast('Platform reset complete.');
    }
    setResetConfirm(null);
  };

  const TABS: { id: Tab; label: string; mobileLabel?: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', mobileLabel: 'Overview', icon: <BarChartIcon size={16} /> },
    { id: 'students', label: 'Students', mobileLabel: 'Students', icon: <UsersIcon size={16} /> },
    { id: 'tests',    label: 'Tests',    mobileLabel: 'Tests',    icon: <BookOpenIcon size={16} /> },
    { id: 'generate', label: 'Generate new test', mobileLabel: 'Generate', icon: <UploadIcon size={16} /> },
    { id: 'settings', label: 'Settings', mobileLabel: 'Settings', icon: <SettingsIcon size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-600 selection:text-white">
      <div className="flex min-h-screen">

        {/* DESKTOP NAVIGATION SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 fixed top-0 left-0 h-full z-40">
          <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-lg shadow-indigo-900/40">
              TP
            </div>
            <div>
              <p className="font-bold text-sm text-white leading-none">Test Portal</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Admin Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/60">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-sm text-white shrink-0 shadow-xs">
              {session.user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{session.user.email}</p>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer text-left ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}

            {onSwitchToLanding && (
              <button
                type="button"
                onClick={onSwitchToLanding}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer text-left mt-2"
              >
                <BookOpenIcon size={16} />
                Landing View
              </button>
            )}
          </nav>
          <div className="px-3 py-4 border-t border-slate-800">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
            >
              <LogOutIcon size={16} />
              Sign Out / Logout
            </button>
          </div>
        </aside>

        {/* MOBILE TOP BAR WITH HAMBURGER BUTTON */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 focus:outline-none transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <MenuIcon size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-900/40">
                TP
              </div>
              <span className="font-bold text-sm text-white">Admin Console</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-xs flex items-center justify-center text-white">
              {session.user.name.charAt(0)}
            </div>
          </div>
        </div>

        {/* MOBILE HAMBURGER SIDEBAR / DRAWER */}
        {mobileMenuOpen && (
          <div data-lenis-prevent="true" className="lg:hidden fixed inset-0 z-50 flex">
            {/* Dark Backdrop */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-out Drawer Panel */}
            <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 h-full flex flex-col p-5 shadow-2xl z-50">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-900/40">
                    TP
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white leading-none">Test Portal</p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Admin Console</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <XIcon size={18} />
                </button>
              </div>

              {/* User Profile Card */}
              <div className="flex items-center gap-3 py-4 border-b border-slate-800/60">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-sm text-white shrink-0">
                  {session.user.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{session.user.email}</p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer text-left ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}

                {onSwitchToLanding && (
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchToLanding();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer text-left"
                  >
                    <BookOpenIcon size={16} />
                    Landing View
                  </button>
                )}
              </nav>

              {/* Logout in Hamburger Sidebar */}
              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                >
                  <LogOutIcon size={16} />
                  Sign Out / Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE BOTTOM TAB BAR */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex shadow-lg">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.icon}
              <span className="truncate max-w-full px-0.5">{tab.mobileLabel || tab.label}</span>
            </button>
          ))}
        </div>

        {/* MAIN CONTENT CONTAINER */}
        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 pb-24 lg:pb-0 min-h-screen">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className={`p-6 lg:p-8 space-y-8 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Hero banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 p-7 shadow-2xl shadow-indigo-900/40">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldIcon size={14} className="text-indigo-200" />
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-200">System Administrator</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Welcome back, {session.user.name.split(' ')[0]}!
                  </h1>
                  <p className="text-indigo-200/80 text-sm mt-1">Full administrative control over the Test Portal.</p>
                </div>
              </div>

              {/* KPI tiles */}
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Students', value: stats.totalStudents,     sub: `${stats.activeStudents} active`,    icon: <UsersIcon size={18} className="text-indigo-400" />,  g: 'from-indigo-500/20 to-blue-600/10',   b: 'border-indigo-500/30' },
                    { label: 'Total Tests',    value: stats.totalTests,        sub: `${stats.activeTests} live`,         icon: <BookOpenIcon size={18} className="text-emerald-400" />, g: 'from-emerald-500/20 to-teal-600/10', b: 'border-emerald-500/30' },
                    { label: 'Total Attempts', value: stats.totalAttempts,     sub: 'All submissions',                   icon: <ZapIcon size={18} className="text-amber-400" />,     g: 'from-amber-500/20 to-orange-600/10',  b: 'border-amber-500/30' },
                    { label: 'Avg Score',      value: `${stats.averageScore}%`,sub: `${stats.passRate}% pass rate`,     icon: <AwardIcon size={18} className="text-violet-400" />,  g: 'from-violet-500/20 to-purple-600/10', b: 'border-violet-500/30' },
                  ].map((k) => (
                    <div key={k.label} className={`bg-gradient-to-br ${k.g} border ${k.b} rounded-2xl p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k.label}</span>
                        {k.icon}
                      </div>
                      <div className="text-3xl font-black text-white tabular-nums">{k.value}</div>
                      <div className="text-xs text-slate-400 mt-1">{k.sub}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: <UsersIcon size={18} />,   label: 'Add Student',   sub: 'Provision new account',    color: 'indigo',  onClick: () => { setActiveTab('students'); setShowAddStudent(true); } },
                    { icon: <BookOpenIcon size={18} />, label: 'Manage Tests',  sub: 'Configure test settings',  color: 'emerald', onClick: () => setActiveTab('tests') },
                    { icon: <RefreshIcon size={18} />,  label: 'System Reset',  sub: 'Wipe sessions & restore',  color: 'amber',   onClick: () => setActiveTab('settings') },
                  ].map((qa) => (
                    <button
                      key={qa.label}
                      onClick={qa.onClick}
                      className={`group flex items-center gap-4 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        qa.color === 'indigo'  ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/40' :
                        qa.color === 'emerald' ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40' :
                                                 'bg-amber-600/20 border-amber-500/30 text-amber-400 hover:bg-amber-600/40'
                      }`}
                    >
                      {qa.icon}
                      <div>
                        <p className="text-sm font-bold text-white">{qa.label}</p>
                        <p className="text-xs text-slate-400">{qa.sub}</p>
                      </div>
                      <ChevronRightIcon size={14} className="ml-auto text-slate-600 group-hover:translate-x-1 transition-transform shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Tests at a glance */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Tests at a Glance</h2>
                  <button onClick={() => setActiveTab('tests')} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors">
                    View All <ArrowRightIcon size={12} />
                  </button>
                </div>
                <div className="space-y-2">
                  {tests.slice(0, 4).map((t) => (
                    <div key={t.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{t.title}</p>
                        <p className="text-xs text-slate-400">{t.totalQuestions} Qs · {t.durationMinutes}m · {t.totalMarks} marks</p>
                      </div>
                      <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full shrink-0 ml-3 capitalize ${STATUS_COLORS[t.status]}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className={`p-6 lg:p-8 space-y-6 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Student Management</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Provision accounts, manage access, and clear history</p>
                </div>
                <button
                  onClick={() => setShowAddStudent(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>

              <div className="space-y-3">
                {filteredStudents.length === 0 && (
                  <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800">
                    <UsersIcon size={36} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400 font-semibold">No students found</p>
                  </div>
                )}
                {filteredStudents.map((s) => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-sm shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-white">{s.name}</p>
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[s.status]}`}>
                            {s.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{s.email}</p>
                        {s.studentId && (
                          <p className="text-[11px] font-mono text-slate-500">{s.studentId} · {s.batch}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => handleToggleStatus(s.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          s.status === 'active'
                            ? 'bg-rose-950 border-rose-700 text-rose-400 hover:bg-rose-900'
                            : 'bg-emerald-950 border-emerald-700 text-emerald-400 hover:bg-emerald-900'
                        }`}
                      >
                        {s.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleClearStudentHistory(s.id, s.name)}
                        className="text-xs font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Clear History
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(s.id, s.name)}
                        className="text-xs font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-700 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TESTS TAB */}
          {activeTab === 'tests' && (
            <div className={`p-6 lg:p-8 space-y-6 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Test Management</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Configure status, duration, and assess candidates</p>
                </div>
                <button
                  onClick={() => { setTests(resetTestConfigs()); showToast('Test configs reset to defaults.'); }}
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
                          onClick={() => handleCycleStatus(test.id)}
                          className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
                          title="Cycle test status"
                        >
                          Cycle Status
                        </button>
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
            </div>
          )}

          {/* GENERATE NEW TEST TAB */}
          {activeTab === 'generate' && (
            <div className={`transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <GenerateTestView
                students={students}
                onTestCreated={(newTest) => {
                  refresh();
                  setActiveTab('tests');
                }}
                showToast={showToast}
              />
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className={`p-6 lg:p-8 space-y-6 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">System Settings</h2>
                <p className="text-sm text-slate-400 mt-0.5">Manage sessions, platform data, and system configuration</p>
              </div>

              {stats && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Portal Information</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Admin Account',  value: session.user.email },
                      { label: 'Students',        value: String(stats.totalStudents) },
                      { label: 'Active Tests',    value: String(stats.activeTests) },
                      { label: 'Total Attempts',  value: String(stats.totalAttempts) },
                      { label: 'Pass Rate',       value: `${stats.passRate}%` },
                      { label: 'Avg Score',       value: `${stats.averageScore}%` },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-[11px] text-slate-500 font-medium">{item.label}</p>
                        <p className="text-sm font-bold text-white mt-0.5 truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">System Actions</h3>
                <div className="space-y-3">
                  {[
                    {
                      key: 'reset-sessions', label: 'Clear Active Exam Sessions', action: 'Clear Sessions', color: 'amber',
                      sub: 'Forcefully terminates all in-progress exam sessions stored in localStorage.',
                      icon: <ZapIcon size={16} className="text-amber-400" />,
                    },
                    {
                      key: 'reset-tests', label: 'Reset Test Configurations', action: 'Reset Configs', color: 'blue',
                      sub: 'Restores all test durations and statuses to their original defaults.',
                      icon: <DatabaseIcon size={16} className="text-blue-400" />,
                    },
                    {
                      key: 'full-reset', label: 'Reset Platform Data', action: 'Reset Platform', color: 'rose',
                      sub: 'Wipes all result history, sessions, and config overrides. Restores portal to default initial state.',
                      icon: <AlertTriangleIcon size={16} className="text-rose-400" />,
                    },
                  ].map((sa) => (
                    <div key={sa.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">{sa.icon}</div>
                        <div>
                          <p className="text-sm font-bold text-white">{sa.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5 max-w-sm">{sa.sub}</p>
                        </div>
                      </div>
                      {resetConfirm === sa.key ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400">Are you sure?</span>
                          <button
                            onClick={() => handleSystemAction(sa.key)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer text-white ${
                              sa.color === 'amber' ? 'bg-amber-600 hover:bg-amber-500' :
                              sa.color === 'blue'  ? 'bg-blue-600 hover:bg-blue-500'   : 'bg-rose-600 hover:bg-rose-500'
                            }`}
                          >
                            Yes, Proceed
                          </button>
                          <button
                            onClick={() => setResetConfirm(null)}
                            className="text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResetConfirm(sa.key)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer text-white ${
                            sa.color === 'amber' ? 'bg-amber-600 hover:bg-amber-500' :
                            sa.color === 'blue'  ? 'bg-blue-600 hover:bg-blue-500'   : 'bg-rose-600 hover:bg-rose-500'
                          }`}
                        >
                          {sa.action}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Default Credentials Reference</h3>
                <div className="space-y-3">
                  {[
                    { role: 'Admin',           email: 'admin@testportal.com',       pass: 'Admin@Portal2025' },
                    { role: 'Student — Alex',  email: 'alex.morgan@testportal.com', pass: 'Student@Alex2025',  id: 'STU-2025-001' },
                    { role: 'Student — Sarah', email: 'sarah.chen@testportal.com',  pass: 'Student@Sarah2025', id: 'STU-2025-002' },
                  ].map((c) => (
                    <div key={c.email} className="bg-slate-800/60 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{c.role}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {c.id && (
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">Student ID</p>
                            <p className="text-xs font-mono font-bold text-slate-300 mt-0.5">{c.id}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] text-slate-500 font-medium">Email</p>
                          <p className="text-xs font-mono font-bold text-slate-300 mt-0.5">{c.email}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-medium">Password</p>
                          <p className="text-xs font-mono font-bold text-slate-300 mt-0.5">{c.pass}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ADD STUDENT MODAL */}
      {showAddStudent && (
        <AddStudentModal
          onClose={() => setShowAddStudent(false)}
          onSuccess={(msg) => { refresh(); showToast(msg); setShowAddStudent(false); }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* SCHEDULE & ASSIGN STUDENTS MODAL */}
      {schedulingTest && (
        <ScheduleTestModal
          test={schedulingTest}
          students={students}
          onClose={() => setSchedulingTest(null)}
          onSave={handleSaveSchedule}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm transition-all duration-300 ${
            toast.type === 'success' ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
          {toast.msg}
        </div>
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
    name: '', email: '', studentId: '', batch: '2025 Computer Science', password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.studentId || !form.password) {
      onError('Please fill all required fields.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const res = createStudentAccount(form.name, form.email, form.studentId, form.batch, form.password);
      setIsLoading(false);
      if (res.success) onSuccess(res.message);
      else onError(res.message);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" data-lenis-prevent="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl p-7 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-white">Add Student</h3>
            <p className="text-xs text-slate-400 mt-0.5">Provision a new candidate account with bcrypt hashing</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors cursor-pointer">
            <XIcon size={20} />
          </button>
        </div>
        <form onSubmit={handle} className="space-y-4">
          {[
            { label: 'Full Name',       key: 'name',      type: 'text',     ph: 'e.g. John Smith' },
            { label: 'Email Address',   key: 'email',     type: 'email',    ph: 'john.smith@testportal.com' },
            { label: 'Student ID',      key: 'studentId', type: 'text',     ph: 'STU-2025-003' },
            { label: 'Batch / Section', key: 'batch',     type: 'text',     ph: '2025 Computer Science' },
            { label: 'Password',        key: 'password',  type: 'password', ph: 'Minimum 8 characters' },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{f.label}</label>
              <input
                type={f.type}
                placeholder={f.ph}
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all cursor-pointer mt-2"
          >
            {isLoading ? 'Creating account...' : 'Create Student Account'}
          </button>
        </form>
      </div>
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
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  audience === 'all'
                    ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">All Students</span>
                  <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    audience === 'all' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
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
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  audience === 'specific'
                    ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Specific Students Only</span>
                  <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    audience === 'specific' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
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
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-950/40 border-indigo-600/70 text-white'
                              : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
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

                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
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
