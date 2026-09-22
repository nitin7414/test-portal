'use client';

import React from 'react';
import { AuthSession } from '@/types/auth';
import { TestMetadata } from '@/types/exam';
import { PortalStats } from '@/lib/admin-utils';
import {
  ShieldIcon,
  UsersIcon,
  BookOpenIcon,
  ZapIcon,
  AwardIcon,
  RefreshIcon,
  ChevronRightIcon,
  ArrowRightIcon,
} from '@/components/ui/Icons';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  upcoming: 'bg-amber-100 text-amber-800 border-amber-200',
  archived: 'bg-slate-100 text-slate-600 border-slate-200',
  suspended: 'bg-rose-100 text-rose-800 border-rose-200',
};

interface AdminOverviewTabProps {
  session: AuthSession;
  stats: PortalStats | null;
  tests: TestMetadata[];
  isLoaded: boolean;
  isSuperAdmin: boolean;
  onNavigateTab: (tab: 'overview' | 'students' | 'admins' | 'tests' | 'generate' | 'settings') => void;
  onOpenAddStudent: () => void;
  onOpenAddAdmin: () => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  session,
  stats,
  tests,
  isLoaded,
  isSuperAdmin,
  onNavigateTab,
  onOpenAddStudent,
  onOpenAddAdmin,
}) => {
  return (
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
            { label: 'Total Students', value: stats.totalStudents, sub: `${stats.activeStudents} active`, icon: <UsersIcon size={18} className="text-indigo-400" />, g: 'from-indigo-500/20 to-blue-600/10', b: 'border-indigo-500/30' },
            { label: 'Total Tests', value: stats.totalTests, sub: `${stats.activeTests} live`, icon: <BookOpenIcon size={18} className="text-emerald-400" />, g: 'from-emerald-500/20 to-teal-600/10', b: 'border-emerald-500/30' },
            { label: 'Total Attempts', value: stats.totalAttempts, sub: 'All submissions', icon: <ZapIcon size={18} className="text-amber-400" />, g: 'from-amber-500/20 to-orange-600/10', b: 'border-amber-500/30' },
            { label: 'Avg Score', value: `${stats.averageScore}%`, sub: `${stats.passRate}% pass rate`, icon: <AwardIcon size={18} className="text-violet-400" />, g: 'from-violet-500/20 to-purple-600/10', b: 'border-violet-500/30' },
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
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
          {[
            { icon: <UsersIcon size={18} />, label: 'Add Student', sub: 'Provision candidate account', color: 'indigo', onClick: onOpenAddStudent },
            ...(isSuperAdmin ? [
              { icon: <ShieldIcon size={18} />, label: 'Add Admin', sub: 'Developer Root Only', color: 'violet', onClick: onOpenAddAdmin },
            ] : []),
            { icon: <BookOpenIcon size={18} />, label: 'Manage Tests', sub: 'Configure test settings', color: 'emerald', onClick: () => onNavigateTab('tests') },
            { icon: <RefreshIcon size={18} />, label: 'System Reset', sub: 'Wipe sessions & restore', color: 'amber', onClick: () => onNavigateTab('settings') },
          ].map((qa) => (
            <button
              key={qa.label}
              onClick={qa.onClick}
              className={`group flex items-center gap-4 p-4 rounded-2xl border text-left transition-all cursor-pointer ${qa.color === 'indigo' ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/40' :
                  qa.color === 'violet' ? 'bg-violet-600/20 border-violet-500/30 text-violet-400 hover:bg-violet-600/40' :
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
          <button onClick={() => onNavigateTab('tests')} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors">
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
  );
};
