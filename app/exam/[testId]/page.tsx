'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getActiveSession } from '@/lib/auth';
import { getAllTests, isTestVisibleToStudent } from '@/lib/admin-utils';
import { AuthSession } from '@/types/auth';
import { ExamEngine } from '@/components/exam/ExamEngine';
import { Button } from '@/components/ui/Button';
import { AlertCircleIcon, ChevronLeftIcon } from '@/components/ui/Icons';

export default function ExamSessionPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params?.testId as string;

  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const active = getActiveSession();
    if (!active) {
      router.push('/');
      return;
    }
    setSession(active);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Initializing Secure Exam Session...
          </p>
        </div>
      </div>
    );
  }

  // Find test metadata from active configurations
  const allTests = getAllTests();
  const test = allTests.find((t) => t.id === testId);

  if (!test) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm space-y-4">
          <AlertCircleIcon size={36} className="text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Assessment Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Could not find an assessment matching code <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{testId}</code>.
          </p>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => router.push('/')}
            leftIcon={<ChevronLeftIcon size={16} />}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Access control check: Is this student authorized to take this assessment?
  if (session && !isTestVisibleToStudent(test, session.user)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm space-y-4">
          <AlertCircleIcon size={36} className="text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This assessment is scheduled for specific candidates only. Your account (<span className="font-medium text-slate-800">{session.user.email}</span>) is not on the authorized roster for this test.
          </p>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => router.push('/')}
            leftIcon={<ChevronLeftIcon size={16} />}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ExamEngine
      test={test}
      studentId={session?.user.id || 'usr_stu_001'}
      candidateName={session?.user.name || 'Alex Morgan'}
    />
  );
}
