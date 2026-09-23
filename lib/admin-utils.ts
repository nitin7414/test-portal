/**
 * Admin Utilities
 * Provides helpers for the admin panel: student management, test config, session reset, analytics.
 */

import { UserAccount } from '@/types/auth';
import { TestMetadata } from '@/types/exam';
import { getAllUsers, saveUsers, recordDeletedUser, deleteUserFromDatabase } from '@/lib/auth';
import { MOCK_TESTS } from '@/lib/mock-tests';
import { INITIAL_STUDENT_RESULTS } from '@/lib/student-history';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const STORAGE_RESULTS_KEY = 'tp_student_results_v1';
const STORAGE_TESTS_KEY   = 'tp_tests_config_v1';
const STORAGE_CUSTOM_TESTS_KEY = 'tp_custom_tests_v1';
const STORAGE_EXAM_KEYS   = ['tp_exam_session_', 'tp_answers_'];

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://formal-hummingbird-972.convex.cloud';
let convexHttpClient: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient | null {
  if (!convexHttpClient && typeof window !== 'undefined' && CONVEX_URL) {
    try {
      convexHttpClient = new ConvexHttpClient(CONVEX_URL);
    } catch (e) {
      console.warn('ConvexHttpClient init notice in admin-utils:', e);
    }
  }
  return convexHttpClient;
}

const DEMO_TEST_IDS = new Set([
  'test_se_2025',
  'test_frontend_2025',
  'test_graphs_2025',
  'test_dist_sys_2025',
]);

function broadcastTestUpdates(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('tp_tests_updated'));
  }
}

/* =========================================================================
   CLOUD DATABASE SYNC FOR ASSESSMENTS
   ========================================================================= */

/**
 * Push an assessment test to the Convex cloud database
 */
export async function syncTestToDatabase(test: TestMetadata): Promise<void> {
  if (DEMO_TEST_IDS.has(test.id)) return;
  try {
    const client = getConvexClient();
    if (!client) return;

    await client.mutation(api.tests.upsertTest, {
      testId: test.id,
      title: test.title,
      code: test.code,
      category: test.category,
      description: test.description,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks,
      passMarks: test.passMarks,
      totalQuestions: test.totalQuestions,
      instructions: test.instructions || [],
      sections: test.sections || [],
      status: test.status,
      scheduledDate: test.scheduledDate,
      scheduledTime: test.scheduledTime,
      targetAudience: test.targetAudience,
      assignedStudentIds: test.assignedStudentIds,
      createdAt: test.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Convex test push sync notice:', err);
  }
}

/**
 * Delete an assessment test from the Convex cloud database
 */
export async function deleteTestFromDatabase(testId: string): Promise<boolean> {
  try {
    const client = getConvexClient();
    if (!client) return true;
    await client.mutation(api.tests.deleteTest, { testId });
    return true;
  } catch (err) {
    console.warn('Convex test deletion notice:', err);
    return false;
  }
}

/**
 * Pull all assessment tests from Convex cloud database and synchronize locally.
 * Also uploads any locally stored tests that have not yet reached the cloud database.
 */
export async function syncTestsFromDatabase(): Promise<TestMetadata[]> {
  if (typeof window === 'undefined') return getAllTests();
  try {
    const client = getConvexClient();
    if (!client) return getAllTests();

    const cloudTests = await client.query(api.tests.listTests);
    const customRaw = localStorage.getItem(STORAGE_CUSTOM_TESTS_KEY);
    let customTests: TestMetadata[] = customRaw ? JSON.parse(customRaw) : [];
    let modified = false;

    // 1. Merge cloud tests into local cache
    if (cloudTests && cloudTests.length > 0) {
      for (const ct of cloudTests) {
        if (DEMO_TEST_IDS.has(ct.testId)) continue;
        const mappedTest: TestMetadata = {
          id: ct.testId,
          title: ct.title,
          code: ct.code,
          category: ct.category,
          description: ct.description,
          durationMinutes: ct.durationMinutes,
          totalMarks: ct.totalMarks,
          passMarks: ct.passMarks,
          totalQuestions: ct.totalQuestions,
          instructions: ct.instructions || [],
          sections: ct.sections || [],
          status: ct.status,
          scheduledDate: ct.scheduledDate,
          scheduledTime: ct.scheduledTime,
          targetAudience: ct.targetAudience,
          assignedStudentIds: ct.assignedStudentIds,
          createdAt: ct.createdAt || new Date().toISOString(),
        };

        const existingIdx = customTests.findIndex((t) => t.id === ct.testId);
        if (existingIdx >= 0) {
          customTests[existingIdx] = mappedTest;
          modified = true;
        } else {
          customTests.unshift(mappedTest);
          modified = true;
        }
      }
    }

    // 2. Upload any local custom tests to Convex cloud if missing from cloud
    const cloudTestIds = new Set((cloudTests || []).map((t) => t.testId));
    for (const lt of customTests) {
      if (!DEMO_TEST_IDS.has(lt.id) && !cloudTestIds.has(lt.id)) {
        syncTestToDatabase(lt).catch(() => {});
      }
    }

    if (modified) {
      localStorage.setItem(STORAGE_CUSTOM_TESTS_KEY, JSON.stringify(customTests));
      broadcastTestUpdates();
    }

    return getAllTests();
  } catch (err) {
    console.warn('Convex tests pull sync notice:', err);
    return getAllTests();
  }
}

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
  const users = getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    recordDeletedUser(target.id, target.email, target.studentId);
    deleteUserFromDatabase({
      userId: target.id,
      email: target.email,
      studentId: target.studentId,
    });
  }
  const remaining = users.filter((u) => u.id !== userId);
  saveUsers(remaining);
  return remaining;
}

/* =========================================================================
   ADMINISTRATOR MANAGEMENT
   ========================================================================= */

/** Suspend or reactivate an administrator account (protects primary developer admin) */
export function toggleAdminStatus(userId: string): UserAccount[] {
  if (userId === 'usr_admin_dev_001') return getAllUsers();
  const users = getAllUsers();
  const updated = users.map((u) =>
    u.id === userId
      ? { ...u, status: (u.status === 'active' ? 'suspended' : 'active') as 'active' | 'suspended' }
      : u
  );
  saveUsers(updated);
  return updated;
}

/** Permanently delete an administrator account (protects primary developer admin) */
export function deleteAdmin(userId: string): UserAccount[] {
  if (userId === 'usr_admin_dev_001') return getAllUsers();
  const users = getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    if (target.email.toLowerCase() === 'developer@testportal.com' || target.id === 'usr_admin_dev_001') {
      return users;
    }
    recordDeletedUser(target.id, target.email);
    deleteUserFromDatabase({
      userId: target.id,
      email: target.email,
    });
  }
  const remaining = users.filter((u) => u.id !== userId);
  saveUsers(remaining);
  return remaining;
}


/* =========================================================================
   TEST MANAGEMENT
   ========================================================================= */

/** Get all tests — dynamic tests stored in localStorage */
export function getAllTests(): TestMetadata[] {
  if (typeof window === 'undefined') return [];
  try {
    let customTests: TestMetadata[] = [];
    const customRaw = localStorage.getItem(STORAGE_CUSTOM_TESTS_KEY);
    if (customRaw) {
      customTests = JSON.parse(customRaw);
    }

    // Clean out demo seed tests if any remain in local storage
    customTests = customTests.filter((t) => !DEMO_TEST_IDS.has(t.id));

    const raw = localStorage.getItem(STORAGE_TESTS_KEY);
    const overrides: Record<string, Partial<TestMetadata>> = raw ? JSON.parse(raw) : {};

    const allBase = [...MOCK_TESTS, ...customTests].filter((t) => !DEMO_TEST_IDS.has(t.id));
    return allBase.map((t) =>
      overrides[t.id] ? { ...t, ...overrides[t.id] } : t
    );
  } catch {
    return [];
  }
}

/** Create and persist a newly uploaded / generated test */
export function createNewTest(newTest: TestMetadata): TestMetadata[] {
  if (typeof window === 'undefined') return [];
  try {
    const customRaw = localStorage.getItem(STORAGE_CUSTOM_TESTS_KEY);
    const customTests: TestMetadata[] = customRaw ? JSON.parse(customRaw) : [];
    const updated = [newTest, ...customTests.filter((t) => t.id !== newTest.id && !DEMO_TEST_IDS.has(t.id))];
    localStorage.setItem(STORAGE_CUSTOM_TESTS_KEY, JSON.stringify(updated));
    broadcastTestUpdates();

    // Immediately synchronize newly created test with Convex cloud database
    syncTestToDatabase(newTest).catch((err) => {
      console.warn('Convex background test upload notice:', err);
    });
  } catch (err) {
    console.error('Failed to save new test:', err);
  }
  return getAllTests();
}

/** Delete a test dynamically */
export function deleteTest(testId: string): TestMetadata[] {
  if (typeof window === 'undefined') return [];
  try {
    const customRaw = localStorage.getItem(STORAGE_CUSTOM_TESTS_KEY);
    if (customRaw) {
      const customTests: TestMetadata[] = JSON.parse(customRaw);
      const filtered = customTests.filter((t) => t.id !== testId && !DEMO_TEST_IDS.has(t.id));
      localStorage.setItem(STORAGE_CUSTOM_TESTS_KEY, JSON.stringify(filtered));
    }
    const raw = localStorage.getItem(STORAGE_TESTS_KEY);
    if (raw) {
      const overrides: Record<string, Partial<TestMetadata>> = JSON.parse(raw);
      delete overrides[testId];
      localStorage.setItem(STORAGE_TESTS_KEY, JSON.stringify(overrides));
    }
    broadcastTestUpdates();

    // Immediately remove from Convex cloud database
    deleteTestFromDatabase(testId).catch((err) => {
      console.warn('Convex background test deletion notice:', err);
    });
  } catch (err) {
    console.error('Failed to delete test:', err);
  }
  return getAllTests();
}

/** Persist a partial test override (e.g. status, durationMinutes) */
function saveTestOverride(testId: string, patch: Partial<TestMetadata>) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_TESTS_KEY);
    const overrides: Record<string, Partial<TestMetadata>> = raw ? JSON.parse(raw) : {};
    overrides[testId] = { ...(overrides[testId] || {}), ...patch };
    localStorage.setItem(STORAGE_TESTS_KEY, JSON.stringify(overrides));

    // Also update customTests if present
    const customRaw = localStorage.getItem(STORAGE_CUSTOM_TESTS_KEY);
    if (customRaw) {
      const customTests: TestMetadata[] = JSON.parse(customRaw);
      const idx = customTests.findIndex((t) => t.id === testId);
      if (idx >= 0) {
        customTests[idx] = { ...customTests[idx], ...patch };
        localStorage.setItem(STORAGE_CUSTOM_TESTS_KEY, JSON.stringify(customTests));
      }
    }

    broadcastTestUpdates();

    // Push update to Convex cloud database
    const client = getConvexClient();
    if (client) {
      if (patch.status) {
        client
          .mutation(api.tests.updateTestStatus, { testId, status: patch.status as any })
          .catch(() => {});
      }
      if (patch.durationMinutes) {
        client
          .mutation(api.tests.updateTestDuration, { testId, durationMinutes: patch.durationMinutes })
          .catch(() => {});
      }
      if (
        patch.scheduledDate !== undefined ||
        patch.scheduledTime !== undefined ||
        patch.targetAudience !== undefined ||
        patch.assignedStudentIds !== undefined
      ) {
        client
          .mutation(api.tests.updateTestScheduleAndAccess, {
            testId,
            scheduledDate: patch.scheduledDate,
            scheduledTime: patch.scheduledTime,
            targetAudience: patch.targetAudience as any,
            assignedStudentIds: patch.assignedStudentIds,
            status: patch.status as any,
            durationMinutes: patch.durationMinutes,
          })
          .catch(() => {});
      }
    }
  } catch {
    /* silent */
  }
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
    localStorage.removeItem(STORAGE_CUSTOM_TESTS_KEY);
    broadcastTestUpdates();
  }
  return [];
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
    localStorage.removeItem(STORAGE_CUSTOM_TESTS_KEY);
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
