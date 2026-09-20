'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  WifiOffIcon, WifiIcon, RefreshIcon, CheckCircleIcon, AlertTriangleIcon,
  ShieldIcon, ClockIcon, ArrowRightIcon, HomeIcon, CopyIcon, CheckIcon, KeyIcon
} from '@/components/ui/Icons';

export default function OfflineFallbackPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: 'success' | 'failed' | 'idle'; latencyMs?: number; message?: string }>({ status: 'idle' });
  const [secondsOffline, setSecondsOffline] = useState(0);
  const [copied, setCopied] = useState(false);
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    setTimestamp(new Date().toLocaleTimeString());
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOffline = () => {
      setIsOnline(false);
      setPingResult({ status: 'failed', message: 'Offline event fired by browser.' });
    };

    const handleOnline = () => {
      setIsOnline(true);
      setPingResult({ status: 'success', latencyMs: 12, message: 'Online link restored.' });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Timer for seconds offline
  useEffect(() => {
    if (isOnline) {
      setSecondsOffline(0);
      return;
    }

    const interval = setInterval(() => {
      setSecondsOffline((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const testConnection = async () => {
    setIsTesting(true);
    const start = performance.now();
    try {
      const res = await fetch(`/favicon.ico?_test=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      const latency = Math.round(performance.now() - start);

      if (res.ok || res.status < 500) {
        setIsOnline(true);
        setPingResult({
          status: 'success',
          latencyMs: latency,
          message: `Connection active! Latency: ${latency}ms to portal server.`,
        });
      } else {
        setPingResult({
          status: 'failed',
          message: `Server responded with unexpected status code ${res.status}.`,
        });
      }
    } catch (err: unknown) {
      setIsOnline(false);
      setPingResult({
        status: 'failed',
        message: 'Ping failed: Browser could not reach the host. Network link is still down.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyDiagnostics = () => {
    const data = [
      '==================================================',
      'TEST PORTAL — NETWORK DISCONNECTION REPORT',
      '==================================================',
      `Timestamp       : ${new Date().toISOString()}`,
      `Navigator Online: ${typeof navigator !== 'undefined' ? navigator.onLine : 'unknown'}`,
      `Local Time      : ${new Date().toLocaleString()}`,
      `User Agent      : ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      `Offline Duration: ${secondsOffline} seconds`,
      `Ping Status     : ${pingResult.status} (${pingResult.message || 'N/A'})`,
      'Local Storage   : Active (Candidate exam draft answers preserved)',
      '==================================================',
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-amber-500/10 via-rose-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-10 w-[500px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-md shadow-indigo-900/40">
            TP
          </div>
          <div>
            <span className="font-black text-base tracking-tight text-white block leading-none">Test Portal</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">Network Resilience Mode</span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isOnline 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
          }`}>
            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {isOnline ? 'Online Link Reconnected' : 'Offline Mode Active'}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 w-full z-10">
        <div className="space-y-6">

          {/* Central Hero Card */}
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden text-center backdrop-blur-xl">
            {/* Top warning ambient stripe */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
              isOnline 
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500' 
                : 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse'
            }`} />

            {/* Radar / Wi-Fi icon animation */}
            <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full ${isOnline ? 'bg-emerald-500/20' : 'bg-amber-500/20'} animate-ping opacity-30`} />
              <div className={`relative flex h-20 w-20 items-center justify-center rounded-3xl border shadow-xl ${
                isOnline 
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' 
                  : 'bg-slate-900 border-amber-500/40 text-amber-400'
              }`}>
                {isOnline ? <WifiIcon size={38} /> : <WifiOffIcon size={38} />}
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-300 mb-3">
              <ClockIcon size={13} className="text-amber-400" />
              {isOnline ? 'Connection Active' : `Offline for ${formatDuration(secondsOffline)}`}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {isOnline ? 'Connection Restored!' : 'Internet Connection Lost'}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mt-2">
              {isOnline
                ? 'Your device has re-established communication with the Test Portal servers. You can resume your activities safely.'
                : 'We cannot detect an active internet link from your device. Don’t panic: your assessment state is preserved.'}
            </p>

            {/* Test Connection Button & Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={testConnection}
                disabled={isTesting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-900/40 transition-all cursor-pointer disabled:opacity-60"
              >
                <RefreshIcon size={16} className={isTesting ? 'animate-spin' : ''} />
                <span>{isTesting ? 'Pinging Server...' : 'Test Connection Now'}</span>
              </button>

              <Link
                href="/"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition-all"
              >
                <HomeIcon size={16} />
                <span>Return to Portal</span>
              </Link>

              <button
                onClick={copyDiagnostics}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700/80 text-xs font-bold transition-all cursor-pointer"
              >
                {copied ? <CheckIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} />}
                <span>{copied ? 'Report Copied!' : 'Copy Telemetry'}</span>
              </button>
            </div>

            {/* Ping Feedback Badge */}
            {pingResult.status !== 'idle' && (
              <div className={`mt-5 p-3 rounded-xl border text-xs font-semibold max-w-md mx-auto ${
                pingResult.status === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}>
                {pingResult.message}
              </div>
            )}
          </div>

          {/* Local Safeguard Guarantee Box */}
          <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-5 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldIcon size={22} />
            </div>
            <div>
              <h2 className="text-sm font-black text-emerald-300">Exam Responses Are Fully Protected Locally</h2>
              <p className="text-xs text-emerald-400/90 mt-1 leading-relaxed">
                The assessment engine stores every selected question choice, timer tick, and proctoring checkpoint in secure browser storage in real time. Even if you lose internet connectivity for an extended period, <strong>your draft answers will NOT be erased or reset</strong>. When your connection recovers, all records will synchronize automatically.
              </p>
            </div>
          </div>

          {/* Probable Causes & Troubleshooting 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Probable Causes */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangleIcon size={18} />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Probable Causes</h2>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>Local Wi-Fi or Cable Drop:</strong> Your computer or router may have briefly disconnected from the local wireless access point.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>Captive Portal Login Required:</strong> Public, library, or campus Wi-Fi networks often require re-authenticating through a browser splash page.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>Airplane Mode or Power-Saving:</strong> The operating system may have put the network adapter into a low-power sleep state.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>DNS or ISP Outage:</strong> Upstream broadband provider or DNS servers may be experiencing temporary routing packet loss.</span>
                </li>
              </ul>
            </div>

            {/* Recommended Troubleshooting Actions */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <CheckCircleIcon size={18} />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Recommended Steps</h2>
              </div>
              <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside">
                <li className="leading-relaxed">
                  <strong>Do not close this browser tab:</strong> Keeping this window open maintains your active question state and exam timing.
                </li>
                <li className="leading-relaxed">
                  <strong>Verify your Wi-Fi or mobile hotspot:</strong> Toggle your device Wi-Fi off and on, or plug in an Ethernet cable.
                </li>
                <li className="leading-relaxed">
                  <strong>Open a new tab to test connectivity:</strong> Try visiting another domain (e.g. google.com) to verify if broad internet is functional.
                </li>
                <li className="leading-relaxed">
                  <strong>Click "Test Connection Now":</strong> Once signal is restored, click the test button above to trigger instant synchronization.
                </li>
              </ol>
            </div>
          </div>

          {/* Quick links to Error Showcase */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              <span className="font-bold text-slate-300">Need to inspect platform error codes?</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Explore detailed explanations for HTTP 400, 401, 403, 404, 429, 500, and 503.</p>
            </div>
            <Link
              href="/error"
              className="inline-flex items-center gap-1.5 font-bold text-indigo-400 hover:text-indigo-300 transition-colors self-start sm:self-auto"
            >
              <span>View Error Status Explorer</span>
              <ArrowRightIcon size={13} />
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 px-6 py-4 text-center text-xs text-slate-500 z-10">
        Test Portal Network Monitor • Local resilience active • {timestamp}
      </footer>
    </div>
  );
}
