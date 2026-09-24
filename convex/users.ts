import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Convex Users API
 * Provides database queries and mutations for student and administrator accounts.
 */

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    return users.map((u) => {
      const { plainPassword, ...safe } = u as any;
      return safe;
    });
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase()))
      .first();
    if (!user) return null;
    const { plainPassword, ...safe } = user as any;
    return safe;
  },
});

export const getUserByStudentId = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_studentId', (q) => q.eq('studentId', args.studentId.toUpperCase()))
      .first();
    if (!user) return null;
    const { plainPassword, ...safe } = user as any;
    return safe;
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

    const { plainPassword: _ignore, ...safeArgs } = args;

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
        status: args.status,
      });
      return existing._id;
    } else {
      return await ctx.db.insert('users', {
        ...safeArgs,
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
      const { plainPassword: _ignore, ...safeUser } = u;
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
          status: u.status,
        });
        insertedIds.push(existing._id);
      } else {
        const id = await ctx.db.insert('users', {
          ...safeUser,
          email: u.email.toLowerCase(),
        });
        insertedIds.push(id);
      }
    }
    return insertedIds;
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    studentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Developer Administrator is protected and cannot be deleted
    if (args.email?.toLowerCase() === 'developer@testportal.com' || args.userId === 'usr_admin_dev_001') {
      return { success: false, message: 'Developer Administrator account cannot be deleted.' };
    }

    let deletedCount = 0;

    // Delete by userId
    if (args.userId) {
      const usersById = await ctx.db
        .query('users')
        .filter((q) => q.eq(q.field('userId'), args.userId))
        .collect();
      for (const u of usersById) {
        if (u.userId !== 'usr_admin_dev_001' && u.email.toLowerCase() !== 'developer@testportal.com') {
          await ctx.db.delete(u._id);
          deletedCount++;
        }
      }
    }

    // Delete by email
    if (args.email) {
      const userByEmail = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', args.email!.toLowerCase()))
        .first();
      if (userByEmail && userByEmail.userId !== 'usr_admin_dev_001' && userByEmail.email.toLowerCase() !== 'developer@testportal.com') {
        await ctx.db.delete(userByEmail._id);
        deletedCount++;
      }
    }

    // Delete by studentId
    if (args.studentId) {
      const userByStudentId = await ctx.db
        .query('users')
        .withIndex('by_studentId', (q) => q.eq('studentId', args.studentId!.toUpperCase()))
        .first();
      if (userByStudentId && userByStudentId.userId !== 'usr_admin_dev_001' && userByStudentId.email.toLowerCase() !== 'developer@testportal.com') {
        await ctx.db.delete(userByStudentId._id);
        deletedCount++;
      }

      // Also clean up any attempts related to this studentId
      const attempts = await ctx.db
        .query('attempts')
        .withIndex('by_student_test')
        .filter((q) => q.eq(q.field('studentId'), args.studentId))
        .collect();
      for (const att of attempts) {
        await ctx.db.delete(att._id);
      }
    }

    return { success: true, deletedCount };
  },
});

