import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

/**
 * Convex Assessment Engine API
 * Provides real-time synchronization, persistence, and lifecycle operations
 * for all uploaded, generated, and scheduled tests across all devices.
 */

/**
 * List all assessment tests
 */
export const listTests = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('tests').collect();
  },
});

/**
 * Get assessment metadata by ID or testId
 */
export const getTest = query({
  args: {
    testId: v.string(),
  },
  handler: async (ctx, args) => {
    const byTestId = await ctx.db
      .query('tests')
      .withIndex('by_testId', (q) => q.eq('testId', args.testId))
      .first();

    if (byTestId) return byTestId;

    const id = ctx.db.normalizeId('tests', args.testId);
    if (id) {
      const byId = await ctx.db.get(id);
      if (byId) return byId;
    }

    const byCode = await ctx.db
      .query('tests')
      .withIndex('by_code', (q) => q.eq('code', args.testId.toUpperCase()))
      .first();

    return byCode || null;
  },
});

/**
 * Upsert an assessment test (Create or Update)
 */
export const upsertTest = mutation({
  args: {
    testId: v.string(),
    title: v.string(),
    code: v.string(),
    category: v.string(),
    description: v.string(),
    durationMinutes: v.number(),
    totalMarks: v.number(),
    passMarks: v.number(),
    totalQuestions: v.number(),
    instructions: v.array(v.string()),
    sections: v.any(),
    status: v.union(v.literal('active'), v.literal('upcoming'), v.literal('archived')),
    scheduledDate: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    targetAudience: v.optional(v.union(v.literal('all'), v.literal('specific'))),
    assignedStudentIds: v.optional(v.array(v.string())),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('tests')
      .withIndex('by_testId', (q) => q.eq('testId', args.testId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        code: args.code,
        category: args.category,
        description: args.description,
        durationMinutes: args.durationMinutes,
        totalMarks: args.totalMarks,
        passMarks: args.passMarks,
        totalQuestions: args.totalQuestions,
        instructions: args.instructions,
        sections: args.sections,
        status: args.status,
        scheduledDate: args.scheduledDate,
        scheduledTime: args.scheduledTime,
        targetAudience: args.targetAudience,
        assignedStudentIds: args.assignedStudentIds,
      });
      return { id: existing._id, action: 'updated', testId: args.testId };
    } else {
      const id = await ctx.db.insert('tests', {
        testId: args.testId,
        title: args.title,
        code: args.code,
        category: args.category,
        description: args.description,
        durationMinutes: args.durationMinutes,
        totalMarks: args.totalMarks,
        passMarks: args.passMarks,
        totalQuestions: args.totalQuestions,
        instructions: args.instructions,
        sections: args.sections,
        status: args.status,
        scheduledDate: args.scheduledDate,
        scheduledTime: args.scheduledTime,
        targetAudience: args.targetAudience,
        assignedStudentIds: args.assignedStudentIds,
        createdAt: args.createdAt,
      });
      return { id, action: 'inserted', testId: args.testId };
    }
  },
});

/**
 * Delete an assessment test by testId
 */
export const deleteTest = mutation({
  args: {
    testId: v.string(),
  },
  handler: async (ctx, args) => {
    let testDoc = await ctx.db
      .query('tests')
      .withIndex('by_testId', (q) => q.eq('testId', args.testId))
      .first();

    if (!testDoc) {
      const id = ctx.db.normalizeId('tests', args.testId);
      if (id) {
        testDoc = await ctx.db.get(id);
      }
    }

    if (!testDoc) {
      testDoc = await ctx.db
        .query('tests')
        .withIndex('by_code', (q) => q.eq('code', args.testId.toUpperCase()))
        .first();
    }

    if (!testDoc) {
      return { success: false, deletedCount: 0 };
    }

    await ctx.db.delete(testDoc._id);
    let deletedCount = 1;

    // Clean up legacy questions if any were keyed by testId
    const questions = await ctx.db
      .query('questions')
      .withIndex('by_test', (q) => q.eq('testId', testDoc.testId))
      .collect();
    for (const q of questions) {
      await ctx.db.delete(q._id);
    }

    return { success: true, count: deletedCount };
  },
});

/**
 * Cycle or update test status
 */
export const updateTestStatus = mutation({
  args: {
    testId: v.string(),
    status: v.union(v.literal('active'), v.literal('upcoming'), v.literal('archived')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('tests')
      .withIndex('by_testId', (q) => q.eq('testId', args.testId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status });
      return { success: true };
    }
    return { success: false, message: 'Test not found' };
  },
});

/**
 * Update test duration
 */
export const updateTestDuration = mutation({
  args: {
    testId: v.string(),
    durationMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('tests')
      .withIndex('by_testId', (q) => q.eq('testId', args.testId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { durationMinutes: args.durationMinutes });
      return { success: true };
    }
    return { success: false, message: 'Test not found' };
  },
});

/**
 * Update scheduling and candidate access configuration
 */
export const updateTestScheduleAndAccess = mutation({
  args: {
    testId: v.string(),
    scheduledDate: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    targetAudience: v.optional(v.union(v.literal('all'), v.literal('specific'))),
    assignedStudentIds: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal('active'), v.literal('upcoming'), v.literal('archived'))),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('tests')
      .withIndex('by_testId', (q) => q.eq('testId', args.testId))
      .first();

    if (existing) {
      const patchData: Record<string, any> = {};
      if (args.scheduledDate !== undefined) patchData.scheduledDate = args.scheduledDate;
      if (args.scheduledTime !== undefined) patchData.scheduledTime = args.scheduledTime;
      if (args.targetAudience !== undefined) patchData.targetAudience = args.targetAudience;
      if (args.assignedStudentIds !== undefined) patchData.assignedStudentIds = args.assignedStudentIds;
      if (args.status !== undefined) patchData.status = args.status;
      if (args.durationMinutes !== undefined) patchData.durationMinutes = args.durationMinutes;

      await ctx.db.patch(existing._id, patchData);
      return { success: true };
    }
    return { success: false, message: 'Test not found' };
  },
});
