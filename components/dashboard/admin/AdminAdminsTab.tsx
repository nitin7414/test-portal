'use client';

import React, { useState, useEffect } from 'react';
import { UserAccount, AuthSession } from '@/types/auth';
import {
  createAdminAccount,
  generateSecureTemporaryPassword,
} from '@/lib/auth';
import {
  ShieldIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UserIcon,
  MailIcon,
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

interface CreatedAdminData {
  name: string;
  email: string;
  password: string;
}

interface AdminAdminsTabProps {
  session: AuthSession;
  admins: UserAccount[];
  isLoaded: boolean;
  isSuperAdmin: boolean;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  onToggleAdminStatus: (adminId: string) => void;
  onDeleteAdmin: (adminId: string, name: string) => void;
  onNavigateOverview: () => void;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminAdminsTab: React.FC<AdminAdminsTabProps> = ({
  session,
  admins,
  isLoaded,
  isSuperAdmin,
  showAddModal,
  setShowAddModal,
  onToggleAdminStatus,
  onDeleteAdmin,
  onNavigateOverview,
  onRefresh,
  showToast,
}) => {
  const [adminSearch, setAdminSearch] = useState('');

  const filteredAdmins = admins.filter((a) =>
    a.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
    a.email.toLowerCase().includes(adminSearch.toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/20 border border-amber-500/30 text-amber-400 mx-auto">
          <ShieldIcon size={32} />
        </div>
        <h3 className="text-xl font-black text-white">Developer Administrator Access Only</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Only the primary Developer Administrator is authorized to provision or manage platform administrators. Standard administrators can manage tests and enroll students.
        </p>
        <button
          onClick={onNavigateOverview}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all cursor-pointer inline-flex items-center gap-2"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  return (
    <div className={`p-6 lg:p-8 space-y-6 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Administrator Management</h2>
          <p className="text-sm text-slate-400 mt-0.5">Provision and manage administrator credentials with platform control</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-violet-900/30 transition-all cursor-pointer"
        >
          <PlusIcon size={15} />
          Add Administrator
        </button>
      </div>

      <div className="relative">
        <SearchIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search administrators by name or email..."
          value={adminSearch}
          onChange={(e) => setAdminSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
        />
      </div>

      <div className="space-y-3">
        {filteredAdmins.length === 0 && (
          <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800">
            <ShieldIcon size={36} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 font-semibold">No administrators found</p>
          </div>
        )}
        {filteredAdmins.map((a) => (
          <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 font-bold text-sm shrink-0">
                {a.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-white">{a.name}</p>
                  {a.id === 'usr_admin_dev_001' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Developer Root
                    </span>
                  )}
                  <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[a.status]}`}>
                    {a.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">{a.email}</p>
                <p className="text-[11px] font-mono text-slate-500">
                  Joined {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {a.id !== 'usr_admin_dev_001' ? (
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => onToggleAdminStatus(a.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${a.status === 'active'
                      ? 'bg-rose-950 border-rose-700 text-rose-400 hover:bg-rose-900'
                      : 'bg-emerald-950 border-emerald-700 text-emerald-400 hover:bg-emerald-900'
                    }`}
                >
                  {a.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button
                  onClick={() => onDeleteAdmin(a.id, a.name)}
                  className="text-xs font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-700 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <TrashIcon size={13} />
                </button>
              </div>
            ) : (
              <div className="text-[11px] font-medium text-slate-500 italic px-2 py-1 bg-slate-800/50 rounded-lg border border-slate-800">
                Protected Root Admin
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddModal && isSuperAdmin && (
        <AddAdminModal
          requesterId={session.user.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => { onRefresh(); showToast(msg); }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
    </div>
  );
};

/* ======================================================
   ADD ADMIN MODAL
   ====================================================== */
const AddAdminModal: React.FC<{
  requesterId?: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ requesterId, onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdAdmin, setCreatedAdmin] = useState<CreatedAdminData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Initialize strong default password
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      password: prev.password || generateSecureTemporaryPassword(),
    }));
  }, []);

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
    if (!createdAdmin) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const formatted = [
      '==================================================',
      'TEST PORTAL — ADMINISTRATOR ACCESS CREDENTIALS',
      '==================================================',
      `Administrator Name : ${createdAdmin.name}`,
      `Admin Email        : ${createdAdmin.email}`,
      `Access Role        : Administrator (Tests & Students Management)`,
      `Password           : ${createdAdmin.password}`,
      `Portal Address     : ${origin}`,
      '--------------------------------------------------',
      'Instructions: Navigate to the portal URL, choose Administrator role,',
      'and sign in with your email and password. You will have privileges',
      'to configure tests, schedule exams, and enroll new students.',
      'Note: Only the primary Developer Administrator is authorized to provision new admins.',
      '==================================================',
    ].join('\n');

    copyToClipboard(formatted, 'package');
  };

  const handleResetForAnother = () => {
    setCreatedAdmin(null);
    setValidationError(null);
    setShowPassword(false);
    setForm({
      name: '',
      email: '',
      password: generateSecureTemporaryPassword(),
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password.trim();

    if (!name || !email || !password) {
      setValidationError('Please fill in all administrator credential fields.');
      return;
    }

    if (name.length < 2) {
      setValidationError('Administrator name must be at least 2 characters long.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid administrator email address.');
      return;
    }

    if (password.length < 8) {
      setValidationError('Administrator password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = createAdminAccount(name, email, password, requesterId);
      setIsLoading(false);

      if (res.success && res.account) {
        onSuccess(res.message);
        setCreatedAdmin({
          name: res.account.name,
          email: res.account.email,
          password: password,
        });
      } else {
        setValidationError(res.message);
        onError(res.message);
      }
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" data-lenis-prevent="true">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600/20 border border-violet-500/30 text-violet-400 font-bold">
              <ShieldIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {createdAdmin ? 'Administrator Account Provisioned' : 'Add Administrator'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {createdAdmin ? 'Credentials ready for distribution' : 'Grant test management & student enrollment privileges'}
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
          {createdAdmin ? (
            <div className="space-y-5 py-1">
              <div className="p-4 rounded-2xl bg-violet-950/40 border border-violet-500/30 flex items-start gap-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 shrink-0 mt-0.5">
                  <CheckCircleIcon size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-violet-300">New Administrator Created</h4>
                  <p className="text-xs text-violet-400/90 mt-0.5 leading-relaxed">
                    <strong className="text-white">{createdAdmin.name}</strong> now has administrator permissions to configure exams, review proctoring and results, and enroll students. (Note: Only Developer Administrator can add new admins.)
                  </p>
                </div>
              </div>

              {/* CREDENTIALS DISPLAY */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin Credentials</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400">Admin Role</span>
                </div>

                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px] mb-0.5">Full Name</span>
                    <span className="font-bold text-white text-sm">{createdAdmin.name}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Admin Login Email</span>
                      <span className="font-mono text-slate-200 text-xs truncate max-w-[220px] block">{createdAdmin.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdAdmin.email, 'email')}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'email' ? <CheckIcon size={12} className="text-emerald-400" /> : <CopyIcon size={12} />}
                      <span>{copiedKey === 'email' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Administrator Password</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {showPassword ? createdAdmin.password : '••••••••••••'}
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
                        onClick={() => copyToClipboard(createdAdmin.password, 'pass')}
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
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-violet-900/30 transition-all cursor-pointer text-sm"
                >
                  {copiedKey === 'package' ? (
                    <>
                      <CheckIcon size={16} className="text-emerald-300" />
                      <span>Copied Full Admin Credentials Package!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon size={16} />
                      <span>Copy Admin Credentials Package</span>
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

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <UserIcon size={13} className="text-violet-400" />
                  <span>Administrator Full Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Marcus Vance"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <MailIcon size={13} className="text-violet-400" />
                  <span>Administrator Email Address</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. marcus.vance@testportal.com"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Initial Administrator Password
                  </label>
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <SparklesIcon size={11} />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-4 pr-11 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
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
                <p className="text-[11px] text-slate-500 mt-1">Admin accounts receive full system rights. Password is hashed with bcrypt (10 rounds).</p>
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
                  className="w-2/3 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg shadow-violet-900/30 transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Provisioning Admin...</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon size={16} />
                      <span>Create Administrator</span>
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
