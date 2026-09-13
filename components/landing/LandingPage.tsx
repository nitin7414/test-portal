'use client';

import React, { useState, useRef } from 'react';
import {
  UserIcon,
  ShieldIcon,
  LockIcon,
  MailIcon,
  KeyIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  LogOutIcon,
  BookOpenIcon,
} from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  authenticateUser,
  getActiveSession,
  clearActiveSession,
  createStudentAccount,
  getAllUsers,
  DEFAULT_CREDENTIALS,
} from '@/lib/auth';
import { AuthSession, UserRole, UserAccount } from '@/types/auth';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

export default function LandingPage() {
  const [activeRole, setActiveRole] = useState<UserRole>('student');
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>('dashboard');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(() =>
    typeof window !== 'undefined' ? getActiveSession() : null
  );
  const [usersList, setUsersList] = useState<UserAccount[]>(() =>
    typeof window !== 'undefined' ? getAllUsers() : []
  );

  // Admin student creation form state
  const [showAdminProvisionModal, setShowAdminProvisionModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentBatch, setNewStudentBatch] = useState('2025 Computer Science');
  const [newStudentPass, setNewStudentPass] = useState('');
  const [provisionSuccessMsg, setProvisionSuccessMsg] = useState<string | null>(null);

  const loginSectionRef = useRef<HTMLDivElement>(null);

  const scrollToLogin = () => {
    if (typeof window !== 'undefined' && window.__lenis) {
      window.__lenis.scrollTo('#login-section', {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else {
      loginSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIdentifier('');
    setPassword('');
  };

  const fillQuickCredentials = (role: UserRole) => {
    if (role === 'student') {
      setIdentifier(DEFAULT_CREDENTIALS.student.identifier);
      setPassword(DEFAULT_CREDENTIALS.student.password);
    } else {
      setIdentifier(DEFAULT_CREDENTIALS.admin.email);
      setPassword(DEFAULT_CREDENTIALS.admin.password);
    }
    setErrorMsg(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = authenticateUser(identifier, password, activeRole);
      setIsLoading(false);

      if (res.success && res.session) {
        setSession(res.session);
        setViewMode('dashboard');
        setSuccessMsg(`Welcome, ${res.session.user.name}! Token verified with bcrypt.`);
      } else {
        setErrorMsg(res.message || 'Authentication failed.');
      }
    }, 350);
  };

  const handleLogout = () => {
    clearActiveSession();
    setSession(null);
    setSuccessMsg('Logged out successfully.');
    setIdentifier('');
    setPassword('');
  };

  const handleProvisionStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail || !newStudentId || !newStudentPass) {
      alert('Please fill in all student credential details.');
      return;
    }

    const res = createStudentAccount(
      newStudentName,
      newStudentEmail,
      newStudentId,
      newStudentBatch,
      newStudentPass
    );

    if (res.success) {
      setProvisionSuccessMsg(res.message);
      setUsersList(getAllUsers());
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentId('');
      setNewStudentPass('');
      setTimeout(() => {
        setShowAdminProvisionModal(false);
        setProvisionSuccessMsg(null);
      }, 2500);
    } else {
      alert(res.message);
    }
  };

  // 1. Authenticated Admin Dashboard view (Standalone with sidebar, no covering top header)
  if (session && session.user.role === 'admin' && viewMode === 'dashboard') {
    return (
      <AdminDashboard
        session={session}
        onLogout={handleLogout}
        onSwitchToLanding={() => setViewMode('landing')}
      />
    );
  }

  // 2. Authenticated Student Dashboard view (Standalone with clean integrated header/sidebar, no covering top header)
  if (session && session.user.role === 'student' && viewMode === 'dashboard') {
    return (
      <StudentDashboard
        session={session}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-black selection:text-white relative flex flex-col justify-between">
      {/* Top Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-black text-white font-black text-xs sm:text-sm tracking-widest shadow-xs">
            TP
          </div>
          <div>
            <span className="font-bold text-sm sm:text-base tracking-tight text-black block leading-none">
              TEST PORTAL
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Exam & Proctoring Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {session.user.role === 'student' && (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'dashboard' ? 'landing' : 'dashboard')}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  {viewMode === 'dashboard' ? 'Landing View' : 'My Dashboard'}
                </button>
              )}
              {session.user.role === 'admin' && viewMode !== 'dashboard' && (
                <button
                  type="button"
                  onClick={() => setViewMode('dashboard')}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  Admin Console
                </button>
              )}
              <Badge variant={session.user.role === 'admin' ? 'neutral' : 'primary'} dot size="sm">
                {session.user.role === 'admin' ? 'Admin' : 'Student'}
              </Badge>
              <span className="hidden md:inline-block text-xs font-semibold text-slate-700">
                {session.user.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOutIcon size={13} />}
              >
                Logout
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToLogin}
              className="lg:hidden"
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER: DESKTOP SIDE-BY-SIDE (LEFT: GREETING, RIGHT: LOGIN FORM)  */}
      {/* MOBILE: TIGHT VERTICAL FLOW (COMPACT GREETINGS -> IMMEDIATE LOGIN FORM)   */}
      {/* ========================================================================= */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-18 sm:pt-22 pb-8 sm:pb-12 flex-1 flex flex-col justify-center">
        {/* Subtle grid background pattern */}
        <div className="fixed inset-0 -z-10 pointer-events-none opacity-25 [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 xl:gap-12 items-center">
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT SIDE: SCALED BLACK GREETING WORDS ONLY                             */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left justify-center py-1 sm:py-2 lg:py-6">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-tighter text-black leading-[0.88] select-none">
              WELCOME TO <br />
              <span className="inline-block text-black drop-shadow-xs">
                TEST PORTAL
              </span>
            </h1>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT SIDE: LOGIN FORM (DESKTOP: RIGHT SIDE / MOBILE: DIRECTLY BELOW)  */}
          {/* ----------------------------------------------------------------------- */}
          <div
            ref={loginSectionRef}
            id="login-section"
            className="lg:col-span-5 xl:col-span-5 w-full max-w-md mx-auto"
          >
            {/* Active Session Notification Card if already logged in */}
            {session && (
              <div className="mb-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 p-4 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircleIcon size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Active Session Identified
                    </h3>
                    <p className="text-xs text-slate-700 mt-0.5">
                      Logged in as <strong className="text-black">{session.user.name}</strong> (
                      <span className="uppercase font-mono text-[11px]">{session.user.role}</span>).
                    </p>
                    {session.user.studentId && (
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        ID: <code className="font-semibold">{session.user.studentId}</code>
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {session.user.role === 'admin' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowAdminProvisionModal(true)}
                          leftIcon={<UserIcon size={14} />}
                        >
                          Provision Student
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          rightIcon={<ArrowRightIcon size={14} />}
                          onClick={() => setViewMode('dashboard')}
                        >
                          Open Student Dashboard
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        leftIcon={<LogOutIcon size={13} />}
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TWO ADJACENT BUTTONS SIDE BY SIDE: "STUDENT" AND "ADMIN" */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Select Role to Track Identity
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {activeRole === 'student' ? 'Student Mode' : 'Admin Mode'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-2xl border border-slate-300">
                {/* Student Button (Left) */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('student')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 select-none cursor-pointer ${
                    activeRole === 'student'
                      ? 'bg-black text-white shadow-sm scale-[1.01]'
                      : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <UserIcon size={16} />
                  <span>Student</span>
                </button>

                {/* Admin Button (Right) */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('admin')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 select-none cursor-pointer ${
                    activeRole === 'admin'
                      ? 'bg-black text-white shadow-sm scale-[1.01]'
                      : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <ShieldIcon size={16} />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* LOGIN CARD */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-md shadow-slate-100/70">
              {/* Context Notice */}
              {activeRole === 'student' ? (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-xs text-blue-900 flex items-start gap-2">
                  <BookOpenIcon size={15} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-blue-950 mb-0.5">
                      Student Examination Portal
                    </strong>
                    Access scheduled tests, auto-evaluated mock tests, and track your assessment progress.
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                  <ShieldIcon size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-amber-950 mb-0.5">
                      Administrator Gateway
                    </strong>
                    Manage candidate accounts, create assessments, and review evaluations.
                  </div>
                </div>
              )}

              {/* Alert Feedback */}
              {errorMsg && (
                <div className="mb-3.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2 font-medium">
                  <AlertCircleIcon size={15} className="text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-3.5 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                  <CheckCircleIcon size={15} className="text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-3">
                <Input
                  label={activeRole === 'student' ? 'Student ID or Institutional Email' : 'Admin Email'}
                  placeholder={
                    activeRole === 'student'
                      ? 'e.g. STU-2025-001 or alex.morgan@testportal.com'
                      : 'admin@testportal.com'
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  leftIcon={activeRole === 'student' ? <UserIcon size={16} /> : <MailIcon size={16} />}
                  required
                />

                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<LockIcon size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="cursor-pointer hover:text-slate-700 transition-colors focus:outline-none"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  }
                  required
                />

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="secondary"
                    size="md"
                    fullWidth
                    isLoading={isLoading}
                    rightIcon={<ArrowRightIcon size={16} />}
                  >
                    Sign In as {activeRole === 'student' ? 'Student' : 'Administrator'}
                  </Button>
                </div>
              </form>

              {/* Quick Auto-fill Helpers */}
              <div className="mt-4 pt-3.5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pre-configured Credentials
                  </span>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials(activeRole)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyIcon size={11} />
                    <span>Auto-fill {activeRole === 'student' ? 'Student' : 'Admin'}</span>
                  </button>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-[11px] space-y-0.5 font-mono text-slate-700">
                  {activeRole === 'student' ? (
                    <>
                      <div>
                        <span className="text-slate-400">ID: </span>
                        <strong className="text-black font-semibold">
                          {DEFAULT_CREDENTIALS.student.identifier}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Pass: </span>
                        <strong className="text-black font-semibold">
                          {DEFAULT_CREDENTIALS.student.password}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-400">Email: </span>
                        <strong className="text-black font-semibold">
                          {DEFAULT_CREDENTIALS.admin.email}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Pass: </span>
                        <strong className="text-black font-semibold">
                          {DEFAULT_CREDENTIALS.admin.password}
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* ADMIN PROVISION MODAL                                                     */}
      {/* ========================================================================= */}
      {showAdminProvisionModal && (
        <div data-lenis-prevent="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div data-lenis-prevent="true" className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                  <ShieldIcon size={16} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-black leading-tight">
                    Provision Student Account
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Administrator creates account and distributes credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminProvisionModal(false)}
                className="text-slate-400 hover:text-black text-xl font-bold p-1 leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {provisionSuccessMsg && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircleIcon size={15} className="text-emerald-600 shrink-0" />
                <span>{provisionSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleProvisionStudent} className="space-y-3">
              <Input
                label="Student Full Name"
                placeholder="e.g. Jordan Lee"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  label="Student ID"
                  placeholder="e.g. STU-2025-099"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  required
                />
                <Input
                  label="Batch / Section"
                  placeholder="e.g. CS 2025"
                  value={newStudentBatch}
                  onChange={(e) => setNewStudentBatch(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Student Institutional Email"
                type="email"
                placeholder="e.g. jordan.lee@testportal.com"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                required
              />
              <Input
                label="Temporary / Initial Password"
                placeholder="Create password for student"
                value={newStudentPass}
                onChange={(e) => setNewStudentPass(e.target.value)}
                hint="Password is automatically hashed with bcrypt."
                required
              />

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdminProvisionModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  leftIcon={<KeyIcon size={14} />}
                >
                  Generate Credentials
                </Button>
              </div>
            </form>

            {/* List of currently provisioned students in the system */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Enrolled Students ({usersList.filter((u) => u.role === 'student').length})
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {usersList
                  .filter((u) => u.role === 'student')
                  .map((stu) => (
                    <div
                      key={stu.id}
                      className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{stu.name}</span>{' '}
                        <span className="text-slate-400">({stu.studentId})</span>
                        <div className="text-[10px] text-slate-500">{stu.email}</div>
                      </div>
                      <Badge variant="success" size="sm">
                        Active
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Footer */}
      <footer className="py-4 px-4 text-center text-[11px] text-slate-400 border-t border-slate-200">
        <p>© 2025 Test Portal Systems. Butter-smooth scrolling & bcrypt token authentication.</p>
      </footer>
    </div>
  );
}
