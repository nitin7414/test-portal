import { v } from 'convex/values';
import { mutation, query, internalMutation } from './_generated/server';
import { internal } from './_generated/api';

/**
 * Start a new attempt or resume an existing active attempt.
 * Enforces transaction-safe check-before-insert:
 * - If an attempt is already IN_PROGRESS for this student & test, it returns the existing attempt.
 * - Otherwise creates a new attempt document and schedules server-side autoSubmitAttempt.
 */
export const startOrResumeAttempt = mutation({
  args: {
    testId: v.string(),
    studentId: v.string(),
    candidateName: v.optional(v.string()),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Check for existing active attempt for this student + test
    const existing = await ctx.db
      .query('attempts')
      .withIndex('by_student_test', (q: any) =>
        q.eq('studentId', args.studentId).eq('testId', args.testId)
      )
      .filter((q) => q.eq(q.field('status'), 'IN_PROGRESS'))
      .first();

    if (existing) {
      return {
        attemptId: existing._id,
        isNew: false,
        startedAt: existing.startedAt,
        durationSeconds: existing.durationSeconds,
        status: existing.status,
      };
    }

    // 2. Create fresh attempt
    const now = Date.now();
    const attemptId = await ctx.db.insert('attempts', {
      testId: args.testId,
      studentId: args.studentId,
      candidateName: args.candidateName,
      startedAt: now,
      durationSeconds: args.durationSeconds,
      status: 'IN_PROGRESS',
      tabSwitchLog: [],
      autoSubmitted: false,
    });

    // 3. Schedule authoritative server-side auto-submit
    // Fires precisely when the test duration elapses, even if the client disconnects.
    await ctx.scheduler.runAfter(
      args.durationSeconds * 1000,
      internal.attempts.autoSubmitAttempt,
      { attemptId: attemptId.toString() }
    );

    return {
      attemptId,
      isNew: true,
      startedAt: now,
      durationSeconds: args.durationSeconds,
      status: 'IN_PROGRESS' as const,
    };
  },
});

/**
 * Server-authoritative auto-submit scheduled function.
 * Triggered automatically by ctx.scheduler when the allotted duration expires.
 */
export const autoSubmitAttempt = internalMutation({
  args: {
    attemptId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find attempt by ID (convert to Id<'attempts'> if needed or lookup)
    const attempts = await ctx.db.query('attempts').collect();
    const attempt = attempts.find((a) => a._id.toString() === args.attemptId);

    if (!attempt) return;

    // Only submit if still actively in progress
    if (attempt.status === 'IN_PROGRESS') {
      await ctx.db.patch(attempt._id, {
        status: 'SUBMITTED',
        submittedAt: Date.now(),
        autoSubmitted: true,
      });
    }
  },
});

/**
 * Manual client submission mutation.
 * Re-validates that the attempt is still actively IN_PROGRESS before accepting submission.
 */
export const submitAttempt = mutation({
  args: {
    attemptId: v.string(),
  },
  handler: async (ctx, args) => {
    const attempts = await ctx.db.query('attempts').collect();
    const attempt = attempts.find((a) => a._id.toString() === args.attemptId);

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return { success: false, status: attempt.status, message: 'Attempt is already submitted or closed' };
    }

    await ctx.db.patch(attempt._id, {
      status: 'SUBMITTED',
      submittedAt: Date.now(),
      autoSubmitted: false,
    });

    return { success: true, status: 'SUBMITTED' };
  },
});

/**
 * Audit log mutation for window blur / tab switching.
 * Appends event timestamp to the attempt's tabSwitchLog.
 */
export const logTabSwitch = mutation({
  args: {
    attemptId: v.string(),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempts = await ctx.db.query('attempts').collect();
    const attempt = attempts.find((a) => a._id.toString() === args.attemptId);

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return;
    }

    const log = attempt.tabSwitchLog || [];
    const eventTime = args.timestamp || Date.now();

    await ctx.db.patch(attempt._id, {
      tabSwitchLog: [...log, eventTime],
    });
  },
});

/**
 * Reactive query subscribed by client via useQuery.
 * Returns the live attempt document and server-provided timestamps.
 */
export const getAttempt = query({
  args: {
    attemptId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.attemptId) return null;
    const attempts = await ctx.db.query('attempts').collect();
    const attempt = attempts.find((a) => a._id.toString() === args.attemptId);
    return attempt || null;
  },
});
