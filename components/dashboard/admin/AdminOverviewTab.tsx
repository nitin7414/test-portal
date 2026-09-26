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
    <div className={`p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-8 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 p-5 sm:p-7 shadow-xl shadow-indigo-900/30">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldIcon size={14} className="text-indigo-200" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-indigo-200">System Administrator</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            Welcome back, {session.user.name.split(' ')[0]}!
          </h1>
          <p className="text-indigo-200/80 text-xs sm:text-sm mt-1">Full administrative control over the Test Portal.</p>
        </div>
      </div>

      {/* KPI tiles */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {[
            { label: 'Total Students', value: stats.totalStudents, sub: `${stats.activeStudents} active`, icon: <UsersIcon size={16} className="text-indigo-400" />, g: 'from-indigo-500/20 to-blue-600/10', b: 'border-indigo-500/30' },
            { label: 'Total Tests', value: stats.totalTests, sub: `${stats.activeTests} live`, icon: <BookOpenIcon size={16} className="text-emerald-400" />, g: 'from-emerald-500/20 to-teal-600/10', b: 'border-emerald-500/30' },
            { label: 'Total Attempts', value: stats.totalAttempts, sub: 'All submissions', icon: <ZapIcon size={16} className="text-amber-400" />, g: 'from-amber-500/20 to-orange-600/10', b: 'border-amber-500/30' },
            { label: 'Avg Score', value: `${stats.averageScore}%`, sub: `${stats.passRate}% pass rate`, icon: <AwardIcon size={16} className="text-violet-400" />, g: 'from-violet-500/20 to-purple-600/10', b: 'border-violet-500/30' },
          ].map((k) => (
            <div key={k.label} className={`bg-gradient-to-br ${k.g} border ${k.b} rounded-xl sm:rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{k.label}</span>
                {k.icon}
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none">{k.value}</div>
                <div className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 mb-2.5">Quick Actions</h2>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-2.5 sm:gap-3`}>
          {[
            { icon: <UsersIcon size={17} />, label: 'Add Student', sub: 'Provision candidate account', color: 'indigo', onClick: onOpenAddStudent },
            ...(isSuperAdmin ? [
              { icon: <ShieldIcon size={17} />, label: 'Add Admin', sub: 'Developer Root Only', color: 'violet', onClick: onOpenAddAdmin },
            ] : []),
            { icon: <BookOpenIcon size={17} />, label: 'Manage Tests', sub: 'Configure test settings', color: 'emerald', onClick: () => onNavigateTab('tests') },
            { icon: <RefreshIcon size={17} />, label: 'System Reset', sub: 'Wipe sessions & restore', color: 'amber', onClick: () => onNavigateTab('settings') },
          ].map((qa) => (
            <button
              key={qa.label}
              onClick={qa.onClick}
              className={`group flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.99] ${qa.color === 'indigo' ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/40' :
                  qa.color === 'violet' ? 'bg-violet-600/20 border-violet-500/30 text-violet-400 hover:bg-violet-600/40' :
                    qa.color === 'emerald' ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40' :
                      'bg-amber-600/20 border-amber-500/30 text-amber-400 hover:bg-amber-600/40'
                }`}
            >
              <div className="shrink-0">{qa.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-white truncate">{qa.label}</p>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">{qa.sub}</p>
              </div>
              <ChevronRightIcon size={14} className="ml-auto text-slate-500 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Tests at a glance */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">Tests at a Glance</h2>
          <button onClick={() => onNavigateTab('tests')} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors">
            View All <ArrowRightIcon size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {tests.slice(0, 4).map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:px-4 sm:py-3 hover:border-slate-700 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-white truncate">{t.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{t.totalQuestions} Qs · {t.durationMinutes}m · {t.totalMarks} marks</p>
              </div>
              <span className={`text-[9px] sm:text-[10px] font-bold border px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shrink-0 capitalize ${STATUS_COLORS[t.status]}`}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
