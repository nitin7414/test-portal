import { TestResult } from '@/types/exam';

const STORAGE_RESULTS_KEY = 'tp_student_results_v1';

export const INITIAL_STUDENT_RESULTS: TestResult[] = [
  {
    sessionId: 'sess_stu_001_se',
    testId: 'test_se_2025',
    testTitle: 'Software Engineering & Algorithmic Reasoning',
    topic: 'Algorithms & Computational Complexity',
    category: 'Computer Science',
    candidateId: 'usr_stu_001',
    candidateName: 'Alex Morgan',
    totalScore: 32,
    maxScore: 40,
    percentage: 80,
    accuracy: 85,
    percentile: 94.2,
    isPassed: true,
    timeTakenSeconds: 1460, // 24m 20s
    totalTimeSeconds: 1800, // 30m
    submittedAt: '2025-02-26T14:32:00.000Z',
    sections: [
      {
        sectionId: 'sec_logic',
        sectionTitle: 'Section A: Algorithms & Logic',
        totalQuestions: 5,
        attemptedQuestions: 5,
        correctQuestions: 4,
        incorrectQuestions: 1,
        unansweredQuestions: 0,
        score: 15,
        maxScore: 20,
        accuracy: 80,
      },
      {
        sectionId: 'sec_arch',
        sectionTitle: 'Section B: Systems & Architecture',
        totalQuestions: 5,
        attemptedQuestions: 5,
        correctQuestions: 4,
        incorrectQuestions: 0,
        unansweredQuestions: 1,
        score: 17,
        maxScore: 20,
        accuracy: 90,
      },
    ],
    questions: [
      {
        questionId: 'q_01',
        sectionId: 'sec_logic',
        prompt: 'What is the worst-case time complexity of finding an element in a balanced Binary Search Tree (AVL / Red-Black Tree) containing N elements?',
        type: 'single-choice',
        options: [
          { id: 'opt_1_a', text: 'O(1)' },
          { id: 'opt_1_b', text: 'O(log N)' },
          { id: 'opt_1_c', text: 'O(N)' },
          { id: 'opt_1_d', text: 'O(N log N)' },
        ],
        userSelectedOptionIds: ['opt_1_b'],
        correctOptionIds: ['opt_1_b'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 45,
        explanation: 'In a self-balancing binary search tree such as an AVL or Red-Black Tree, the tree height is bounded by O(log N). Thus search operations run in O(log N) worst-case time.',
        status: 'answered',
      },
      {
        questionId: 'q_02',
        sectionId: 'sec_logic',
        prompt: 'Examine the recursive algorithm snippet. What will be returned for `f(5)`?',
        type: 'single-choice',
        options: [
          { id: 'opt_2_a', text: '15' },
          { id: 'opt_2_b', text: '120' },
          { id: 'opt_2_c', text: '24' },
          { id: 'opt_2_d', text: '8' },
        ],
        userSelectedOptionIds: ['opt_2_a'],
        correctOptionIds: ['opt_2_a'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 68,
        explanation: 'Step 1: f(5) = 5 * f(3). Step 2: f(3) = 3 * f(1). Step 3: f(1) = 1. Result = 5 * 3 * 1 = 15.',
        status: 'answered',
      },
      {
        questionId: 'q_03',
        sectionId: 'sec_logic',
        prompt: 'Which of the following sorting algorithms have an average-case time complexity of O(N log N)?',
        type: 'multiple-choice',
        options: [
          { id: 'opt_3_a', text: 'Merge Sort' },
          { id: 'opt_3_b', text: 'Quick Sort' },
          { id: 'opt_3_c', text: 'Heap Sort' },
          { id: 'opt_3_d', text: 'Bubble Sort' },
        ],
        userSelectedOptionIds: ['opt_3_a', 'opt_3_b', 'opt_3_c'],
        correctOptionIds: ['opt_3_a', 'opt_3_b', 'opt_3_c'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 90,
        explanation: 'Merge Sort, Quick Sort, and Heap Sort all provide O(N log N) average-case time complexity.',
        status: 'answered',
      },
      {
        questionId: 'q_04',
        sectionId: 'sec_logic',
        prompt: 'Given an undirected graph with 7 vertices where each vertex has a degree of 4, how many total edges are present in the graph?',
        type: 'numerical',
        userNumericalAnswer: 12,
        userSelectedOptionIds: [],
        correctOptionIds: [],
        isCorrect: false,
        isPartial: false,
        marksAwarded: 0,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 120,
        explanation: 'By the Handshaking Lemma: Sum of degrees = 2 * (Number of edges). Total degree sum = 7 * 4 = 28. Therefore, edges = 28 / 2 = 14. (User entered 12).',
        status: 'answered',
      },
      {
        questionId: 'q_05',
        sectionId: 'sec_logic',
        prompt: 'Which data structure is optimal for implementing Breadth-First Search (BFS) on an unweighted graph?',
        type: 'single-choice',
        options: [
          { id: 'opt_5_a', text: 'LIFO Stack' },
          { id: 'opt_5_b', text: 'FIFO Queue' },
          { id: 'opt_5_c', text: 'Priority Queue (Min-Heap)' },
          { id: 'opt_5_d', text: 'Disjoint Set Union (DSU)' },
        ],
        userSelectedOptionIds: ['opt_5_b'],
        correctOptionIds: ['opt_5_b'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 35,
        explanation: 'BFS explores neighbor vertices in concentric waves, requiring a First-In, First-Out (FIFO) Queue.',
        status: 'answered',
      },
      {
        questionId: 'q_06',
        sectionId: 'sec_arch',
        prompt: 'Which HTTP status code must be returned by an API when a request is syntactically valid but cannot be processed due to semantic validation rules?',
        type: 'single-choice',
        options: [
          { id: 'opt_6_a', text: '400 Bad Request' },
          { id: 'opt_6_b', text: '422 Unprocessable Entity' },
          { id: 'opt_6_c', text: '403 Forbidden' },
          { id: 'opt_6_d', text: '500 Internal Server Error' },
        ],
        userSelectedOptionIds: ['opt_6_b'],
        correctOptionIds: ['opt_6_b'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 50,
        explanation: 'RFC 9110 specifies 422 Unprocessable Entity when request syntax is correct but semantics fail.',
        status: 'answered',
      },
      {
        questionId: 'q_07',
        sectionId: 'sec_arch',
        prompt: 'Which of the following database isolation levels prevent "Non-Repeatable Reads" according to ANSI SQL standards?',
        type: 'multiple-choice',
        options: [
          { id: 'opt_7_a', text: 'Read Committed' },
          { id: 'opt_7_b', text: 'Repeatable Read' },
          { id: 'opt_7_c', text: 'Serializable' },
          { id: 'opt_7_d', text: 'Read Uncommitted' },
        ],
        userSelectedOptionIds: ['opt_7_b', 'opt_7_c'],
        correctOptionIds: ['opt_7_b', 'opt_7_c'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 75,
        explanation: 'Repeatable Read and Serializable levels prevent non-repeatable read anomalies.',
        status: 'answered',
      },
      {
        questionId: 'q_08',
        sectionId: 'sec_arch',
        prompt: 'In the CAP theorem for distributed systems, what does the "P" represent?',
        type: 'single-choice',
        options: [
          { id: 'opt_8_a', text: 'Performance' },
          { id: 'opt_8_b', text: 'Partition Tolerance' },
          { id: 'opt_8_c', text: 'Persistent Storage' },
          { id: 'opt_8_d', text: 'Parallel Processing' },
        ],
        userSelectedOptionIds: ['opt_8_b'],
        correctOptionIds: ['opt_8_b'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 30,
        explanation: 'CAP theorem defines Consistency, Availability, and Partition Tolerance.',
        status: 'answered',
      },
      {
        questionId: 'q_09',
        sectionId: 'sec_arch',
        prompt: 'If a cache has a hit ratio of 90% (0.9), cache access latency of 2ms, and main memory access latency of 20ms, what is the Effective Memory Access Time in milliseconds?',
        type: 'numerical',
        userNumericalAnswer: 3.8,
        userSelectedOptionIds: [],
        correctOptionIds: [],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 110,
        explanation: 'Effective Latency = (0.9 * 2) + (0.1 * 20) = 1.8 + 2.0 = 3.8 ms.',
        status: 'answered',
      },
      {
        questionId: 'q_10',
        sectionId: 'sec_arch',
        prompt: 'What cryptographic hashing property makes bcrypt uniquely resilient against GPU-accelerated brute-force attacks compared to standard SHA-256?',
        type: 'single-choice',
        options: [
          { id: 'opt_10_a', text: 'Configurable work factor (cost) and key stretching' },
          { id: 'opt_10_b', text: 'Larger output digest length (> 512 bits)' },
          { id: 'opt_10_c', text: 'Inability to use salts' },
          { id: 'opt_10_d', text: 'Reversibility with private key' },
        ],
        userSelectedOptionIds: ['opt_10_a'],
        correctOptionIds: ['opt_10_a'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 60,
        explanation: 'bcrypt uses an adaptive key derivation function with an adjustable iteration cost factor (Eksblowfish), which demands significant memory and processing bounds.',
        status: 'answered',
      },
    ],
  },
  {
    sessionId: 'sess_stu_001_quick',
    testId: 'test_quick_quiz',
    testTitle: 'Rapid Technical Diagnostic',
    topic: 'Frontend & Web Architecture',
    category: 'General Assessment',
    candidateId: 'usr_stu_001',
    candidateName: 'Alex Morgan',
    totalScore: 16,
    maxScore: 16,
    percentage: 100,
    accuracy: 100,
    percentile: 98.7,
    isPassed: true,
    timeTakenSeconds: 225, // 3m 45s
    totalTimeSeconds: 300, // 5m
    submittedAt: '2025-02-27T09:15:00.000Z',
    sections: [
      {
        sectionId: 'sec_quick',
        sectionTitle: 'Diagnostic Questions',
        totalQuestions: 4,
        attemptedQuestions: 4,
        correctQuestions: 4,
        incorrectQuestions: 0,
        unansweredQuestions: 0,
        score: 16,
        maxScore: 16,
        accuracy: 100,
      },
    ],
    questions: [
      {
        questionId: 'qq_01',
        sectionId: 'sec_quick',
        prompt: 'Which HTML5 attribute instructs modern browsers to enable client-side spellcheck on input elements?',
        type: 'single-choice',
        options: [
          { id: 'qopt_1', text: 'autocorrect="true"' },
          { id: 'qopt_2', text: 'spellcheck="true"' },
          { id: 'qopt_3', text: 'grammar="active"' },
          { id: 'qopt_4', text: 'validate="spell"' },
        ],
        userSelectedOptionIds: ['qopt_2'],
        correctOptionIds: ['qopt_2'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 20,
        explanation: 'The standard HTML5 attribute is `spellcheck="true"`.',
        status: 'answered',
      },
      {
        questionId: 'qq_02',
        sectionId: 'sec_quick',
        prompt: 'In CSS Grid Layout, which CSS function expands track sizing to fill available space dynamically?',
        type: 'single-choice',
        options: [
          { id: 'qopt_21', text: 'calc()' },
          { id: 'qopt_22', text: 'minmax()' },
          { id: 'qopt_23', text: 'fit-content()' },
          { id: 'qopt_24', text: 'clamp()' },
        ],
        userSelectedOptionIds: ['qopt_22'],
        correctOptionIds: ['qopt_22'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 35,
        explanation: '`minmax()` defines a size range greater than or equal to min and less than or equal to max.',
        status: 'answered',
      },
      {
        questionId: 'qq_03',
        sectionId: 'sec_quick',
        prompt: 'What is 2 raised to the power of 10 (2^10)?',
        type: 'numerical',
        userNumericalAnswer: 1024,
        userSelectedOptionIds: [],
        correctOptionIds: [],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 40,
        explanation: '2^10 = 1024.',
        status: 'answered',
      },
      {
        questionId: 'qq_04',
        sectionId: 'sec_quick',
        prompt: 'Which of the following are primitive data types in JavaScript?',
        type: 'multiple-choice',
        options: [
          { id: 'qopt_41', text: 'Boolean' },
          { id: 'qopt_42', text: 'Symbol' },
          { id: 'qopt_43', text: 'BigInt' },
          { id: 'qopt_44', text: 'Array' },
        ],
        userSelectedOptionIds: ['qopt_41', 'qopt_42', 'qopt_43'],
        correctOptionIds: ['qopt_41', 'qopt_42', 'qopt_43'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 4,
        maxMarks: 4,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 55,
        explanation: 'Boolean, Symbol, and BigInt are primitives. Array is an Object.',
        status: 'answered',
      },
    ],
  },
  {
    sessionId: 'sess_stu_001_ds',
    testId: 'test_ds_trees',
    testTitle: 'Data Structures: Tree & Graph Traversal',
    topic: 'Graph Theory & Disjoint Sets',
    category: 'Computer Science',
    candidateId: 'usr_stu_001',
    candidateName: 'Alex Morgan',
    totalScore: 24,
    maxScore: 30,
    percentage: 80,
    accuracy: 83.3,
    percentile: 88.5,
    isPassed: true,
    timeTakenSeconds: 1050, // 17m 30s
    totalTimeSeconds: 1200, // 20m
    submittedAt: '2025-02-28T16:40:00.000Z',
    sections: [
      {
        sectionId: 'sec_trees',
        sectionTitle: 'Trees & Disjoint Sets',
        totalQuestions: 6,
        attemptedQuestions: 6,
        correctQuestions: 5,
        incorrectQuestions: 1,
        unansweredQuestions: 0,
        score: 24,
        maxScore: 30,
        accuracy: 83.3,
      },
    ],
    questions: [
      {
        questionId: 'ds_01',
        sectionId: 'sec_trees',
        prompt: 'What is the maximum number of nodes in a binary tree of height h (where height of single root node is 1)?',
        type: 'single-choice',
        options: [
          { id: 'opt_ds_1', text: '2^h - 1' },
          { id: 'opt_ds_2', text: '2^(h-1)' },
          { id: 'opt_ds_3', text: '2^(h+1) - 1' },
          { id: 'opt_ds_4', text: '2 * h' },
        ],
        userSelectedOptionIds: ['opt_ds_1'],
        correctOptionIds: ['opt_ds_1'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 5,
        maxMarks: 5,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 65,
        explanation: 'A full binary tree has 2^0 + 2^1 + ... + 2^(h-1) = 2^h - 1 nodes.',
        status: 'answered',
      },
      {
        questionId: 'ds_02',
        sectionId: 'sec_trees',
        prompt: 'Which tree traversal yields sorted values when applied to a Binary Search Tree (BST)?',
        type: 'single-choice',
        options: [
          { id: 'opt_ds_21', text: 'Pre-order traversal' },
          { id: 'opt_ds_22', text: 'In-order traversal' },
          { id: 'opt_ds_23', text: 'Post-order traversal' },
          { id: 'opt_ds_24', text: 'Level-order traversal' },
        ],
        userSelectedOptionIds: ['opt_ds_22'],
        correctOptionIds: ['opt_ds_22'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 5,
        maxMarks: 5,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 40,
        explanation: 'In-order traversal (Left, Root, Right) of a BST visits nodes in strictly ascending numerical order.',
        status: 'answered',
      },
    ],
  },
  {
    sessionId: 'sess_stu_001_cloud',
    testId: 'test_cloud_concurrency',
    testTitle: 'Cloud Architecture & Asynchronous Patterns',
    topic: 'Distributed Systems & Messaging',
    category: 'Engineering',
    candidateId: 'usr_stu_001',
    candidateName: 'Alex Morgan',
    totalScore: 28,
    maxScore: 36,
    percentage: 77.8,
    accuracy: 80,
    percentile: 86.4,
    isPassed: true,
    timeTakenSeconds: 1320, // 22m
    totalTimeSeconds: 1500, // 25m
    submittedAt: '2025-03-01T11:20:00.000Z',
    sections: [
      {
        sectionId: 'sec_cloud',
        sectionTitle: 'Cloud Fundamentals',
        totalQuestions: 6,
        attemptedQuestions: 6,
        correctQuestions: 5,
        incorrectQuestions: 1,
        unansweredQuestions: 0,
        score: 28,
        maxScore: 36,
        accuracy: 80,
      },
    ],
    questions: [
      {
        questionId: 'cl_01',
        sectionId: 'sec_cloud',
        prompt: 'What pattern decouples producers and consumers using an event log or message broker to handle spike traffic?',
        type: 'single-choice',
        options: [
          { id: 'opt_c_1', text: 'Queue-Based Load Leveling' },
          { id: 'opt_c_2', text: 'Circuit Breaker' },
          { id: 'opt_c_3', text: 'Saga Pattern' },
          { id: 'opt_c_4', text: 'Strangler Fig' },
        ],
        userSelectedOptionIds: ['opt_c_1'],
        correctOptionIds: ['opt_c_1'],
        isCorrect: true,
        isPartial: false,
        marksAwarded: 6,
        maxMarks: 6,
        negativeMarksDeducted: 0,
        timeSpentSeconds: 55,
        explanation: 'Queue-Based Load Leveling uses a buffer queue to decouple peak demand bursts from backend consumers.',
        status: 'answered',
      },
    ],
  },
];

/**
 * Retrieve test results for a given student, pre-populating with mock results if none exist yet.
 */
export function getStudentTestResults(studentId: string): TestResult[] {
  if (typeof window === 'undefined') {
    return INITIAL_STUDENT_RESULTS.filter((r) => r.candidateId === studentId);
  }

  try {
    const raw = localStorage.getItem(STORAGE_RESULTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_RESULTS_KEY, JSON.stringify(INITIAL_STUDENT_RESULTS));
      return INITIAL_STUDENT_RESULTS.filter((r) => r.candidateId === studentId);
    }
    const allResults: TestResult[] = JSON.parse(raw);
    const filtered = allResults.filter((r) => r.candidateId === studentId);

    // If specific student has no results yet (e.g. newly provisioned student), return empty
    if (filtered.length === 0 && studentId === 'usr_stu_001') {
      const merged = [...INITIAL_STUDENT_RESULTS, ...allResults];
      localStorage.setItem(STORAGE_RESULTS_KEY, JSON.stringify(merged));
      return INITIAL_STUDENT_RESULTS;
    }

    return filtered;
  } catch (err) {
    console.error('Failed to read test results from localStorage:', err);
    return INITIAL_STUDENT_RESULTS.filter((r) => r.candidateId === studentId);
  }
}

/**
 * Save a newly completed test result to localStorage
 */
export function saveStudentTestResult(result: TestResult): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(STORAGE_RESULTS_KEY);
    const allResults: TestResult[] = raw ? JSON.parse(raw) : INITIAL_STUDENT_RESULTS;
    // Prepend to show most recent first
    const updated = [result, ...allResults.filter((r) => r.sessionId !== result.sessionId)];
    localStorage.setItem(STORAGE_RESULTS_KEY, JSON.stringify(updated));
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
    return INITIAL_STUDENT_RESULTS.find((r) => r.sessionId === sessionId) || null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_RESULTS_KEY);
    const allResults: TestResult[] = raw ? JSON.parse(raw) : INITIAL_STUDENT_RESULTS;
    const match = allResults.find((r) => r.sessionId === sessionId);
    if (match) return match;
    return INITIAL_STUDENT_RESULTS.find((r) => r.sessionId === sessionId) || null;
  } catch (err) {
    console.error('Failed to get test result by sessionId:', err);
    return INITIAL_STUDENT_RESULTS.find((r) => r.sessionId === sessionId) || null;
  }
}

