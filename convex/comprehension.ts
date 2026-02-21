import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const saveProfile = mutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    checkInId: v.id("checkIns"),
    topics: v.array(
      v.object({
        name: v.string(),
        understood: v.boolean(),
        confidence: v.string(),
        notes: v.optional(v.string()),
      }),
    ),
    overallSummary: v.string(),
  },
  handler: async (ctx, args) => {
    // Upsert: delete existing if any
    const existing = await ctx.db
      .query("comprehension")
      .withIndex("by_session_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", args.userId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("comprehension", {
      sessionId: args.sessionId,
      userId: args.userId,
      checkInId: args.checkInId,
      topics: args.topics,
      overallSummary: args.overallSummary,
      extractedAt: Date.now(),
    });
  },
});

export const getBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comprehension")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});
