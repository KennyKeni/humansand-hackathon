import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const send = mutation({
  args: {
    sessionId: v.id("sessions"),
    body: v.string(),
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, { sessionId, body, groupId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 2000) {
      throw new Error("Message must be 1-2000 characters");
    }

    if (groupId) {
      const group = await ctx.db.get(groupId);
      if (!group) throw new Error("Group not found");

      const session = await ctx.db.get(group.sessionId);
      if (!session) throw new Error("Session not found");

      const isCreator = session.createdBy === userId;
      const isMember = group.memberIds.includes(userId);
      if (!isCreator && !isMember) throw new Error("Not authorized to send messages in this group");
    }

    await ctx.db.insert("messages", {
      sessionId,
      authorId: userId,
      body: trimmed,
      groupId,
    });
  },
});

export const listBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .filter((q) => q.eq(q.field("groupId"), undefined))
      .order("desc")
      .take(200);

    const reversed = messages.reverse();

    return await Promise.all(
      reversed.map(async (msg) => {
        const user = await ctx.db.get(msg.authorId);
        return {
          ...msg,
          authorName: user?.name ?? "Anonymous",
        };
      })
    );
  },
});

export const listByGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("Group not found");

    const session = await ctx.db.get(group.sessionId);
    if (!session) throw new Error("Session not found");

    const isCreator = session.createdBy === userId;
    const isMember = group.memberIds.includes(userId);
    if (!isCreator && !isMember) throw new Error("Not authorized to view this group's messages");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .order("desc")
      .take(200);

    const reversed = messages.reverse();

    return await Promise.all(
      reversed.map(async (msg) => {
        const user = await ctx.db.get(msg.authorId);
        return {
          ...msg,
          authorName: user?.name ?? "Anonymous",
        };
      })
    );
  },
});
