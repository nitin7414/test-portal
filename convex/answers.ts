import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Autosave Answer Mutation
 * 
 * Upserts candidate answer keyed by (attemptId, questionId) using compound index.
 * Strictly verifies server-side that the attempt is still actively IN_PROGRESS before writing.
 */
export const saveAnswer = mutation({
  args: {
    attemptId: v.string(),
    questionId: v.string(),
    selectedOptionId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Validate that the attempt is currently IN_PROGRESS
    const attempts = await ctx.db.query('attempts').collect();
    const attempt = attempts.find((a) => a._id.toString() === args.attemptId);

    if (!attempt) {
      throw new Error('Invalid attempt ID');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return { success: false, reason: 'Attempt is no longer in progress' };
    }

    // 2. Look up existing answer using compound index
    const existing = await ctx.db
      .query('answers')
      .withIndex('by_attempt_question', (q: any) =>
        q.eq('attemptId', args.attemptId).eq('questionId', args.questionId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        selectedOptionId: args.selectedOptionId,
        savedAt: now,
      });
      return { success: true, action: 'updated', savedAt: now };
    } else {
      await ctx.db.insert('answers', {
        attemptId: args.attemptId,
        questionId: args.questionId,
        selectedOptionId: args.selectedOptionId,
        savedAt: now,
      });
      return { success: true, action: 'created', savedAt: now };
    }
  },
});

/**
 * Reactive Query to Retrieve All Answers for an Attempt
 * 
 * Used for live synchronization and hydrating the optimistic Zustand store on mount or resume.
 */
export const getAttemptAnswers = query({
  args: {
    attemptId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.attemptId) return [];

    const answers = await ctx.db
      .query('answers')
      .withIndex('by_attempt', (q) => q.eq('attemptId', args.attemptId))
      .collect();

    return answers;
  },
});
