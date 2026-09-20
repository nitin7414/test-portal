'use client';

import React, { useEffect } from 'react';
import { ErrorDisplayView } from '@/components/error/ErrorDisplayView';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Fatal Root Application Crash]:', error);
  }, [error]);

  return (
    <html lang="en" className="h-full bg-slate-950">
      <body className="min-h-full bg-slate-950 text-white font-sans antialiased m-0 p-0">
        <ErrorDisplayView
          initialCode={500}
          errorMessage={error?.message || 'A fatal root application error occurred.'}
          errorDigest={error?.digest}
          onReset={reset}
          allowInteractiveCodeSwitch={true}
        />
      </body>
    </html>
  );
}
