import { TestResult } from '@/types/exam';

const STORAGE_RESULTS_KEY = 'tp_student_results_v1';

/**
 * Base mock results - cleared for fully dynamic operation.
 * All test results are now generated dynamically when students complete assessments.
 */
export const INITIAL_STUDENT_RESULTS: TestResult[] = [];

// Demo IDs to filter out from existing local storage so previous mock data is cleaned
const DEMO_TEST_IDS = new Set([
  'test_se_2025',
  'test_frontend_2025',
  'test_graphs_2025',
  'test_dist_sys_2025',
  'sess_stu_001_se',
  'sess_stu_001_fe',
  'sess_stu_001_gt',
  'sess_stu_001_ds',
]);

/**
 * Retrieve test results for a given student from localStorage.
 */
export function getStudentTestResults(studentId: string): TestResult[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_RESULTS_KEY);
    if (!raw) {
      return [];
    }
    const allResults: TestResult[] = JSON.parse(raw);
    // Filter out old demo seed data if previously stored
    const cleaned = allResults.filter(
      (r) =>
        !DEMO_TEST_IDS.has(r.testId) &&
        !DEMO_TEST_IDS.has(r.sessionId) &&
        r.candidateId === studentId
    );

    if (cleaned.length !== allResults.length) {
      localStorage.setItem(STORAGE_RESULTS_KEY, JSON.stringify(cleaned));
    }

    return cleaned;
  } catch (err) {
    console.error('Failed to read test results from localStorage:', err);
    return [];
  }
}

/**
 * Save a newly completed test result to localStorage and broadcast change event
 */
export function saveStudentTestResult(result: TestResult): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(STORAGE_RESULTS_KEY);
    const allResults: TestResult[] = raw ? JSON.parse(raw) : [];
    // Prepend to show most recent first
    const updated = [result, ...allResults.filter((r) => r.sessionId !== result.sessionId)];
    localStorage.setItem(STORAGE_RESULTS_KEY, JSON.stringify(updated));

    // Broadcast update across tabs and components
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('tp_results_updated'));
  } catch (err) {
    console.error('Failed to save test result to localStorage:', err);
  }
}

/**
 * Format duration helper: turns seconds into "Xm Ys"
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

/**
 * Retrieve a specific test result by its unique sessionId
 */
export function getTestResultBySessionId(sessionId: string): TestResult | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_RESULTS_KEY);
    if (!raw) return null;
    const allResults: TestResult[] = JSON.parse(raw);
    return allResults.find((r) => r.sessionId === sessionId) || null;
  } catch (err) {
    console.error('Failed to get test result by sessionId:', err);
    return null;
  }
}
