import React, { Suspense } from 'react';
import { ErrorDisplayView } from '@/components/error/ErrorDisplayView';
import { getErrorCodeDetail } from '@/lib/error-codes';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  const detail = getErrorCodeDetail(resolvedParams.code);
  return {
    title: `${detail.code} ${detail.name} — Test Portal Error Diagnostic`,
    description: detail.summary,
  };
}

export default async function DynamicErrorPage({ params }: PageProps) {
  const resolvedParams = await params;
  const parsedCode = parseInt(resolvedParams.code, 10);
  const validCode = isNaN(parsedCode) ? 500 : parsedCode;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-sm font-bold text-slate-400">Loading Error Diagnostics...</span>
        </div>
      </div>
    }>
      <ErrorDisplayView initialCode={validCode} allowInteractiveCodeSwitch={true} />
    </Suspense>
  );
}
