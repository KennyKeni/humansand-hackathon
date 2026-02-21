import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const join = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("sessionMembers")
      .withIndex("by_session_user", (q) =>
        q.eq("sessionId", sessionId).eq("userId", userId)
      )
      .unique();

    if (existing) return existing._id;

    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const role = session.createdBy === userId ? "creator" : "participant";

    return await ctx.db.insert("sessionMembers", {
      sessionId,
      userId,
      role,
    });
  },
});

export const getMyMembership = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("sessionMembers")
      .withIndex("by_session_user", (q) =>
        q.eq("sessionId", sessionId).eq("userId", userId)
      )
      .unique();
  },
});

export const listMembers = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const members = await ctx.db
      .query("sessionMembers")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    return await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          name: user?.name ?? "Anonymous",
        };
      })
    );
  },
});
