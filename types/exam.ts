export type QuestionType = 'single-choice' | 'multiple-choice' | 'numerical';

export type QuestionStatus =
  | 'not_visited'
  | 'unanswered'
  | 'answered'
  | 'marked_review'
  | 'answered_marked_review';

export interface QuestionOption {
  id: string;
  text: string;
  codeSnippet?: string;
}

export interface Question {
  id: string;
  sectionId: string;
  type: QuestionType;
  prompt: string;
  codeSnippet?: string;
  options?: QuestionOption[];
  marks: number;
  negativeMarks: number;
  correctOptionIds: string[]; // Protected on client during live exam
  numericalAnswerRange?: { min: number; max: number };
  explanation: string;
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface TestMetadata {
  id: string;
  title: string;
  code: string;
  category: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  totalQuestions: number;
  instructions: string[];
  sections: Section[];
  createdAt: string;
  status: 'active' | 'upcoming' | 'archived';
  scheduledDate?: string; // e.g. '2025-03-25' or 'March 25, 2025'
  scheduledTime?: string; // e.g. '14:30'
  targetAudience?: 'all' | 'specific';
  assignedStudentIds?: string[]; // student user id, studentId, or email
  syllabus?: string[];
}

export interface CandidateResponse {
  questionId: string;
  selectedOptionIds: string[];
  numericalAnswer?: number;
  status: QuestionStatus;
  timeSpentSeconds: number;
  lastUpdated: number;
}

export interface ExamSessionState {
  sessionId: string;
  testId: string;
  userId: string;
  candidateName: string;
  candidateEmail: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  remainingSeconds: number;
  currentSectionId: string;
  currentQuestionId: string;
  responses: Record<string, CandidateResponse>;
  visitedQuestions: string[];
  tabSwitchCount: number;
  isSubmitted: boolean;
  submittedAt?: number;
}

export interface QuestionResultAnalysis {
  questionId: string;
  sectionId: string;
  prompt: string;
  type: QuestionType;
  options?: QuestionOption[];
  userSelectedOptionIds: string[];
  userNumericalAnswer?: number;
  correctOptionIds: string[];
  isCorrect: boolean;
  isPartial: boolean;
  marksAwarded: number;
  maxMarks: number;
  negativeMarksDeducted: number;
  timeSpentSeconds: number;
  explanation: string;
  status: QuestionStatus;
}

export interface SectionScoreSummary {
  sectionId: string;
  sectionTitle: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  unansweredQuestions: number;
  score: number;
  maxScore: number;
  accuracy: number;
}

export interface TestResult {
  sessionId: string;
  testId: string;
  testTitle: string;
  topic?: string;
  category?: string;
  candidateId: string;
  candidateName: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  percentile: number;
  isPassed: boolean;
  timeTakenSeconds: number;
  totalTimeSeconds: number;
  submittedAt: string;
  sections: SectionScoreSummary[];
  questions: QuestionResultAnalysis[];
}
