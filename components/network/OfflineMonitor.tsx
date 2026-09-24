'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WifiOffIcon, WifiIcon, RefreshIcon, AlertTriangleIcon, CheckCircleIcon, ArrowRightIcon } from '@/components/ui/Icons';
import { useExamStore } from '@/stores/examStore';

export function OfflineMonitor() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(10);

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined') {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      useExamStore.getState().setOffline(offline);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
      setReconnectCountdown(10);
      useExamStore.getState().setOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      useExamStore.getState().setOffline(false);
      // Keep wasOffline true for 4 seconds to show the green "Restored" toast
      setTimeout(() => {
        setWasOffline(false);
      }, 4000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Auto ping countdown when offline
  useEffect(() => {
    if (!isOffline) return;

    const timer = setInterval(() => {
      setReconnectCountdown((prev) => {
        if (prev <= 1) {
          checkConnection();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOffline]);

  const checkConnection = async () => {
    setIsPinging(true);
    try {
      // Bust cache to ensure live network check
      const res = await fetch(`/favicon.ico?_ping=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      if (res.ok || res.status < 500) {
        setIsOffline(false);
        useExamStore.getState().setOffline(false);
        setWasOffline(true);
        setTimeout(() => setWasOffline(false), 4000);
      }
    } catch {
      setIsOffline(true);
      useExamStore.getState().setOffline(true);
    } finally {
      setIsPinging(false);
    }
  };

  // If online and wasn't recently offline, render nothing
  if (!isOffline && !wasOffline) {
    return null;
  }

  // Connection Restored Toast
  if (!isOffline && wasOffline) {
    return (
      <aside 
        aria-label="Connection Status"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-950/95 border border-emerald-500/50 text-white shadow-2xl shadow-emerald-950/80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
          <CheckCircleIcon size={16} />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-300">Connection Restored</p>
          <p className="text-[11px] text-emerald-400/80">Local exam progress synchronized with portal.</p>
        </div>
      </aside>
    );
  }

  // Offline Notification Banner / Floating HUD
  return (
    <aside 
      aria-label="Connection Status"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 border border-amber-500/40 p-3 sm:p-4 shadow-2xl shadow-black/80 backdrop-blur-xl text-white">
        {/* Glowing warning line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <WifiOffIcon size={20} />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Internet Disconnected
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Answers Protected Locally
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                Auto-reconnecting in <strong className="text-amber-400">{reconnectCountdown}s</strong>. Do not close your browser.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={checkConnection}
              disabled={isPinging}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshIcon size={13} className={isPinging ? 'animate-spin text-amber-400' : ''} />
              <span>{isPinging ? 'Checking...' : 'Check Link'}</span>
            </button>
            <Link
              href="/offline"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold text-amber-300 transition-colors"
            >
              <span>Troubleshoot</span>
              <ArrowRightIcon size={12} />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
