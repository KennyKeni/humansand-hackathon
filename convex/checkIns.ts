import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const startCheckIn = mutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    lessonSummary: v.string(),
    openingMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const checkInId = await ctx.db.insert("checkIns", {
      sessionId: args.sessionId,
      userId: args.userId,
      status: "active",
      lessonSummary: args.lessonSummary,
      startedAt: Date.now(),
    });

    await ctx.db.insert("checkInMessages", {
      checkInId,
      role: "assistant",
      body: args.openingMessage,
    });

    return checkInId;
  },
});

export const addAssistantMessage = mutation({
  args: {
    checkInId: v.id("checkIns"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("checkInMessages", {
      checkInId: args.checkInId,
      role: "assistant",
      body: args.body,
    });
  },
});

export const sendStudentMessage = mutation({
  args: {
    checkInId: v.id("checkIns"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn) throw new Error("Check-in not found");
    if (checkIn.userId !== userId) throw new Error("Not your check-in");
    if (checkIn.status !== "active") throw new Error("Check-in is not active");

    return await ctx.db.insert("checkInMessages", {
      checkInId: args.checkInId,
      role: "student",
      body: args.body,
      userId,
    });
  },
});

export const completeCheckIn = mutation({
  args: {
    checkInId: v.id("checkIns"),
  },
  handler: async (ctx, args) => {
    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn) throw new Error("Check-in not found");

    await ctx.db.patch(args.checkInId, {
      status: "completed",
      completedAt: Date.now(),
    });
  },
});

export const getMyCheckIn = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("checkIns")
      .withIndex("by_session_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", userId),
      )
      .first();
  },
});

export const listMessages = query({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("checkInMessages")
      .withIndex("by_checkIn", (q) => q.eq("checkInId", args.checkInId))
      .collect();
  },
});

export const getSessionCheckInStatus = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const allCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const active = allCheckIns.filter((c) => c.status === "active").length;
    const completed = allCheckIns.filter((c) => c.status === "completed").length;
    const total = allCheckIns.length;

    return { active, completed, total, checkIns: allCheckIns };
  },
});

// System-level message insertion (no auth check, for simulation/API routes)
export const addStudentMessageSystem = mutation({
  args: {
    checkInId: v.id("checkIns"),
    body: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("checkInMessages", {
      checkInId: args.checkInId,
      role: "student",
      body: args.body,
      userId: args.userId,
    });
  },
});
