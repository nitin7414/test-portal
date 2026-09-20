import React, { Suspense } from 'react';
import { ErrorDisplayView } from '@/components/error/ErrorDisplayView';

export const metadata = {
  title: 'Error Diagnostic & Status Explorer — Test Portal',
  description: 'Examine HTTP error status codes, probable causes, and troubleshooting steps.',
};

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-sm font-bold text-slate-400">Loading Error Diagnostics...</span>
        </div>
      </div>
    }>
      <ErrorDisplayView initialCode={500} allowInteractiveCodeSwitch={true} />
    </Suspense>
  );
}
