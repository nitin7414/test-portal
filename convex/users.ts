import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Convex Users API
 * Provides database queries and mutations for student and administrator accounts.
 */

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('users').collect();
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase()))
      .first();
  },
});

export const getUserByStudentId = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_studentId', (q) => q.eq('studentId', args.studentId.toUpperCase()))
      .first();
  },
});

export const upsertUser = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    let existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase()))
      .first();

    if (!existing && args.studentId) {
      existing = await ctx.db
        .query('users')
        .withIndex('by_studentId', (q) => q.eq('studentId', args.studentId!.toUpperCase()))
        .first();
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email.toLowerCase(),
        role: args.role,
        isSuperAdmin: args.isSuperAdmin,
        studentId: args.studentId,
        batch: args.batch,
        subject: args.subject,
        passwordHash: args.passwordHash,
        plainPassword: args.plainPassword,
        status: args.status,
      });
      return existing._id;
    } else {
      return await ctx.db.insert('users', {
        ...args,
        email: args.email.toLowerCase(),
      });
    }
  },
});

export const seedInitialUsers = mutation({
  args: {
    users: v.array(
      v.object({
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
    ),
  },
  handler: async (ctx, args) => {
    const insertedIds = [];
    for (const u of args.users) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', u.email.toLowerCase()))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: u.name,
          role: u.role,
          isSuperAdmin: u.isSuperAdmin,
          studentId: u.studentId,
          batch: u.batch,
          subject: u.subject,
          passwordHash: u.passwordHash,
          plainPassword: u.plainPassword,
          status: u.status,
        });
        insertedIds.push(existing._id);
      } else {
        const id = await ctx.db.insert('users', {
          ...u,
          email: u.email.toLowerCase(),
        });
        insertedIds.push(id);
      }
    }
    return insertedIds;
  },
});
