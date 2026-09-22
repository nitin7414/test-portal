import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

/**
 * Get assessment metadata by ID
 */
export const getTest = query({
  args: {
    testId: v.string(),
  },
  handler: async (ctx, args) => {
    const tests = await ctx.db.query('tests').collect();
    return tests.find((t) => t._id.toString() === args.testId || t.title.toLowerCase().includes(args.testId.toLowerCase())) || null;
  },
});

/**
 * Get all questions for an assessment
 */
export const getQuestions = query({
  args: {
    testId: v.string(),
  },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query('questions')
      .withIndex('by_test', (q) => q.eq('testId', args.testId))
      .collect();

    // Sort by optional order property
    return questions.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
});

/**
 * Seed assessment questions into Convex if empty
 */
export const seedAssessment = mutation({
  args: {
    title: v.string(),
    durationSeconds: v.number(),
    category: v.string(),
    description: v.string(),
    totalMarks: v.number(),
    passMarks: v.number(),
    questions: v.array(
      v.object({
        text: v.string(),
        codeSnippet: v.optional(v.string()),
        options: v.array(
          v.object({
            id: v.string(),
            text: v.string(),
          })
        ),
        correctOptionId: v.string(),
        marks: v.number(),
        negativeMarks: v.number(),
        explanation: v.string(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check if already seeded
    const existing = await ctx.db
      .query('tests')
      .filter((q) => q.eq(q.field('title'), args.title))
      .first();

    if (existing) {
      return { testId: existing._id, status: 'already_exists' };
    }

    const testId = await ctx.db.insert('tests', {
      title: args.title,
      durationSeconds: args.durationSeconds,
      category: args.category,
      description: args.description,
      totalMarks: args.totalMarks,
      passMarks: args.passMarks,
    });

    for (const q of args.questions) {
      await ctx.db.insert('questions', {
        testId: testId.toString(),
        text: q.text,
        codeSnippet: q.codeSnippet,
        options: q.options,
        correctOptionId: q.correctOptionId,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        explanation: q.explanation,
        order: q.order,
      });
    }

    return { testId, status: 'seeded', count: args.questions.length };
  },
});

export const listTests = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('tests').collect();
  },
});

export const deleteTest = mutation({
  args: {
    testId: v.string(),
  },
  handler: async (ctx, args) => {
    const tests = await ctx.db.query('tests').collect();
    const matching = tests.filter(
      (t) => t._id.toString() === args.testId || t.title.toLowerCase() === args.testId.toLowerCase()
    );

    for (const t of matching) {
      await ctx.db.delete(t._id);
      // Clean up associated questions
      const questions = await ctx.db
        .query('questions')
        .withIndex('by_test', (q) => q.eq('testId', t._id.toString()))
        .collect();
      for (const q of questions) {
        await ctx.db.delete(q._id);
      }
    }

    return { success: true, count: matching.length };
  },
});

