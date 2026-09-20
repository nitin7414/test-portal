'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getErrorCodeDetail, ERROR_CODES_REGISTRY, ErrorCodeDetail } from '@/lib/error-codes';
import {
  AlertTriangleIcon, ShieldIcon, CheckCircleIcon, RefreshIcon,
  HomeIcon, CopyIcon, CheckIcon, ChevronDownIcon, WifiOffIcon, ArrowRightIcon
} from '@/components/ui/Icons';

interface ErrorDisplayViewProps {
  initialCode?: number | string;
  errorMessage?: string;
  errorDigest?: string;
  onReset?: () => void;
  allowInteractiveCodeSwitch?: boolean;
}

const COMMON_STATUS_CODES = [400, 401, 403, 404, 408, 429, 500, 502, 503, 504];

export function ErrorDisplayView({
  initialCode = 404,
  errorMessage,
  errorDigest,
  onReset,
  allowInteractiveCodeSwitch = true,
}: ErrorDisplayViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Resolve code from searchParams (?code=403 or ?status=500) if present
  const queryCode = searchParams?.get('code') || searchParams?.get('status');
  const effectiveInitial = queryCode || initialCode;

  const [currentCode, setCurrentCode] = useState<number | string>(effectiveInitial);
  const [copied, setCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [correlationId, setCorrelationId] = useState('');
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    // Generate persistent correlation ID per error session
    const id = `err_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    setCorrelationId(id);
    setTimestamp(new Date().toISOString());
  }, []);

  const detail: ErrorCodeDetail = getErrorCodeDetail(currentCode);

  const handleCopyReport = () => {
    const report = [
      '==================================================',
      `TEST PORTAL — ERROR REPORT [HTTP ${detail.code}]`,
      '==================================================',
      `Status Code     : ${detail.code} (${detail.name})`,
      `Category        : ${detail.category}`,
      `Correlation ID  : ${correlationId}`,
      `Timestamp       : ${timestamp}`,
      `Error Message   : ${errorMessage || detail.summary}`,
      `Error Digest    : ${errorDigest || 'N/A'}`,
      `User Agent      : ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      `Path            : ${typeof window !== 'undefined' ? window.location.pathname : 'N/A'}`,
      '--------------------------------------------------',
      'Probable Causes:',
      ...detail.probableCauses.map((c, i) => `  ${i + 1}. ${c}`),
      '--------------------------------------------------',
      'Recommended Steps:',
      ...detail.troubleshootingSteps.map((s, i) => `  ${i + 1}. ${s}`),
      '==================================================',
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleCustomCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customInput.trim(), 10);
    if (!isNaN(parsed) && parsed >= 100 && parsed <= 599) {
      setCurrentCode(parsed);
      setCustomInput('');
    }
  };

  const is5xx = detail.code >= 500 && detail.code < 600;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting glows */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[550px] rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-20"
        style={{ background: detail.glowColor }}
      />
      <div className="absolute -bottom-40 right-10 w-[500px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-md shadow-indigo-900/40">
            TP
          </div>
          <div>
            <span className="font-black text-base tracking-tight text-white block leading-none">Test Portal</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">Error Diagnostic Engine</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/offline"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <WifiOffIcon size={13} className="text-amber-400" />
            <span>Check Offline Page</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-900/40 transition-colors"
          >
            <HomeIcon size={14} />
            <span>Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 w-full z-10 flex-1">
        <div className="space-y-6">

          {/* Interactive Status Switcher (if enabled) */}
          {allowInteractiveCodeSwitch && (
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 backdrop-blur-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Status Code to Preview Probable Causes:
                </span>
                <form onSubmit={handleCustomCodeSubmit} className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={100}
                    max={599}
                    placeholder="Custom Code..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                  >
                    Go
                  </button>
                </form>
              </div>

              {/* Status Code Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {COMMON_STATUS_CODES.map((code) => {
                  const isActive = Number(currentCode) === code;
                  const item = ERROR_CODES_REGISTRY[code];
                  return (
                    <button
                      key={code}
                      onClick={() => setCurrentCode(code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-white text-slate-950 border-white shadow-lg shadow-white/10 scale-105'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{code}</span>
                      <span className={`ml-1.5 text-[10px] font-bold ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                        {item ? item.name.split(' ')[0] : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Central Error Card */}
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Top colored accent line */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${detail.accentGradient}`} />

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
              {/* Huge Glow Status Code Graphic */}
              <div className="relative shrink-0 flex flex-col items-center">
                <div className={`text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br ${detail.accentGradient} drop-shadow-2xl select-none`}>
                  {detail.code}
                </div>
                <span className={`mt-1 text-[11px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider ${detail.badgeColor}`}>
                  {detail.category}
                </span>
              </div>

              {/* Error Explanation Header */}
              <div className="space-y-3 text-center md:text-left flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {detail.name}
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  {errorMessage || detail.summary}
                </p>

                {errorDigest && (
                  <div className="inline-block p-2 rounded-lg bg-slate-800/80 border border-slate-700 font-mono text-[11px] text-slate-400">
                    Next.js Digest ID: <span className="text-indigo-300 font-bold">{errorDigest}</span>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
                  {onReset ? (
                    <button
                      onClick={onReset}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-900/40 transition-all cursor-pointer"
                    >
                      <RefreshIcon size={16} />
                      <span>Try Again</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') window.location.reload();
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-900/40 transition-all cursor-pointer"
                    >
                      <RefreshIcon size={16} />
                      <span>Reload Page</span>
                    </button>
                  )}

                  <Link
                    href="/"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition-all"
                  >
                    <HomeIcon size={16} />
                    <span>Return to Portal</span>
                  </Link>

                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    {copied ? <CheckIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} />}
                    <span>{copied ? 'Report Copied!' : 'Copy Error Report'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Probable Causes & Troubleshooting 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Probable Causes Breakdown Card */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                  is5xx ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  <AlertTriangleIcon size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Probable Causes</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Why this HTTP {detail.code} was returned</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-slate-300">
                {detail.probableCauses.map((cause, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5 ${
                      is5xx ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{cause}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Troubleshooting Steps Card */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircleIcon size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Recommended Troubleshooting</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Step-by-step remediation guide</p>
                </div>
              </div>

              <ol className="space-y-3 text-xs text-slate-300">
                {detail.troubleshootingSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold mt-0.5">
                      ✓
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Technical Diagnostics Accordion */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldIcon size={15} className="text-indigo-400" />
                <span>Technical Telemetry & Correlation Details</span>
              </div>
              <ChevronDownIcon size={16} className={`transition-transform duration-200 ${showDiagnostics ? 'rotate-180 text-white' : ''}`} />
            </button>

            {showDiagnostics && (
              <div className="p-5 border-t border-slate-800/80 bg-slate-950/60 space-y-3 font-mono text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Correlation Identifier</span>
                    <span className="text-slate-200 font-bold select-all">{correlationId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Event Timestamp</span>
                    <span className="text-slate-200">{timestamp}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">HTTP Status Code</span>
                    <span className="text-indigo-300 font-bold">{detail.code} ({detail.name})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Client Network Link</span>
                    <span className="text-emerald-400 font-bold">
                      {typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-slate-500 block text-[11px] mb-1">Runtime Error Trace</span>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-rose-300 overflow-x-auto text-[11px] whitespace-pre-wrap">
                      {errorMessage}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 z-10">
        <span>Test Portal Error Diagnostic Service • Correlation ID: {correlationId}</span>
        <div className="flex items-center gap-4">
          <Link href="/offline" className="hover:text-slate-400 transition-colors">Offline Fallback</Link>
          <Link href="/" className="hover:text-slate-400 transition-colors">Portal Home</Link>
        </div>
      </footer>
    </div>
  );
}
