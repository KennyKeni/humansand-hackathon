import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const saveProposedMatches = mutation({
  args: {
    sessionId: v.id("sessions"),
    groups: v.array(
      v.object({
        name: v.string(),
        memberIds: v.array(v.id("users")),
        reason: v.string(),
      }),
    ),
    unmatchedIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Overwrite previous proposal
    const existing = await ctx.db
      .query("proposedMatches")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("proposedMatches", {
      sessionId: args.sessionId,
      groups: args.groups,
      unmatchedIds: args.unmatchedIds,
      computedAt: Date.now(),
    });
  },
});

export const getProposedMatches = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposedMatches")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});
