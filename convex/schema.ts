import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Convex Schema for Secure Time-Bound Exam Engine
 * 
 * Defines tests, questions, candidate attempts, and persistent answers
 * with compound indexes to enforce data integrity and rapid lookups.
 */
export default defineSchema({
  tests: defineTable({
    title: v.string(),
    durationSeconds: v.number(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    totalMarks: v.optional(v.number()),
    passMarks: v.optional(v.number()),
  }),

  questions: defineTable({
    testId: v.string(),
    text: v.string(),
    codeSnippet: v.optional(v.string()),
    options: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
      })
    ),
    correctOptionId: v.string(),
    marks: v.optional(v.number()),
    negativeMarks: v.optional(v.number()),
    explanation: v.optional(v.string()),
    order: v.optional(v.number()),
  }).index('by_test', ['testId']),

  attempts: defineTable({
    testId: v.string(),
    studentId: v.string(),
    candidateName: v.optional(v.string()),
    startedAt: v.number(),
    durationSeconds: v.number(),
    submittedAt: v.optional(v.number()),
    status: v.union(
      v.literal('NOT_STARTED'),
      v.literal('IN_PROGRESS'),
      v.literal('SUBMITTED'),
      v.literal('GRADED')
    ),
    tabSwitchLog: v.array(v.number()),
    autoSubmitted: v.boolean(),
  })
    .index('by_student_test', ['studentId', 'testId'])
    .index('by_status', ['status']),

  answers: defineTable({
    attemptId: v.string(),
    questionId: v.string(),
    selectedOptionId: v.string(),
    savedAt: v.number(),
  })
    .index('by_attempt_question', ['attemptId', 'questionId'])
    .index('by_attempt', ['attemptId']),

  users: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal('admin'), v.literal('student')),
    isSuperAdmin: v.optional(v.boolean()),
    studentId: v.optional(v.string()),
    batch: v.optional(v.string()),
    subject: v.optional(v.string()),
    passwordHash: v.string(),
    plainPassword: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('suspended')),
    createdAt: v.string(),
  })
    .index('by_email', ['email'])
    .index('by_studentId', ['studentId'])
    .index('by_role', ['role']),
});
