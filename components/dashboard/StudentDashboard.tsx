'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AuthSession } from '@/types/auth';
import { TestResult, TestMetadata } from '@/types/exam';
import {
  getStudentTestResults,
  formatDuration,
} from '@/lib/student-history';
import { getAllTests, isTestVisibleToStudent, formatScheduledDateTime } from '@/lib/admin-utils';
import {
  AwardIcon,
  ClockIcon,
  CheckCircleIcon,
  RotateCcwIcon,
  EyeIcon,
  SparklesIcon,
  BookOpenIcon,
  ArrowRightIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  CalendarIcon,
  UsersIcon,
} from '@/components/ui/Icons';
import { TestBriefingModal } from '@/components/exam/TestBriefingModal';

interface StudentDashboardProps {
  session: AuthSession;
  onLogout?: () => void;
}

type StudentTab = 'dashboard' | 'browse' | 'tests_taken';

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  session,
  onLogout,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [retakeTestId, setRetakeTestId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [browseCategory, setBrowseCategory] = useState<string>('All');
  const [browseSearchQuery, setBrowseSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registeredTests, setRegisteredTests] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const data = getStudentTestResults(session.user.id);
    setResults(data);
    const timer = setTimeout(() => setIsLoaded(true), 150);
    return () => clearTimeout(timer);
  }, [session.user.id]);

  // All tests and student portal visibility filter
  const allTests = useMemo<TestMetadata[]>(() => getAllTests(), []);
  const visibleTests = useMemo<TestMetadata[]>(() => {
    return allTests.filter((t) => isTestVisibleToStudent(t, session.user));
  }, [allTests, session.user]);

  const upcomingTests = useMemo<TestMetadata[]>(() => {
    return visibleTests.filter((t) => t.status === 'upcoming');
  }, [visibleTests]);

  const upcomingCategories = useMemo(() => {
    const set = new Set<string>(['All']);
    upcomingTests.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [upcomingTests]);

  const filteredUpcomingTests = useMemo(() => {
    return upcomingTests.filter((t) => {
      const matchCat = browseCategory === 'All' || t.category === browseCategory;
      const matchSearch =
        t.title.toLowerCase().includes(browseSearchQuery.toLowerCase()) ||
        t.code.toLowerCase().includes(browseSearchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(browseSearchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [upcomingTests, browseCategory, browseSearchQuery]);

  const handleToggleRegister = (testId: string) => {
    setRegisteredTests((prev) => ({
      ...prev,
      [testId]: !prev[testId],
    }));
  };

  const stats = useMemo(() => {
    if (results.length === 0) {
      return {
        totalTests: 0,
        averagePercentage: 0,
        totalMarksEarned: 0,
        totalPossibleMarks: 0,
        overallAccuracy: 0,
        totalTimeSeconds: 0,
        topicsMap: {} as Record<string, { sumPercentage: number; count: number }>,
      };
    }
    const totalTests = results.length;
    const averagePercentage = Math.round((results.reduce((a, r) => a + r.percentage, 0) / totalTests) * 10) / 10;
    const totalMarksEarned = results.reduce((a, r) => a + r.totalScore, 0);
    const totalPossibleMarks = results.reduce((a, r) => a + r.maxScore, 0);
    const overallAccuracy = Math.round((results.reduce((a, r) => a + r.accuracy, 0) / totalTests) * 10) / 10;
    const totalTimeSeconds = results.reduce((a, r) => a + r.timeTakenSeconds, 0);
    const topicsMap: Record<string, { sumPercentage: number; count: number }> = {};
    results.forEach((r) => {
      const t = r.topic || r.category || 'General';
      if (!topicsMap[t]) topicsMap[t] = { sumPercentage: 0, count: 0 };
      topicsMap[t].sumPercentage += r.percentage;
      topicsMap[t].count += 1;
    });
    return { totalTests, averagePercentage, totalMarksEarned, totalPossibleMarks, overallAccuracy, totalTimeSeconds, topicsMap };
  }, [results]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    results.forEach((r) => { if (r.category) set.add(r.category); });
    return Array.from(set);
  }, [results]);

  const filteredResults = useMemo(() =>
    results.filter((r) => {
      const matchCat = selectedCategory === 'All' || r.category === selectedCategory;
      const matchSearch = r.testTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.topic && r.topic.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    }), [results, selectedCategory, searchQuery]);

  // Dashboard requirement: Show ONLY 2 latest test attempted
  const dashboardRecentTests = useMemo(() => results.slice(0, 2), [results]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isLoaded
    ? circumference - (stats.averagePercentage / 100) * circumference
    : circumference;

  const getScoreMeta = (pct: number) => {
    if (pct >= 80) return { label: 'Distinction', color: 'text-emerald-400' };
    if (pct >= 60) return { label: 'Proficient', color: 'text-sky-400' };
    return { label: 'Developing', color: 'text-amber-400' };
  };
  const scoreMeta = getScoreMeta(stats.averagePercentage);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 md:pb-20">

      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION HEADER                                                  */}
      {/* ========================================================================= */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand & Mobile Hamburger Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <MenuIcon size={22} />
            </button>
            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-900/40 group-hover:scale-105 transition-transform">
                TP
              </div>
              <div>
                <span className="font-bold text-sm text-white block leading-none">
                  Test Portal
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300">
                  Student Portal
                </span>
              </div>
            </div>
          </div>

          {/* Center: Primary Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-2xl border border-slate-700/60 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'browse'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <CalendarIcon size={14} />
              <span>1. Browse Assessments</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                activeTab === 'browse' ? 'bg-indigo-700 text-white' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {upcomingTests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tests_taken')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'tests_taken'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <AwardIcon size={14} />
              <span>2. Tests Taken</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                activeTab === 'tests_taken' ? 'bg-indigo-700 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {results.length}
              </span>
            </button>
          </nav>

          {/* Right: Candidate Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-xs flex items-center justify-center text-white">
                {session.user.name.charAt(0)}
              </div>
              <span className="font-semibold text-slate-200">{session.user.name}</span>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-rose-100 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <LogOutIcon size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MOBILE HAMBURGER DRAWER                                                */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div data-lenis-prevent="true" className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 h-full flex flex-col p-5 shadow-2xl z-50">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-900/40">
                  TP
                </div>
                <div>
                  <p className="font-bold text-sm text-white leading-none">Test Portal</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300 mt-0.5">Student Console</p>
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

            {/* Candidate Profile */}
            <div className="flex items-center gap-3 py-4 border-b border-slate-800/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-sm text-white shrink-0 shadow-md">
                {session.user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{session.user.email}</p>
                {session.user.batch && (
                  <span className="inline-block text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded mt-1">
                    {session.user.batch}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 py-4 space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <SparklesIcon size={16} />
                <span>Dashboard Overview</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('browse');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'browse'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CalendarIcon size={16} className="text-indigo-400" />
                  <span>1. Browse Assessments</span>
                </div>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-mono">
                  {upcomingTests.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('tests_taken');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
                  activeTab === 'tests_taken'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AwardIcon size={16} className="text-emerald-400" />
                  <span>2. Tests Taken</span>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                  {results.length}
                </span>
              </button>
            </nav>

            {/* Logout button */}
            {onLogout && (
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
            )}
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM TAB BAR FOR STUDENT */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SparklesIcon size={16} />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('browse')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer relative ${
            activeTab === 'browse' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <CalendarIcon size={16} />
            {upcomingTests.length > 0 && (
              <span className="absolute -top-1.5 -right-3 h-4 min-w-[16px] px-1 bg-indigo-600 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                {upcomingTests.length}
              </span>
            )}
          </div>
          <span>1. Browse</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tests_taken')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer relative ${
            activeTab === 'tests_taken' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <AwardIcon size={16} />
            {results.length > 0 && (
              <span className="absolute -top-1.5 -right-3 h-4 min-w-[16px] px-1 bg-slate-700 text-slate-200 rounded-full text-[9px] font-black flex items-center justify-center">
                {results.length}
              </span>
            )}
          </div>
          <span>2. Taken</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. VIEW 1: DASHBOARD OVERVIEW                                            */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <>
          {/* HERO BANNER */}
          <section className="relative overflow-hidden pt-8 sm:pt-12 pb-12 px-4 sm:px-8">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 pointer-events-none" />
            <div className="absolute -top-24 -left-16 w-96 h-96 rounded-full opacity-25 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', animation: 'float 8s ease-in-out infinite' }} />
            <div className="absolute top-4 right-0 w-72 h-72 rounded-full opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', animation: 'float 10s ease-in-out infinite reverse' }} />

            <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className={`transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300/80">Candidate Profile</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-2.5 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Enrolled Candidate
                  </span>
                  {session.user.batch && (
                    <span className="text-[11px] font-mono text-slate-400 bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                      {session.user.batch}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap">
                  <span>Hey, {session.user.name.split(' ')[0]}!</span>
                  <span className="inline-block animate-bounce">👋</span>
                </h1>
                <p className="text-sm text-slate-300/80 mt-2 max-w-xl leading-relaxed">
                  Track your mastery, inspect past evaluations, and register for upcoming institutional assessments.
                </p>
              </div>

              {/* Action Buttons */}
              <div className={`flex items-center gap-3 self-start md:self-auto transition-all duration-700 delay-150 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} flex-wrap`}>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="flex items-center gap-2 text-xs sm:text-sm font-bold bg-white text-slate-900 hover:bg-indigo-50 px-4 sm:px-5 py-2.5 rounded-2xl shadow-lg transition-all cursor-pointer"
                >
                  <CalendarIcon size={16} className="text-indigo-600" />
                  <span>Browse Assessments</span>
                  <ArrowRightIcon size={14} />
                </button>

                <button
                  onClick={() => setActiveTab('tests_taken')}
                  className="flex items-center gap-2 text-xs sm:text-sm font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-white border border-indigo-400/40 px-4 sm:px-5 py-2.5 rounded-2xl transition-all cursor-pointer"
                >
                  <AwardIcon size={16} />
                  <span>Tests Taken ({results.length})</span>
                </button>
              </div>
            </div>
          </section>

          <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-10">
            {/* PERFORMANCE OVERVIEW */}
            <section aria-labelledby="perf-heading"
              className={`transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 id="perf-heading" className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <SparklesIcon size={20} className="text-indigo-500" />
                    Performance Overview
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Computed across all proctored submissions</p>
                </div>
                <span className="hidden sm:flex text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Circular gauge */}
                <div className="md:col-span-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-2xl shadow-indigo-900/30 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Aggregate Score</span>
                  <div className="relative flex items-center justify-center">
                    <svg className="w-44 h-44 -rotate-90" viewBox="0 0 130 130">
                      <circle cx="65" cy="65" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="12" fill="transparent" />
                      <circle
                        cx="65" cy="65" r={radius}
                        stroke="url(#gaugeGrad)"
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                      />
                      <defs>
                        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="50%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-white tracking-tighter tabular-nums">
                        {isLoaded ? `${stats.averagePercentage}%` : '—'}
                      </span>
                      <span className={`text-xs font-bold mt-0.5 ${scoreMeta.color}`}>
                        {scoreMeta.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                    Based on {stats.totalTests} completed assessment{stats.totalTests !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* 4 Stat Tiles */}
                <div className="md:col-span-8 grid grid-cols-2 gap-4">
                  <StatTile
                    label="Tests Taken"
                    value={String(stats.totalTests)}
                    sub="Completed attempts"
                    subColor="text-indigo-600"
                    gradient="from-indigo-500 to-blue-600"
                    icon={<BookOpenIcon size={20} className="text-indigo-500" />}
                  />
                  <StatTile
                    label="Total Marks"
                    value={String(stats.totalMarksEarned)}
                    suffix={`/ ${stats.totalPossibleMarks}`}
                    sub={`${stats.averagePercentage}% score rate`}
                    subColor="text-emerald-600"
                    gradient="from-emerald-500 to-teal-600"
                    icon={<AwardIcon size={20} className="text-emerald-500" />}
                  />
                  <StatTile
                    label="Precision Accuracy"
                    value={`${stats.overallAccuracy}%`}
                    sub="Correct answers ratio"
                    subColor="text-amber-600"
                    gradient="from-amber-500 to-orange-500"
                    icon={<CheckCircleIcon size={20} className="text-amber-500" />}
                  />
                  <StatTile
                    label="Time Spent"
                    value={formatDuration(stats.totalTimeSeconds)}
                    sub="Total examination time"
                    subColor="text-violet-600"
                    gradient="from-violet-500 to-purple-600"
                    icon={<ClockIcon size={20} className="text-violet-500" />}
                  />
                </div>
              </div>
            </section>

            {/* TOPIC PROFICIENCY SPECTRUM */}
            {Object.keys(stats.topicsMap).length > 0 && (
              <section aria-labelledby="topics-heading"
                className={`transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 id="topics-heading" className="text-lg font-bold text-slate-900 tracking-tight">
                        Topic Proficiency Spectrum
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Average score per subject area</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(stats.topicsMap).map(([topic, data]) => {
                      const avg = Math.round((data.sumPercentage / data.count) * 10) / 10;
                      const barColor = avg >= 80 ? 'bg-emerald-500' : avg >= 60 ? 'bg-indigo-600' : 'bg-amber-500';
                      return (
                        <div key={topic} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-700">{topic}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-[11px]">({data.count} test{data.count !== 1 ? 's' : ''})</span>
                              <span className="font-bold text-slate-900 tabular-nums">{avg}%</span>
                            </div>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                              style={{ width: isLoaded ? `${avg}%` : '0%' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* RECENT TEST ATTEMPTS — SHOW ONLY 2 LATEST AS REQUESTED */}
            <section aria-labelledby="recent-tests-heading"
              className={`transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 id="recent-tests-heading" className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <ClockIcon size={20} className="text-indigo-500" />
                    Latest Tests Attempted
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Displaying your 2 most recent attempts. Head over to <strong>Tests Taken</strong> for complete records.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('tests_taken')}
                  className="self-start sm:self-auto text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>View All Tests Taken ({results.length})</span>
                  <ArrowRightIcon size={13} />
                </button>
              </div>

              {dashboardRecentTests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <BookOpenIcon size={40} className="mx-auto text-slate-300" />
                  <h3 className="font-bold text-slate-700">No tests taken yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Browse upcoming assessments to prepare for institutional tests and earn your certifications.
                  </p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="inline-flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <span>Browse Upcoming Assessments</span>
                    <ArrowRightIcon size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardRecentTests.map((result, idx) => (
                    <StructuredTestCard
                      key={result.sessionId}
                      result={result}
                      index={idx}
                      isLoaded={isLoaded}
                      onShowResponse={() => router.push(`/results/${result.sessionId}`)}
                      onRetake={() => setRetakeTestId(result.testId)}
                    />
                  ))}
                </div>
              )}

              {results.length > 2 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setActiveTab('tests_taken')}
                    className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-6 py-3 rounded-2xl transition-all cursor-pointer shadow-xs"
                  >
                    <span>View All {results.length} Tests Taken</span>
                    <ArrowRightIcon size={15} />
                  </button>
                </div>
              )}
            </section>
          </main>
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW 2: BROWSE ASSESSMENTS (UPCOMING ASSESSMENTS ONLY)                  */}
      {/* ========================================================================= */}
      {activeTab === 'browse' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-10 space-y-8 animate-fade-in">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 rounded-full">
                    📅 Institutional Schedule
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Registration Open
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  Upcoming Assessments
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                  Browse scheduled evaluations and technical screenings. Reserve your slot and review the syllabus before exam day.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-white/10 border border-white/15 px-4 py-2.5 rounded-2xl text-center">
                  <span className="block text-2xl font-black text-white">{upcomingTests.length}</span>
                  <span className="text-[10px] uppercase font-bold text-indigo-200">Scheduled Tests</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-400 shrink-0">Category:</span>
              {upcomingCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setBrowseCategory(cat)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    browseCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search upcoming tests..."
                value={browseSearchQuery}
                onChange={(e) => setBrowseSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>
          </div>

          {/* Grid of Upcoming Assessment Cards */}
          {filteredUpcomingTests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <CalendarIcon size={40} className="mx-auto text-slate-300" />
              <h3 className="font-bold text-slate-700">No upcoming assessments match your filter</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try clearing your search query or selecting "All" categories.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredUpcomingTests.map((test) => {
                const isRegistered = Boolean(registeredTests[test.id]);
                return (
                  <div
                    key={test.id}
                    className="group bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Top gradient stripe */}
                    <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-600 to-purple-600" />

                    <div className="p-6 space-y-4 flex-1">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2.5 py-1 rounded-lg">
                          {test.category}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {test.targetAudience === 'specific' && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <UsersIcon size={11} className="text-purple-600" />
                              Assigned to You
                            </span>
                          )}
                          {test.scheduledDate && (
                            <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <CalendarIcon size={12} className="text-indigo-600" />
                              {formatScheduledDateTime(test.scheduledDate, test.scheduledTime)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Code */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {test.code}
                          </code>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            Upcoming
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                          {test.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {test.description}
                        </p>
                      </div>

                      {/* Schedule Callout Box */}
                      {test.scheduledDate && (
                        <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <CalendarIcon size={15} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-indigo-500 block">Assessment Window</span>
                            <span className="text-xs font-bold text-indigo-950 block truncate">
                              {formatScheduledDateTime(test.scheduledDate, test.scheduledTime)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Parameters Pills */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="p-2 bg-slate-50 rounded-xl">
                          <span className="text-[10px] font-semibold text-slate-400 block">Duration</span>
                          <span className="font-bold text-slate-800">{test.durationMinutes} Mins</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl">
                          <span className="text-[10px] font-semibold text-slate-400 block">Total Marks</span>
                          <span className="font-bold text-slate-800">{test.totalMarks} Marks</span>
                        </div>
                      </div>

                      {/* Syllabus Chips */}
                      {test.syllabus && test.syllabus.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Key Topics Covered:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {test.syllabus.map((syl) => (
                              <span
                                key={syl}
                                className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                              >
                                {syl}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleRegister(test.id)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isRegistered
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/20'
                        }`}
                      >
                        {isRegistered ? (
                          <>
                            <CheckCircleIcon size={14} />
                            <span>Registered</span>
                          </>
                        ) : (
                          <>
                            <CalendarIcon size={14} />
                            <span>Register for Test</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setRetakeTestId(test.id)}
                        className="py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 hover:text-black bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                        title="View Instructions"
                      >
                        <BookOpenIcon size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VIEW 3: TESTS TAKEN (COMPLETE EVALUATION HISTORY)                      */}
      {/* ========================================================================= */}
      {activeTab === 'tests_taken' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-10 space-y-8 animate-fade-in">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <AwardIcon size={12} className="text-emerald-400" />
                    Evaluated Attempts History
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  Tests Taken
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                  Review complete question-by-question responses, performance percentiles, marks awarded, and step-by-step solution breakdowns.
                </p>
              </div>

              {/* Quick Summary Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                <div className="bg-white/10 border border-white/15 px-3 py-2 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-200 block">Total</span>
                  <strong className="text-lg font-black text-white">{results.length}</strong>
                </div>
                <div className="bg-white/10 border border-white/15 px-3 py-2 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-200 block">Avg Score</span>
                  <strong className="text-lg font-black text-white">{stats.averagePercentage}%</strong>
                </div>
                <div className="bg-white/10 border border-white/15 px-3 py-2 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-200 block">Accuracy</span>
                  <strong className="text-lg font-black text-white">{stats.overallAccuracy}%</strong>
                </div>
                <div className="bg-white/10 border border-white/15 px-3 py-2 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-200 block">Marks</span>
                  <strong className="text-lg font-black text-white">{stats.totalMarksEarned}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 shrink-0">Filter:</span>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All Categories' : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search attempted tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>
          </div>

          {/* Full List of Attempted Tests */}
          {filteredResults.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <BookOpenIcon size={40} className="mx-auto text-slate-300" />
              <h3 className="font-bold text-slate-700">No test attempts found</h3>
              <p className="text-xs text-slate-400 mt-1">Try resetting the category filter or search term.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResults.map((result, idx) => (
                <StructuredTestCard
                  key={result.sessionId}
                  result={result}
                  index={idx}
                  isLoaded={isLoaded}
                  onShowResponse={() => router.push(`/results/${result.sessionId}`)}
                  onRetake={() => setRetakeTestId(result.testId)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Test Briefing & Instructions Modal */}
      <TestBriefingModal
        testId={retakeTestId}
        isOpen={Boolean(retakeTestId)}
        onClose={() => setRetakeTestId(null)}
        onStartExam={(testId) => {
          setRetakeTestId(null);
          router.push(`/exam/${testId}`);
        }}
      />
    </div>
  );
};

/* ---- STAT TILE ---- */
interface StatTileProps {
  label: string;
  value: string;
  suffix?: string;
  sub: string;
  subColor: string;
  gradient: string;
  icon: React.ReactNode;
}
const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  suffix,
  sub,
  subColor,
  gradient,
  icon,
}) => (
  <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden p-4 cursor-default">
    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradient}`} />
    <div className="flex items-center justify-between mb-2 mt-0.5">
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-tight">
        {label}
      </span>
      <div className="group-hover:scale-110 transition-transform duration-200">{icon}</div>
    </div>
    <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums leading-none">
      {value}
      {suffix && <span className="text-xs font-normal text-slate-400 ml-0.5">{suffix}</span>}
    </div>
    <div className={`text-[11px] font-semibold mt-1.5 ${subColor}`}>{sub}</div>
  </div>
);

/* ---- STRUCTURED TEST CARD ---- */
interface StructuredTestCardProps {
  result: TestResult;
  index: number;
  isLoaded: boolean;
  onShowResponse: () => void;
  onRetake: () => void;
}
const StructuredTestCard: React.FC<StructuredTestCardProps> = ({
  result,
  index,
  isLoaded,
  onShowResponse,
  onRetake,
}) => {
  const isPassed = result.percentage >= 60;
  const isDistinction = result.percentage >= 80;
  const ringFrom = isDistinction ? '#10b981' : isPassed ? '#0ea5e9' : '#f59e0b';
  const ringTo = isDistinction ? '#06b6d4' : isPassed ? '#6366f1' : '#ef4444';
  const topBar = isDistinction
    ? 'from-emerald-500 to-teal-400'
    : isPassed
    ? 'from-sky-500 to-blue-600'
    : 'from-amber-500 to-orange-500';
  const scorePill = isDistinction
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : isPassed
    ? 'bg-sky-50 border-sky-200 text-sky-800'
    : 'bg-amber-50 border-amber-200 text-amber-800';
  const scoreLabel = isDistinction ? '✦ Distinction' : isPassed ? '✓ Passed' : '~ Developing';
  const miniCirc = 2 * Math.PI * 22;

  return (
    <div
      className={`group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${
        isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${index * 70}ms` }}
    >
      <div className={`h-1 bg-gradient-to-r ${topBar}`} />
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
        {/* LEFT */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Mini ring */}
          <div className="shrink-0 relative w-14 h-14">
            <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
              <circle cx="28" cy="28" r="22" stroke="#f1f5f9" strokeWidth="6" fill="none" />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke={`url(#ring${index})`}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={miniCirc}
                strokeDashoffset={isLoaded ? miniCirc * (1 - result.percentage / 100) : miniCirc}
                fill="none"
                style={{
                  transition: `stroke-dashoffset 1s cubic-bezier(0.34,1.1,0.64,1) ${index * 70 + 200}ms`,
                }}
              />
              <defs>
                <linearGradient id={`ring${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={ringFrom} />
                  <stop offset="100%" stopColor={ringTo} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-black text-slate-800 tabular-nums">
                {result.percentage.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {result.topic && (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-md whitespace-nowrap">
                  {result.topic}
                </span>
              )}
              <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md whitespace-nowrap ${scorePill}`}>
                {scoreLabel}
              </span>
              <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                {new Date(result.submittedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-800 transition-colors">
              {result.testTitle}
            </h3>
            <div className="flex items-center gap-3 sm:gap-5 flex-wrap mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <AwardIcon size={12} className="text-emerald-500 shrink-0" />
                <span className="font-bold text-slate-800">{result.totalScore}</span>
                <span>/ {result.maxScore} marks</span>
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <ClockIcon size={12} className="text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">{formatDuration(result.timeTakenSeconds)}</span>
                <span className="text-slate-400">/ {formatDuration(result.totalTimeSeconds)}</span>
              </span>
              <span className="hidden sm:flex items-center gap-1 whitespace-nowrap">
                <SparklesIcon size={12} className="text-amber-500 shrink-0" />
                <span className="font-semibold text-slate-700">{result.accuracy}%</span>
                <span>accuracy</span>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: stacked buttons */}
        <div className="flex flex-row md:flex-col gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-5 w-full md:w-40">
          <button
            onClick={onRetake}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold bg-slate-900 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <RotateCcwIcon size={13} />
            <span>Retake</span>
          </button>
          <button
            onClick={onShowResponse}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap"
          >
            <EyeIcon size={13} />
            <span>View Response</span>
          </button>
        </div>
      </div>
    </div>
  );
};
