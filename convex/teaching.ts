import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const startCapture = mutation({
  args: { sessionCode: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("teachingSessions")
      .withIndex("by_sessionCode", (q) =>
        q.eq("sessionCode", args.sessionCode),
      )
      .first();

    if (existing) {
      // Reset existing session
      await ctx.db.patch(existing._id, {
        status: "capturing",
        startedAt: Date.now(),
        completedAt: undefined,
        summary: undefined,
        snapshotCount: 0,
      });

      // Delete old snapshots
      const oldSnapshots = await ctx.db
        .query("teachingSnapshots")
        .withIndex("by_sessionCode", (q) =>
          q.eq("sessionCode", args.sessionCode),
        )
        .collect();
      for (const snap of oldSnapshots) {
        await ctx.db.delete(snap._id);
      }

      return existing._id;
    }

    return await ctx.db.insert("teachingSessions", {
      sessionCode: args.sessionCode,
      status: "capturing",
      startedAt: Date.now(),
      snapshotCount: 0,
    });
  },
});

export const addSnapshot = mutation({
  args: {
    sessionCode: v.string(),
    description: v.string(),
    elementHash: v.number(),
    capturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("teachingSnapshots", {
      sessionCode: args.sessionCode,
      description: args.description,
      capturedAt: args.capturedAt,
      elementHash: args.elementHash,
    });

    const session = await ctx.db
      .query("teachingSessions")
      .withIndex("by_sessionCode", (q) =>
        q.eq("sessionCode", args.sessionCode),
      )
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        snapshotCount: session.snapshotCount + 1,
      });
    }
  },
});

export const completeCapture = mutation({
  args: {
    sessionCode: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("teachingSessions")
      .withIndex("by_sessionCode", (q) =>
        q.eq("sessionCode", args.sessionCode),
      )
      .first();

    if (!session)
      throw new Error(`No teaching session found: ${args.sessionCode}`);

    await ctx.db.patch(session._id, {
      status: "completed",
      completedAt: Date.now(),
      summary: args.summary,
    });
  },
});

export const setCaptureStatus = mutation({
  args: {
    sessionCode: v.string(),
    status: v.union(
      v.literal("capturing"),
      v.literal("synthesizing"),
      v.literal("completed"),
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("teachingSessions")
      .withIndex("by_sessionCode", (q) =>
        q.eq("sessionCode", args.sessionCode),
      )
      .first();

    if (!session) return;
    await ctx.db.patch(session._id, { status: args.status });
  },
});

export const getCaptureSession = query({
  args: { sessionCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teachingSessions")
      .withIndex("by_sessionCode", (q) =>
        q.eq("sessionCode", args.sessionCode),
      )
      .first();
  },
});

export const getCaptureSnapshots = query({
  args: { sessionCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teachingSnapshots")
      .withIndex("by_sessionCode", (q) =>
        q.eq("sessionCode", args.sessionCode),
      )
      .collect();
  },
});
