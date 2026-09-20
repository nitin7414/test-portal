import React, { Suspense } from 'react';
import { ErrorDisplayView } from '@/components/error/ErrorDisplayView';

export const metadata = {
  title: '404 Page Not Found — Test Portal',
  description: 'The requested portal resource, exam session, or page could not be located.',
};

export default function NotFound() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ErrorDisplayView
        initialCode={404}
        errorMessage="The requested assessment page, student result session, or administrative endpoint could not be found."
        allowInteractiveCodeSwitch={true}
      />
    </Suspense>
  );
}
