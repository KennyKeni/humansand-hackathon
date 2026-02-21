import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    sessionId: v.id("sessions"),
    name: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, { sessionId, name, memberIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.createdBy !== userId) throw new Error("Only the session creator can create groups");

    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Group name must be non-empty");

    const uniqueMemberIds = [...new Set(memberIds)];
    if (uniqueMemberIds.length < 2) throw new Error("Group must have at least 2 members");

    for (const memberId of uniqueMemberIds) {
      const membership = await ctx.db
        .query("sessionMembers")
        .withIndex("by_session_user", (q) =>
          q.eq("sessionId", sessionId).eq("userId", memberId)
        )
        .unique();
      if (!membership) throw new Error(`User ${memberId} is not a member of this session`);
    }

    const groupId = await ctx.db.insert("groups", {
      sessionId,
      name: trimmedName,
      memberIds: uniqueMemberIds,
      createdBy: userId,
    });

    const mainWhiteboard = await ctx.db
      .query("whiteboards")
      .withIndex("by_roomId", (q) => q.eq("roomId", session.code))
      .first();

    await ctx.db.insert("whiteboards", {
      roomId: `group-${groupId}`,
      elements: mainWhiteboard?.elements ?? "[]",
    });

    return groupId;
  },
});

export const createFromSystem = mutation({
  args: {
    sessionId: v.id("sessions"),
    name: v.string(),
    memberIds: v.array(v.id("users")),
    creatorId: v.id("users"),
  },
  handler: async (ctx, { sessionId, name, memberIds, creatorId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const uniqueMemberIds = [...new Set(memberIds)];

    const groupId = await ctx.db.insert("groups", {
      sessionId,
      name,
      memberIds: uniqueMemberIds,
      createdBy: creatorId,
    });

    const mainWhiteboard = await ctx.db
      .query("whiteboards")
      .withIndex("by_roomId", (q) => q.eq("roomId", session.code))
      .first();

    await ctx.db.insert("whiteboards", {
      roomId: `group-${groupId}`,
      elements: mainWhiteboard?.elements ?? "[]",
    });

    return groupId;
  },
});

export const getMyGroups = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(sessionId);
    if (!session) return [];

    const isCreator = session.createdBy === userId;

    const allGroups = await ctx.db
      .query("groups")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    if (isCreator) return allGroups;

    return allGroups.filter((g) => g.memberIds.includes(userId));
  },
});

export const end = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("Group not found");
    if (group.endedAt) throw new Error("Group already ended");

    const session = await ctx.db.get(group.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.createdBy !== userId) throw new Error("Only the session creator can end groups");

    await ctx.db.patch(groupId, { endedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.ai.summarizeGroup, { groupId });
  },
});

export const endAll = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.createdBy !== userId) throw new Error("Only the session creator can end groups");

    const groups = await ctx.db
      .query("groups")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    const active = groups.filter((g) => !g.endedAt);
    for (const group of active) {
      await ctx.db.patch(group._id, { endedAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.ai.summarizeGroup, { groupId: group._id });
    }

    return active.length;
  },
});

export const saveSummary = internalMutation({
  args: {
    groupId: v.id("groups"),
    summary: v.string(),
  },
  handler: async (ctx, { groupId, summary }) => {
    await ctx.db.patch(groupId, { summary });
  },
});

export const getById = internalQuery({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    return await ctx.db.get(groupId);
  },
});
