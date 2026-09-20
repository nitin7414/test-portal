'use client';

import React, { Suspense, useEffect } from 'react';
import { ErrorDisplayView } from '@/components/error/ErrorDisplayView';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception for telemetry
    console.error('[Portal Runtime Exception]:', error);
  }, [error]);

  // Extract HTTP status code from message if present, or default to 500
  let code: number = 500;
  const match = error?.message?.match(/\b(400|401|403|404|408|429|500|502|503|504)\b/);
  if (match) {
    code = parseInt(match[1], 10);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ErrorDisplayView
        initialCode={code}
        errorMessage={error?.message || 'An unhandled application error occurred in the assessment runtime.'}
        errorDigest={error?.digest}
        onReset={reset}
        allowInteractiveCodeSwitch={true}
      />
    </Suspense>
  );
}
