import { TestMetadata } from '@/types/exam';

export const MOCK_TESTS: TestMetadata[] = [
  {
    id: 'test_se_2025',
    title: 'Software Engineering & Algorithmic Reasoning',
    code: 'SE-APT-101',
    category: 'Computer Science',
    description:
      'Comprehensive institutional screening test covering algorithmic complexity, asynchronous architectures, data structures, and numerical reasoning.',
    durationMinutes: 30,
    totalMarks: 40,
    passMarks: 24,
    totalQuestions: 10,
    instructions: [
      'Each correct single-choice answer awards +4 marks.',
      'Each incorrect response incurs a negative penalty of -1 mark.',
      'Unanswered or skipped questions carry 0 marks penalty.',
      'You may flag questions using "Mark for Review" and jump using the Question Palette.',
      'Session responses are automatically saved to local cache synchronously.',
      'Do not close or switch browser tabs; proctoring logs tab-switching activity.',
    ],
    createdAt: '2025-01-10T10:00:00.000Z',
    status: 'active',
    sections: [
      {
        id: 'sec_logic',
        title: 'Section A: Algorithms & Logic',
        description: 'Time complexity, sorting properties, and mathematical logic.',
        questions: [
          {
            id: 'q_01',
            sectionId: 'sec_logic',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 1,
            prompt:
              'What is the worst-case time complexity of finding an element in a balanced Binary Search Tree (AVL / Red-Black Tree) containing N elements?',
            options: [
              { id: 'opt_1_a', text: 'O(1)' },
              { id: 'opt_1_b', text: 'O(log N)' },
              { id: 'opt_1_c', text: 'O(N)' },
              { id: 'opt_1_d', text: 'O(N log N)' },
            ],
            correctOptionIds: ['opt_1_b'],
            explanation:
              'In a self-balancing binary search tree such as an AVL or Red-Black Tree, the height is strictly bounded by O(log N). Thus, lookup operations in the worst case run in O(log N) time.',
          },
          {
            id: 'q_02',
            sectionId: 'sec_logic',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 1,
            prompt:
              'Examine the following recursive algorithm snippet. What will be returned for `f(5)`?',
            codeSnippet: `function f(n) {
  if (n <= 1) return 1;
  return n * f(n - 2);
}`,
            options: [
              { id: 'opt_2_a', text: '15' },
              { id: 'opt_2_b', text: '120' },
              { id: 'opt_2_c', text: '24' },
              { id: 'opt_2_d', text: '8' },
            ],
            correctOptionIds: ['opt_2_a'],
            explanation:
              'Step 1: f(5) = 5 * f(3)\nStep 2: f(3) = 3 * f(1)\nStep 3: f(1) = 1 (base condition)\nTherefore: 5 * 3 * 1 = 15.',
          },
          {
            id: 'q_03',
            sectionId: 'sec_logic',
            type: 'multiple-choice',
            marks: 4,
            negativeMarks: 1,
            prompt:
              'Which of the following sorting algorithms have an average-case time complexity of O(N log N)? (Select all that apply)',
            options: [
              { id: 'opt_3_a', text: 'Merge Sort' },
              { id: 'opt_3_b', text: 'Quick Sort' },
              { id: 'opt_3_c', text: 'Heap Sort' },
              { id: 'opt_3_d', text: 'Bubble Sort' },
            ],
            correctOptionIds: ['opt_3_a', 'opt_3_b', 'opt_3_c'],
            explanation:
              'Merge Sort, Quick Sort, and Heap Sort all exhibit O(N log N) average-case time complexity. Bubble sort runs in O(N^2) average time.',
          },
          {
            id: 'q_04',
            sectionId: 'sec_logic',
            type: 'numerical',
            marks: 4,
            negativeMarks: 0,
            prompt:
              'Given an undirected graph with 7 vertices where each vertex has a degree of 4, how many total edges are present in the graph?',
            numericalAnswerRange: { min: 14, max: 14 },
            correctOptionIds: [],
            explanation:
              'By the Handshaking Lemma: Sum of degrees = 2 * (Number of edges). Total degree sum = 7 * 4 = 28. Therefore, edges = 28 / 2 = 14.',
          },
          {
            id: 'q_05',
            sectionId: 'sec_logic',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 1,
            prompt:
              'Which data structure is optimal for implementing Breadth-First Search (BFS) on an unweighted graph?',
            options: [
              { id: 'opt_5_a', text: 'LIFO Stack' },
              { id: 'opt_5_b', text: 'FIFO Queue' },
              { id: 'opt_5_c', text: 'Priority Queue (Min-Heap)' },
              { id: 'opt_5_d', text: 'Disjoint Set Union (DSU)' },
            ],
            correctOptionIds: ['opt_5_b'],
            explanation:
              'BFS explores neighbors level by level, necessitating a First-In, First-Out (FIFO) Queue to maintain traversal order.',
          },
        ],
      },
      {
        id: 'sec_arch',
        title: 'Section B: Systems & Architecture',
        description: 'HTTP protocols, concurrency, database indexing, and caching.',
        questions: [
          {
            id: 'q_06',
            sectionId: 'sec_arch',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 1,
            prompt:
              'Which HTTP status code must be returned by an API when a request is syntactically valid but cannot be processed due to semantic validation rules?',
            options: [
              { id: 'opt_6_a', text: '400 Bad Request' },
              { id: 'opt_6_b', text: '422 Unprocessable Entity' },
              { id: 'opt_6_c', text: '403 Forbidden' },
              { id: 'opt_6_d', text: '500 Internal Server Error' },
            ],
            correctOptionIds: ['opt_6_b'],
            explanation:
              'RFC 9110 specifies 422 Unprocessable Entity for requests that are well-formed (syntax is valid) but fail semantic business rules.',
          },
          {
            id: 'q_07',
            sectionId: 'sec_arch',
            type: 'multiple-choice',
            marks: 4,
            negativeMarks: 1,
            prompt:
              'Which of the following database isolation levels prevent "Non-Repeatable Reads" according to ANSI SQL standards? (Select all that apply)',
            options: [
              { id: 'opt_7_a', text: 'Read Committed' },
              { id: 'opt_7_b', text: 'Repeatable Read' },
              { id: 'opt_7_c', text: 'Serializable' },
              { id: 'opt_7_d', text: 'Read Uncommitted' },
            ],
            correctOptionIds: ['opt_7_b', 'opt_7_c'],
            explanation:
              'Repeatable Read and Serializable levels guarantee that any data read during a transaction cannot be modified by other transactions until completion.',
          },
          {
            id: 'q_08',
            sectionId: 'sec_arch',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 1,
            prompt:
              'In the CAP theorem for distributed systems, what does the "P" represent?',
            options: [
              { id: 'opt_8_a', text: 'Performance' },
              { id: 'opt_8_b', text: 'Partition Tolerance' },
              { id: 'opt_8_c', text: 'Persistent Storage' },
              { id: 'opt_8_d', text: 'Parallel Processing' },
            ],
            correctOptionIds: ['opt_8_b'],
            explanation:
              'CAP stands for Consistency, Availability, and Partition Tolerance.',
          },
          {
            id: 'q_09',
            sectionId: 'sec_arch',
            type: 'numerical',
            marks: 4,
            negativeMarks: 0,
            prompt:
              'If a cache has a hit ratio of 90% (0.9), cache access latency of 2ms, and main memory access latency of 20ms, what is the Effective Memory Access Time in milliseconds?',
            numericalAnswerRange: { min: 3.8, max: 3.8 },
            correctOptionIds: [],
            explanation:
              'Effective Latency = (Hit Ratio * Cache Time) + ((1 - Hit Ratio) * (Cache Time + Memory Time))\n= (0.9 * 2) + (0.1 * 20) = 1.8 + 2.0 = 3.8 ms.',
          },
          {
            id: 'q_10',
            sectionId: 'sec_arch',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 1,
            prompt:
              'What cryptographic hashing property makes bcrypt uniquely resilient against GPU-accelerated brute-force attacks compared to standard SHA-256?',
            options: [
              { id: 'opt_10_a', text: 'Configurable work factor (cost) and key stretching' },
              { id: 'opt_10_b', text: 'Larger output digest length (> 512 bits)' },
              { id: 'opt_10_c', text: 'Inability to use salts' },
              { id: 'opt_10_d', text: 'Reversibility with private key' },
            ],
            correctOptionIds: ['opt_10_a'],
            explanation:
              'bcrypt uses an adaptive key derivation function based on Blowfish (Eksblowfish) with an adjustable iteration cost factor, creating intentional memory and CPU bounds that severely degrade parallelized GPU attacks.',
          },
        ],
      },
    ],
  },
  {
    id: 'test_quick_quiz',
    title: 'Rapid Technical Diagnostic',
    code: 'SPEED-01',
    category: 'General Assessment',
    description: 'A swift 5-minute diagnostic quiz to test portal functionality and responsive inputs.',
    durationMinutes: 5,
    totalMarks: 16,
    passMarks: 10,
    totalQuestions: 4,
    instructions: [
      'Quick 5-minute timed test.',
      '4 marks per correct answer, 0 negative marks.',
      'Instant grading and score calculation upon submission.',
    ],
    createdAt: '2025-02-01T08:00:00.000Z',
    status: 'active',
    sections: [
      {
        id: 'sec_quick',
        title: 'Diagnostic Questions',
        questions: [
          {
            id: 'qq_01',
            sectionId: 'sec_quick',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 0,
            prompt: 'Which HTML5 attribute instructs modern browsers to enable client-side spellcheck on input elements?',
            options: [
              { id: 'qopt_1', text: 'autocorrect="true"' },
              { id: 'qopt_2', text: 'spellcheck="true"' },
              { id: 'qopt_3', text: 'grammar="active"' },
              { id: 'qopt_4', text: 'validate="spell"' },
            ],
            correctOptionIds: ['qopt_2'],
            explanation: 'The standard HTML5 attribute is `spellcheck="true"`.',
          },
          {
            id: 'qq_02',
            sectionId: 'sec_quick',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 0,
            prompt: 'In CSS Grid Layout, which CSS function expands track sizing to fill available space dynamically?',
            options: [
              { id: 'qopt_21', text: 'calc()' },
              { id: 'qopt_22', text: 'minmax()' },
              { id: 'qopt_23', text: 'fit-content()' },
              { id: 'qopt_24', text: 'clamp()' },
            ],
            correctOptionIds: ['qopt_22'],
            explanation: '`minmax()` defines a size range greater than or equal to min and less than or equal to max.',
          },
          {
            id: 'qq_03',
            sectionId: 'sec_quick',
            type: 'numerical',
            marks: 4,
            negativeMarks: 0,
            prompt: 'What is 2 raised to the power of 10 (2^10)?',
            numericalAnswerRange: { min: 1024, max: 1024 },
            correctOptionIds: [],
            explanation: '2^10 = 1024.',
          },
          {
            id: 'qq_04',
            sectionId: 'sec_quick',
            type: 'multiple-choice',
            marks: 4,
            negativeMarks: 0,
            prompt: 'Which of the following are primitive data types in JavaScript? (Select all that apply)',
            options: [
              { id: 'qopt_41', text: 'Boolean' },
              { id: 'qopt_42', text: 'Symbol' },
              { id: 'qopt_43', text: 'BigInt' },
              { id: 'qopt_44', text: 'Array' },
            ],
            correctOptionIds: ['qopt_41', 'qopt_42', 'qopt_43'],
            explanation: 'Boolean, Symbol, and BigInt are primitives. Array is an Object reference type.',
          },
        ],
      },
    ],
  },
  {
    id: 'test_distributed_systems',
    title: 'Distributed Systems & Cloud Architecture',
    code: 'SYS-DIST-401',
    category: 'Systems & Architecture',
    description:
      'Rigorous institutional screening on distributed consensus (Raft/Paxos), event-driven architectures, CAP theorem tradeoffs, and zero-downtime replication.',
    durationMinutes: 45,
    totalMarks: 50,
    passMarks: 32,
    totalQuestions: 12,
    scheduledDate: '2025-03-20',
    scheduledTime: '10:00',
    targetAudience: 'all',
    syllabus: ['Consensus Protocols (Raft/Paxos)', 'CAP & PACELC Theorems', 'Event Sourcing & CQRS', 'Partition Tolerance'],
    instructions: [
      'Institutional proctored examination.',
      '45 minutes timed duration with server-synchronized clock.',
      '+4 marks per correct response, -1 for incorrect responses.',
      'Tab switching and window blur are actively proctored.',
    ],
    createdAt: '2025-02-15T09:00:00.000Z',
    status: 'upcoming',
    sections: [
      {
        id: 'sec_consensus',
        title: 'Section A: Consensus & Reliability',
        description: 'Leader election, quorum validation, and log replication.',
        questions: [
          {
            id: 'ds_01',
            sectionId: 'sec_consensus',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 1,
            prompt: 'In the Raft consensus algorithm, what minimum quorum size is strictly required in a cluster of 5 nodes to commit a log entry?',
            options: [
              { id: 'ds_opt_1', text: '2 nodes' },
              { id: 'ds_opt_2', text: '3 nodes' },
              { id: 'ds_opt_3', text: '4 nodes' },
              { id: 'ds_opt_4', text: '5 nodes' },
            ],
            correctOptionIds: ['ds_opt_2'],
            explanation: 'In Raft and Paxos, a majority quorum requires strictly floor(N/2) + 1 nodes. For N = 5, the majority quorum is 3 nodes.',
          },
        ],
      },
    ],
  },
  {
    id: 'test_database_internals',
    title: 'Database Internals, Indexing & Query Engines',
    code: 'DB-ENG-302',
    category: 'Database Systems',
    description:
      'Deep dive examination covering B+ Tree disk mechanics, WAL logging, MVCC isolation levels, and buffer pool eviction policies.',
    durationMinutes: 40,
    totalMarks: 40,
    passMarks: 24,
    totalQuestions: 10,
    scheduledDate: '2025-03-24',
    scheduledTime: '14:30',
    targetAudience: 'all',
    syllabus: ['B+ Tree Indexing & LSM Trees', 'Write-Ahead Logging (WAL)', 'MVCC & ACID Isolation', 'Buffer Pool Algorithms'],
    instructions: [
      'Comprehensive database engineering assessment.',
      'Single-choice and numerical calculations.',
      'Auto-save and resume protection active.',
    ],
    createdAt: '2025-02-18T11:00:00.000Z',
    status: 'upcoming',
    sections: [
      {
        id: 'sec_storage',
        title: 'Storage & Access Methods',
        questions: [
          {
            id: 'dbi_01',
            sectionId: 'sec_storage',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 1,
            prompt: 'Why do relational storage engines predominantly prefer B+ Trees over standard B-Trees for disk-based table indexing?',
            options: [
              { id: 'dbi_opt_1', text: 'B+ Trees have larger memory footprints for leaf nodes' },
              { id: 'dbi_opt_2', text: 'Internal nodes store only keys, maximizing branching factor and sequential scan speed across leaf pointers' },
              { id: 'dbi_opt_3', text: 'B+ Trees do not require rebalancing during insertions' },
              { id: 'dbi_opt_4', text: 'B+ Trees avoid log-structured merges' },
            ],
            correctOptionIds: ['dbi_opt_2'],
            explanation: 'In B+ Trees, data pointers reside strictly in linked leaf nodes. Internal nodes store only routing keys, yielding a much higher branching factor, lower height, and rapid sequential scans.',
          },
        ],
      },
    ],
  },
  {
    id: 'test_advanced_algorithms',
    title: 'Graph Theory & Advanced Dynamic Programming',
    code: 'ALG-ADV-501',
    category: 'Algorithms & Reasoning',
    description:
      'Advanced algorithmic tournament testing network flows, shortest path variations (Dijkstra, Bellman-Ford, Floyd-Warshall), and multidimensional DP.',
    durationMinutes: 60,
    totalMarks: 60,
    passMarks: 36,
    totalQuestions: 15,
    scheduledDate: '2025-03-28',
    scheduledTime: '09:00',
    targetAudience: 'specific',
    assignedStudentIds: ['usr_stu_001', 'STU-2025-001', 'alex.morgan@testportal.com'],
    syllabus: ['Shortest Paths & All-Pairs', 'Maximum Bipartite Matching', 'Bitmask Dynamic Programming', 'Disjoint Set Forests'],
    instructions: [
      '60-minute competitive algorithmic assessment.',
      'Numerical answer precision and multi-option analysis.',
    ],
    createdAt: '2025-02-20T14:00:00.000Z',
    status: 'upcoming',
    sections: [
      {
        id: 'sec_graphs',
        title: 'Graph Algorithms',
        questions: [
          {
            id: 'adv_01',
            sectionId: 'sec_graphs',
            type: 'single-choice',
            marks: 4,
            negativeMarks: 1,
            prompt: 'Which algorithm can detect negative-weight cycles in a directed graph with V vertices and E edges in O(V * E) time?',
            options: [
              { id: 'adv_opt_1', text: 'Dijkstra with Fibonacci Heap' },
              { id: 'adv_opt_2', text: 'Bellman-Ford Algorithm' },
              { id: 'adv_opt_3', text: 'Kruskal Algorithm' },
              { id: 'adv_opt_4', text: 'Tarjan Strongly Connected Components' },
            ],
            correctOptionIds: ['adv_opt_2'],
            explanation: 'The Bellman-Ford algorithm relaxes edges V-1 times and detects negative cycles on the V-th iteration in O(V * E) time.',
          },
        ],
      },
    ],
  },
];
