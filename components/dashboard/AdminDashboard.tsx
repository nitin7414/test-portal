'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuthSession, UserAccount } from '@/types/auth';
import { TestMetadata } from '@/types/exam';
import { getAllUsers, syncUsersFromDatabase } from '@/lib/auth';
import {
  getAllTests,
  syncTestsFromDatabase,
  cycleTestStatus,
  updateTestDuration,
  resetTestConfigs,
  toggleStudentStatus,
  deleteStudent,
  toggleAdminStatus,
  deleteAdmin,
  clearStudentResults,
  fullDemoReset,
  getPortalStats,
  PortalStats,
  updateTestScheduleAndAccess,
  TestSchedulePayload,
  deleteTest,
} from '@/lib/admin-utils';
import {
  UsersIcon,
  BookOpenIcon,
  BarChartIcon,
  SettingsIcon,
  ShieldIcon,
  LogOutIcon,
  MenuIcon,
  UploadIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
} from '@/components/ui/Icons';
import { GenerateTestView } from '@/components/dashboard/GenerateTestView';
import { AdminOverviewTab } from '@/components/dashboard/admin/AdminOverviewTab';
import { AdminStudentsTab } from '@/components/dashboard/admin/AdminStudentsTab';
import { AdminAdminsTab } from '@/components/dashboard/admin/AdminAdminsTab';
import { AdminTestsTab } from '@/components/dashboard/admin/AdminTestsTab';
import { AdminSettingsTab } from '@/components/dashboard/admin/AdminSettingsTab';

interface AdminDashboardProps {
  session: AuthSession;
  onLogout: () => void;
  onSwitchToLanding?: () => void;
}

type Tab = 'overview' | 'students' | 'admins' | 'tests' | 'generate' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ session, onLogout, onSwitchToLanding }) => {
  const isSuperAdmin = session.user.id === 'usr_admin_dev_001' || session.user.isSuperAdmin === true;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [students, setStudents] = useState<UserAccount[]>([]);
  const [admins, setAdmins] = useState<UserAccount[]>([]);
  const [tests, setTests] = useState<TestMetadata[]>([]);
  const [stats, setStats] = useState<PortalStats | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refresh = useCallback(() => {
    const allUsers = getAllUsers();
    setStudents(allUsers.filter((u) => u.role === 'student'));
    setAdmins(allUsers.filter((u) => u.role === 'admin'));
    setTests(getAllTests());
    setStats(getPortalStats());
  }, []);

  useEffect(() => {
    refresh();
    syncTestsFromDatabase().then(() => refresh()).catch(() => {});
    syncUsersFromDatabase().then(() => refresh()).catch(() => {});
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

  const handleToggleAdminStatus = (adminId: string) => {
    if (adminId === 'usr_admin_dev_001') {
      showToast('Primary developer administrator account cannot be suspended.', 'error');
      return;
    }
    setAdmins(toggleAdminStatus(adminId).filter((u) => u.role === 'admin'));
    showToast('Administrator status updated.');
  };

  const handleDeleteAdmin = (adminId: string, name: string) => {
    if (adminId === 'usr_admin_dev_001') {
      showToast('Primary developer administrator account cannot be deleted.', 'error');
      return;
    }
    if (!confirm(`Permanently remove administrator privileges for "${name}"? They will no longer have access to the Admin Console.`)) return;
    setAdmins(deleteAdmin(adminId).filter((u) => u.role === 'admin'));
    showToast('Administrator account removed.');
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

  const handleDeleteTest = (testId: string, title: string) => {
    if (!confirm(`Permanently delete assessment "${title}"? This cannot be undone.`)) return;
    setTests(deleteTest(testId));
    setStats(getPortalStats());
    showToast(`Assessment "${title}" deleted.`);
  };

  const handleUpdateDuration = (testId: string, duration: number) => {
    setTests(updateTestDuration(testId, duration));
    showToast('Duration updated.');
  };

  const handleResetTestConfigs = () => {
    setTests(resetTestConfigs());
    showToast('Test configs reset to defaults.');
  };

  const handleSaveSchedule = (payload: TestSchedulePayload, test: TestMetadata) => {
    const updated = updateTestScheduleAndAccess(test.id, payload);
    setTests(updated);
    setStats(getPortalStats());
    showToast(`Schedule & student access for "${test.title}" saved successfully!`);
  };

  const handleSystemAction = (action: string) => {
    if (action === 'reset-sessions') {
      fullDemoReset();
      showToast('Sessions cleared.');
    }
    if (action === 'reset-tests') {
      setTests(resetTestConfigs());
      showToast('Test configs reset.');
    }
    if (action === 'full-reset') {
      fullDemoReset();
      setTests(resetTestConfigs());
      setStats(getPortalStats());
      showToast('Platform reset complete.');
    }
  };

  const TABS: { id: Tab; label: string; mobileLabel?: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', mobileLabel: 'Overview', icon: <BarChartIcon size={16} /> },
    { id: 'students', label: 'Students', mobileLabel: 'Students', icon: <UsersIcon size={16} /> },
    ...(isSuperAdmin ? [{ id: 'admins' as Tab, label: 'Admins', mobileLabel: 'Admins', icon: <ShieldIcon size={16} /> }] : []),
    { id: 'tests', label: 'Tests', mobileLabel: 'Tests', icon: <BookOpenIcon size={16} /> },
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                {isSuperAdmin && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                    Dev Root
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">{session.user.email}</p>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer text-left ${activeTab === tab.id
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer text-left ${activeTab === tab.id
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

        {/* MOBILE BOTTOM TAB BAR (Optimized 5-target thumb layout with safe area) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-lg border-t border-slate-800/90 pb-safe pt-1.5 px-1 flex items-center justify-around shadow-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold tracking-tight transition-all cursor-pointer active:scale-95 ${
              activeTab === 'overview' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChartIcon size={18} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold tracking-tight transition-all cursor-pointer active:scale-95 ${
              activeTab === 'students' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UsersIcon size={18} />
            <span>Students</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold tracking-tight transition-all cursor-pointer active:scale-95 ${
              activeTab === 'tests' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpenIcon size={18} />
            <span>Tests</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold tracking-tight transition-all cursor-pointer active:scale-95 ${
              activeTab === 'generate' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadIcon size={18} />
            <span>Create</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold tracking-tight transition-all cursor-pointer active:scale-95 ${
              activeTab === 'admins' || activeTab === 'settings' ? 'text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <MenuIcon size={18} />
              {(activeTab === 'admins' || activeTab === 'settings') && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-indigo-500" />
              )}
            </div>
            <span>Menu</span>
          </button>
        </div>

        {/* MAIN CONTENT CONTAINER */}
        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 pb-28 lg:pb-0 min-h-screen">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <AdminOverviewTab
              session={session}
              stats={stats}
              tests={tests}
              isLoaded={isLoaded}
              isSuperAdmin={isSuperAdmin}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenAddStudent={() => {
                setActiveTab('students');
                setShowAddStudent(true);
              }}
              onOpenAddAdmin={() => {
                setActiveTab('admins');
                setShowAddAdmin(true);
              }}
            />
          )}

          {/* 2. STUDENTS TAB */}
          {activeTab === 'students' && (
            <AdminStudentsTab
              students={students}
              isLoaded={isLoaded}
              showAddModal={showAddStudent}
              setShowAddModal={setShowAddStudent}
              onToggleStatus={handleToggleStatus}
              onClearHistory={handleClearStudentHistory}
              onDeleteStudent={handleDeleteStudent}
              onRefresh={refresh}
              showToast={showToast}
            />
          )}

          {/* 3. ADMINS TAB */}
          {activeTab === 'admins' && (
            <AdminAdminsTab
              session={session}
              admins={admins}
              isLoaded={isLoaded}
              isSuperAdmin={isSuperAdmin}
              showAddModal={showAddAdmin}
              setShowAddModal={setShowAddAdmin}
              onToggleAdminStatus={handleToggleAdminStatus}
              onDeleteAdmin={handleDeleteAdmin}
              onNavigateOverview={() => setActiveTab('overview')}
              onRefresh={refresh}
              showToast={showToast}
            />
          )}

          {/* 4. TESTS TAB */}
          {activeTab === 'tests' && (
            <AdminTestsTab
              tests={tests}
              students={students}
              isLoaded={isLoaded}
              onCycleStatus={handleCycleStatus}
              onUpdateDuration={handleUpdateDuration}
              onResetDefaults={handleResetTestConfigs}
              onSaveSchedule={handleSaveSchedule}
              onDeleteTest={handleDeleteTest}
              showToast={showToast}
            />
          )}

          {/* GENERATE NEW TEST TAB */}
          {activeTab === 'generate' && (
            <div className={`transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <GenerateTestView
                students={students}
                onTestCreated={() => {
                  refresh();
                  setActiveTab('tests');
                }}
                showToast={showToast}
              />
            </div>
          )}

          {/* 5. SETTINGS TAB */}
          {activeTab === 'settings' && (
            <AdminSettingsTab
              session={session}
              stats={stats}
              isLoaded={isLoaded}
              onSystemAction={handleSystemAction}
            />
          )}
        </main>
      </div>

      {/* TOAST (Positioned safely above mobile bottom bar) */}
      {toast && (
        <div
          className={`fixed bottom-20 lg:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-[9999] flex items-center justify-between sm:justify-start gap-3 px-4 py-3 rounded-2xl shadow-2xl font-semibold text-xs sm:text-sm transition-all duration-300 ${
            toast.type === 'success' ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
};
