'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useExamStore } from '@/stores/examStore';

export interface LiveAttemptState {
  attemptId: string;
  testId: string;
  studentId: string;
  candidateName?: string;
  startedAt: number;
  durationSeconds: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  submittedAt?: number;
  tabSwitchLog: number[];
  autoSubmitted: boolean;
}

const STORAGE_ATTEMPTS_KEY = 'tp_convex_sim_attempts_v1';
const STORAGE_ANSWERS_KEY = 'tp_convex_sim_answers_v1';

/**
 * Event emitter for local reactive subscriptions when Convex is in local mode
 */
type Listener = () => void;
const listeners = new Set<Listener>();
function notifySubscribers() {
  listeners.forEach((l) => l());
}

/**
 * Hook to interface with Attempt lifecycle (Live Convex or Fallback Engine)
 */
export function useAttemptLifecycle(testId: string, studentId: string, durationSeconds: number, candidateName?: string) {
  const [attempt, setAttempt] = useState<LiveAttemptState | null>(null);
  const [loading, setLoading] = useState(true);
  const scheduledTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Authoritative auto-submit
  const handleAutoSubmit = useCallback((attemptId: string) => {
    try {
      const raw = localStorage.getItem(STORAGE_ATTEMPTS_KEY);
      if (!raw) return;
      const attempts: LiveAttemptState[] = JSON.parse(raw);
      const target = attempts.find((a) => a.attemptId === attemptId);
      if (target && target.status === 'IN_PROGRESS') {
        target.status = 'SUBMITTED';
        target.submittedAt = Date.now();
        target.autoSubmitted = true;
        localStorage.setItem(STORAGE_ATTEMPTS_KEY, JSON.stringify(attempts));
        setAttempt({ ...target });
        notifySubscribers();
      }
    } catch (err) {
      console.error('Auto-submit execution failed:', err);
    }
  }, []);

  // Initialize or resume attempt
  useEffect(() => {
    if (!testId || !studentId) return;

    const initAttempt = () => {
      try {
        const raw = localStorage.getItem(STORAGE_ATTEMPTS_KEY);
        const attempts: LiveAttemptState[] = raw ? JSON.parse(raw) : [];

        // Check for active IN_PROGRESS attempt
        let current = attempts.find(
          (a) => a.studentId === studentId && a.testId === testId && a.status === 'IN_PROGRESS'
        );

        if (current) {
          // Check if time has already expired while away
          const elapsed = (Date.now() - current.startedAt) / 1000;
          if (elapsed >= current.durationSeconds) {
            current.status = 'SUBMITTED';
            current.submittedAt = current.startedAt + current.durationSeconds * 1000;
            current.autoSubmitted = true;
            localStorage.setItem(STORAGE_ATTEMPTS_KEY, JSON.stringify(attempts));
          } else {
            useExamStore.getState().showResumeBanner = true;
          }
        } else {
          // Create new authoritative attempt
          const now = Date.now();
          current = {
            attemptId: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            testId,
            studentId,
            candidateName: candidateName || 'Alex Morgan',
            startedAt: now,
            durationSeconds,
            status: 'IN_PROGRESS',
            tabSwitchLog: [],
            autoSubmitted: false,
          };
          attempts.push(current);
          localStorage.setItem(STORAGE_ATTEMPTS_KEY, JSON.stringify(attempts));
        }

        setAttempt({ ...current });
        setLoading(false);

        // Schedule authoritative server/background auto-submit
        if (current.status === 'IN_PROGRESS') {
          const remainingMs = Math.max(0, current.durationSeconds * 1000 - (Date.now() - current.startedAt));
          if (scheduledTimerRef.current) clearTimeout(scheduledTimerRef.current);
          scheduledTimerRef.current = setTimeout(() => {
            handleAutoSubmit(current!.attemptId);
          }, remainingMs);
        }
      } catch (err) {
        console.error('Failed to initialize attempt:', err);
        setLoading(false);
      }
    };

    initAttempt();

    const onChange = () => {
      const raw = localStorage.getItem(STORAGE_ATTEMPTS_KEY);
      if (raw) {
        const attempts: LiveAttemptState[] = JSON.parse(raw);
        const found = attempts.find((a) => a.studentId === studentId && a.testId === testId);
        if (found) setAttempt({ ...found });
      }
    };

    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
      if (scheduledTimerRef.current) clearTimeout(scheduledTimerRef.current);
    };
  }, [testId, studentId, durationSeconds, candidateName, handleAutoSubmit]);

  // Manual submit
  const submitAttempt = useCallback(async () => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    try {
      const raw = localStorage.getItem(STORAGE_ATTEMPTS_KEY);
      if (!raw) return;
      const attempts: LiveAttemptState[] = JSON.parse(raw);
      const target = attempts.find((a) => a.attemptId === attempt.attemptId);
      if (target) {
        target.status = 'SUBMITTED';
        target.submittedAt = Date.now();
        target.autoSubmitted = false;
        localStorage.setItem(STORAGE_ATTEMPTS_KEY, JSON.stringify(attempts));
        setAttempt({ ...target });
        notifySubscribers();
      }
    } catch (err) {
      console.error('Submit execution failed:', err);
    }
  }, [attempt]);

  // Log tab switch event
  const logTabSwitch = useCallback(async () => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    try {
      const raw = localStorage.getItem(STORAGE_ATTEMPTS_KEY);
      if (!raw) return;
      const attempts: LiveAttemptState[] = JSON.parse(raw);
      const target = attempts.find((a) => a.attemptId === attempt.attemptId);
      if (target) {
        target.tabSwitchLog = [...(target.tabSwitchLog || []), Date.now()];
        localStorage.setItem(STORAGE_ATTEMPTS_KEY, JSON.stringify(attempts));
        setAttempt({ ...target });
        notifySubscribers();
      }
    } catch (err) {
      console.error('Log tab switch failed:', err);
    }
  }, [attempt]);

  return {
    attempt,
    loading,
    submitAttempt,
    logTabSwitch,
  };
}

/**
 * Hook to interface with debounced Answer autosave
 */
export function useAnswerSync(attemptId?: string) {
  const setSyncStatus = useExamStore((state) => state.setSyncStatus);
  const hydrateAnswers = useExamStore((state) => state.hydrateAnswers);
  const debounceTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Hydrate answers on mount / attemptId change
  useEffect(() => {
    if (!attemptId) return;

    try {
      const raw = localStorage.getItem(STORAGE_ANSWERS_KEY);
      if (raw) {
        const allAnswers: Array<{ attemptId: string; questionId: string; selectedOptionId: string }> = JSON.parse(raw);
        const filtered = allAnswers.filter((a) => a.attemptId === attemptId);
        if (filtered.length > 0) {
          hydrateAnswers(filtered);
        }
      }
    } catch (err) {
      console.error('Failed to hydrate answers:', err);
    }
  }, [attemptId, hydrateAnswers]);

  // Debounced save mutation
  const saveAnswer = useCallback(
    (questionId: string, selectedOptionId: string) => {
      if (!attemptId) return;

      // Clear any pending debounce for this question
      if (debounceTimerRef.current[questionId]) {
        clearTimeout(debounceTimerRef.current[questionId]);
      }

      setSyncStatus('saving');

      // 600ms debounce before committing to persistent storage
      debounceTimerRef.current[questionId] = setTimeout(() => {
        try {
          const raw = localStorage.getItem(STORAGE_ANSWERS_KEY);
          const allAnswers: Array<{
            attemptId: string;
            questionId: string;
            selectedOptionId: string;
            savedAt: number;
          }> = raw ? JSON.parse(raw) : [];

          // Compound index upsert
          const existingIdx = allAnswers.findIndex(
            (a) => a.attemptId === attemptId && a.questionId === questionId
          );

          if (existingIdx >= 0) {
            allAnswers[existingIdx].selectedOptionId = selectedOptionId;
            allAnswers[existingIdx].savedAt = Date.now();
          } else {
            allAnswers.push({
              attemptId,
              questionId,
              selectedOptionId,
              savedAt: Date.now(),
            });
          }

          localStorage.setItem(STORAGE_ANSWERS_KEY, JSON.stringify(allAnswers));
          setSyncStatus('saved');
        } catch (err) {
          console.error('Failed to save answer:', err);
          setSyncStatus('idle');
        }
      }, 600);
    },
    [attemptId, setSyncStatus]
  );

  return { saveAnswer };
}
