import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

export const get = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whiteboards")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();
  },
});

export const saveElements = mutation({
  args: {
    roomId: v.string(),
    elements: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.roomId.startsWith("group-")) {
      const rawId = args.roomId.slice("group-".length);
      let group;
      try {
        group = await ctx.db.get(rawId as Id<"groups">);
      } catch {
        throw new Error("Invalid group");
      }
      if (!group) throw new Error("Invalid group");

      const session = await ctx.db.get(group.sessionId);
      if (!session) throw new Error("Session not found");

      const isCreator = session.createdBy === userId;
      const isMember = group.memberIds.includes(userId);
      if (!isCreator && !isMember) throw new Error("Not authorized to edit this group whiteboard");
      if (group.endedAt) return;
    } else {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("code", args.roomId))
        .first();
      if (!session) throw new Error("Session not found");
      if (session.createdBy !== userId) throw new Error("Only the session creator can edit the main whiteboard");
    }

    const existing = await ctx.db
      .query("whiteboards")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { elements: args.elements });
    } else {
      await ctx.db.insert("whiteboards", {
        roomId: args.roomId,
        elements: args.elements,
      });
    }
  },
});

export const updateCursor = mutation({
  args: {
    roomId: v.string(),
    cursor: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    if (args.roomId.startsWith("group-")) {
      const rawId = args.roomId.slice("group-".length);
      let group;
      try {
        group = await ctx.db.get(rawId as Id<"groups">);
      } catch {
        return;
      }
      if (!group) return;

      const session = await ctx.db.get(group.sessionId);
      if (!session) return;

      const isCreator = session.createdBy === userId;
      const isMember = group.memberIds.includes(userId);
      if (!isCreator && !isMember) return;

      if (group.endedAt) return;
    } else {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("code", args.roomId))
        .first();
      if (!session) return;

      const membership = await ctx.db
        .query("sessionMembers")
        .withIndex("by_session_user", (q) =>
          q.eq("sessionId", session._id).eq("userId", userId)
        )
        .unique();
      if (!membership) return;
    }

    const existing = await ctx.db
      .query("whiteboards")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!existing) return;

    const cursors: Record<string, unknown> = existing.cursors
      ? JSON.parse(existing.cursors)
      : {};
    cursors[userId] = JSON.parse(args.cursor);

    await ctx.db.patch(existing._id, { cursors: JSON.stringify(cursors) });
  },
});

export const removeCursor = mutation({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("whiteboards")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!existing || !existing.cursors) return;

    const cursors: Record<string, unknown> = JSON.parse(existing.cursors);
    delete cursors[userId];

    await ctx.db.patch(existing._id, { cursors: JSON.stringify(cursors) });
  },
});

export const getElements = internalQuery({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const wb = await ctx.db
      .query("whiteboards")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();
    return wb?.elements ?? "[]";
  },
});

export const saveElementsInternal = internalMutation({
  args: { roomId: v.string(), elements: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whiteboards")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { elements: args.elements });
    } else {
      await ctx.db.insert("whiteboards", {
        roomId: args.roomId,
        elements: args.elements,
      });
    }
  },
});
