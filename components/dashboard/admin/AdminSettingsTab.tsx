'use client';

import React, { useState } from 'react';
import { AuthSession } from '@/types/auth';
import { PortalStats } from '@/lib/admin-utils';
import {
  ZapIcon,
  DatabaseIcon,
  AlertTriangleIcon,
} from '@/components/ui/Icons';

interface AdminSettingsTabProps {
  session: AuthSession;
  stats: PortalStats | null;
  isLoaded: boolean;
  onSystemAction: (action: string) => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  session,
  stats,
  isLoaded,
  onSystemAction,
}) => {
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);

  const handleAction = (action: string) => {
    onSystemAction(action);
    setResetConfirm(null);
  };

  return (
    <div className={`p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">System Settings</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Manage sessions, platform data, and system configuration</p>
      </div>

      {stats && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">Portal Information</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Admin Account', value: session.user.email },
              { label: 'Students', value: String(stats.totalStudents) },
              { label: 'Active Tests', value: String(stats.activeTests) },
              { label: 'Total Attempts', value: String(stats.totalAttempts) },
              { label: 'Pass Rate', value: `${stats.passRate}%` },
              { label: 'Avg Score', value: `${stats.averageScore}%` },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">{item.label}</p>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">System Actions</h3>
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
            <div key={sa.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{sa.icon}</div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">{sa.label}</p>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 max-w-sm leading-relaxed">{sa.sub}</p>
                </div>
              </div>
              {resetConfirm === sa.key ? (
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <span className="text-xs text-slate-400">Confirm?</span>
                  <button
                    onClick={() => handleAction(sa.key)}
                    className={`text-xs font-bold px-3 py-2 sm:py-1.5 rounded-lg cursor-pointer text-white active:scale-95 ${sa.color === 'amber' ? 'bg-amber-600 hover:bg-amber-500' :
                        sa.color === 'blue' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500'
                      }`}
                  >
                    Yes, Proceed
                  </button>
                  <button
                    onClick={() => setResetConfirm(null)}
                    className="text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 px-3 py-2 sm:py-1.5 rounded-lg cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResetConfirm(sa.key)}
                  className={`text-xs font-bold py-2 sm:py-1.5 px-3 rounded-lg shrink-0 cursor-pointer text-white w-full sm:w-auto text-center active:scale-95 ${sa.color === 'amber' ? 'bg-amber-600 hover:bg-amber-500' :
                      sa.color === 'blue' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500'
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
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Platform Access & Role Architecture</h3>
        <div className="space-y-3">
          <div className="bg-slate-800/60 rounded-xl p-4 space-y-2 border border-indigo-500/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Developer Administrator (Root)</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Sole Provisioner</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Exclusive developer account with master privileges. <strong>Only the developer admin can provision or manage new administrators.</strong> Also retains full rights to add students and configure tests.
            </p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 space-y-2 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-violet-400 uppercase tracking-wider">Standard Administrators</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700 text-slate-300">Staff / Faculty</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Provisioned administrators can manage exams, schedule tests, review candidate proctoring logs, and <strong>enroll students only</strong>. Standard admins cannot provision or manage other administrators.
            </p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 space-y-2 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Students (Candidates)</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700 text-slate-300">Examinees</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Provisioned student accounts can access candidate dashboard, sit for scheduled or assigned assessments, and review past test scores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
