/**
 * Admin Utilities
 * Provides helpers for the admin panel: student management, test config, session reset, analytics.
 */

import { UserAccount } from '@/types/auth';
import { TestMetadata } from '@/types/exam';
import { getAllUsers, saveUsers } from '@/lib/auth';
import { MOCK_TESTS } from '@/lib/mock-tests';
import { INITIAL_STUDENT_RESULTS } from '@/lib/student-history';

const STORAGE_RESULTS_KEY = 'tp_student_results_v1';
const STORAGE_TESTS_KEY   = 'tp_tests_config_v1';
const STORAGE_EXAM_KEYS   = ['tp_exam_session_', 'tp_answers_'];

/* =========================================================================
   STUDENT MANAGEMENT
   ========================================================================= */

/** Suspend or reactivate a student account */
export function toggleStudentStatus(userId: string): UserAccount[] {
  const users = getAllUsers();
  const updated = users.map((u) =>
    u.id === userId
      ? { ...u, status: (u.status === 'active' ? 'suspended' : 'active') as 'active' | 'suspended' }
      : u
  );
  saveUsers(updated);
  return updated;
}

/** Permanently delete a student account */
export function deleteStudent(userId: string): UserAccount[] {
  const users = getAllUsers().filter((u) => u.id !== userId);
  saveUsers(users);
  return users;
}

/* =========================================================================
   TEST MANAGEMENT
   ========================================================================= */

/** Get all tests — merges base mocks with any overrides stored in localStorage */
export function getAllTests(): TestMetadata[] {
  if (typeof window === 'undefined') return MOCK_TESTS;
  try {
    const raw = localStorage.getItem(STORAGE_TESTS_KEY);
    if (!raw) return MOCK_TESTS;
    const overrides: Record<string, Partial<TestMetadata>> = JSON.parse(raw);
    return MOCK_TESTS.map((t) =>
      overrides[t.id] ? { ...t, ...overrides[t.id] } : t
    );
  } catch {
    return MOCK_TESTS;
  }
}

/** Persist a partial test override (e.g. status, durationMinutes) */
function saveTestOverride(testId: string, patch: Partial<TestMetadata>) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_TESTS_KEY);
    const overrides: Record<string, Partial<TestMetadata>> = raw ? JSON.parse(raw) : {};
    overrides[testId] = { ...(overrides[testId] || {}), ...patch };
    localStorage.setItem(STORAGE_TESTS_KEY, JSON.stringify(overrides));
  } catch { /* silent */ }
}

/** Toggle a test's status between 'active', 'upcoming', 'archived' */
export function cycleTestStatus(testId: string): TestMetadata[] {
  const tests = getAllTests();
  const test = tests.find((t) => t.id === testId);
  if (!test) return tests;
  const next: Record<string, TestMetadata['status']> = {
    active: 'upcoming',
    upcoming: 'archived',
    archived: 'active',
  };
  const newStatus = next[test.status];
  saveTestOverride(testId, { status: newStatus });
  return getAllTests();
}

/** Update test duration */
export function updateTestDuration(testId: string, minutes: number): TestMetadata[] {
  saveTestOverride(testId, { durationMinutes: minutes });
  return getAllTests();
}

export interface TestSchedulePayload {
  scheduledDate?: string;
  scheduledTime?: string;
  targetAudience?: 'all' | 'specific';
  assignedStudentIds?: string[];
  status?: 'active' | 'upcoming' | 'archived';
  durationMinutes?: number;
}

/** Update scheduling date, time, status, and assigned students */
export function updateTestScheduleAndAccess(
  testId: string,
  payload: TestSchedulePayload
): TestMetadata[] {
  saveTestOverride(testId, payload);
  return getAllTests();
}

/** Check if a test is visible to a given student account */
export function isTestVisibleToStudent(
  test: TestMetadata,
  student?: { id?: string; studentId?: string; email?: string } | null
): boolean {
  if (!student) return true;
  if (!test.targetAudience || test.targetAudience === 'all') {
    return true;
  }
  const assigned = test.assignedStudentIds || [];
  if (assigned.length === 0) return true;
  return assigned.some(
    (key) =>
      (student.id && key.toLowerCase() === student.id.toLowerCase()) ||
      (student.studentId && key.toLowerCase() === student.studentId.toLowerCase()) ||
      (student.email && key.toLowerCase() === student.email.toLowerCase())
  );
}

/** Format scheduled date & time into a friendly string (e.g., 'Tue, Mar 25, 2025 at 10:00 AM') */
export function formatScheduledDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return 'Schedule TBD';
  try {
    let datePart = dateStr;
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      if (!isNaN(dateObj.getTime())) {
        datePart = dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }

    let timePart = '';
    if (timeStr) {
      const parts = timeStr.split(':').map(Number);
      const hours = parts[0];
      const minutes = parts[1];
      if (!isNaN(hours) && !isNaN(minutes)) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 === 0 ? 12 : hours % 12;
        const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
        timePart = ` at ${h12}:${mStr} ${period}`;
      } else {
        timePart = ` at ${timeStr}`;
      }
    }
    return `${datePart}${timePart}`;
  } catch {
    return `${dateStr}${timeStr ? ` at ${timeStr}` : ''}`;
  }
}

/** Reset all test overrides to defaults */
export function resetTestConfigs(): TestMetadata[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_TESTS_KEY);
  }
  return MOCK_TESTS;
}

/* =========================================================================
   SESSION & HISTORY MANAGEMENT
   ========================================================================= */

/** Clear all active exam sessions from localStorage */
export function clearAllExamSessions(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && STORAGE_EXAM_KEYS.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/** Clear all student result history */
export function clearAllResults(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_RESULTS_KEY);
}

/** Reset a single student's result history */
export function clearStudentResults(candidateId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_RESULTS_KEY);
    const all = raw ? JSON.parse(raw) : INITIAL_STUDENT_RESULTS;
    const filtered = all.filter((r: { candidateId: string }) => r.candidateId !== candidateId);
    localStorage.setItem(STORAGE_RESULTS_KEY, JSON.stringify(filtered));
  } catch { /* silent */ }
}

/** Full platform data reset: clears all results + exam sessions, restores initial configuration */
export function resetAllPortalData(): void {
  clearAllExamSessions();
  clearAllResults();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_TESTS_KEY);
  }
}
export const fullDemoReset = resetAllPortalData;

/* =========================================================================
   ANALYTICS AGGREGATION
   ========================================================================= */

export interface PortalStats {
  totalStudents: number;
  activeStudents: number;
  suspendedStudents: number;
  totalTests: number;
  activeTests: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
}

export function getPortalStats(): PortalStats {
  const users = getAllUsers();
  const students = users.filter((u) => u.role === 'student');
  const tests = getAllTests();

  let allResults: { percentage: number; isPassed: boolean }[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_RESULTS_KEY);
      allResults = raw ? JSON.parse(raw) : INITIAL_STUDENT_RESULTS;
    } catch {
      allResults = INITIAL_STUDENT_RESULTS;
    }
  } else {
    allResults = INITIAL_STUDENT_RESULTS;
  }

  const totalAttempts = allResults.length;
  const averageScore =
    totalAttempts > 0
      ? Math.round(
          (allResults.reduce((a, r) => a + r.percentage, 0) / totalAttempts) * 10
        ) / 10
      : 0;
  const passRate =
    totalAttempts > 0
      ? Math.round((allResults.filter((r) => r.isPassed).length / totalAttempts) * 1000) / 10
      : 0;

  return {
    totalStudents: students.length,
    activeStudents: students.filter((s) => s.status === 'active').length,
    suspendedStudents: students.filter((s) => s.status === 'suspended').length,
    totalTests: tests.length,
    activeTests: tests.filter((t) => t.status === 'active').length,
    totalAttempts,
    averageScore,
    passRate,
  };
}
