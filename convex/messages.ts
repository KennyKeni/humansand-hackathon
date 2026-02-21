import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Min student messages since last AI response before eval triggers. Set to 2 for demos.
const AI_EVAL_THRESHOLD = 4;

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
      if (group.sessionId !== sessionId) throw new Error("Group does not belong to this session");
      if (group.endedAt) throw new Error("This group has ended");

      const session = await ctx.db.get(group.sessionId);
      if (!session) throw new Error("Session not found");

      const isCreator = session.createdBy === userId;
      const isMember = group.memberIds.includes(userId);
      if (!isCreator && !isMember) throw new Error("Not authorized to send messages in this group");
    } else {
      const membership = await ctx.db
        .query("sessionMembers")
        .withIndex("by_session_user", (q) =>
          q.eq("sessionId", sessionId).eq("userId", userId)
        )
        .unique();
      if (!membership) throw new Error("Not a session member");
    }

    await ctx.db.insert("messages", {
      sessionId,
      authorId: userId,
      body: trimmed,
      groupId,
    });

    if (groupId) {
      const group = await ctx.db.get(groupId);
      if (group && !group.endedAt) {
        const recentMsgs = await ctx.db
          .query("messages")
          .withIndex("by_group", (q) => q.eq("groupId", groupId))
          .order("desc")
          .take(50);

        let studentCount = 0;
        for (const m of recentMsgs) {
          if (m.role === "ai") break;
          studentCount++;
        }

        if (studentCount >= AI_EVAL_THRESHOLD && studentCount % 2 === 0) {
          await ctx.scheduler.runAfter(0, internal.ai.evaluateGroupChat, {
            groupId,
            trigger: "content" as const,
          });
        }

        await ctx.scheduler.runAfter(90_000, internal.ai.evaluateGroupChat, {
          groupId,
          trigger: "dead_air" as const,
          scheduledAt: Date.now(),
        });
      }
    }
  },
});

// System-level send for API routes (no auth check)
export const sendSystem = mutation({
  args: {
    sessionId: v.id("sessions"),
    authorId: v.id("users"),
    body: v.string(),
    groupId: v.optional(v.id("groups")),
    isSystem: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionId, authorId, body, groupId, isSystem }) => {
    await ctx.db.insert("messages", {
      sessionId,
      authorId,
      body,
      groupId,
      isSystem: isSystem ?? undefined,
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
        const user = msg.authorId ? await ctx.db.get(msg.authorId) : null;
        return {
          ...msg,
          authorName: msg.isSystem ? "AI Teaching Assistant" : msg.role === "ai" ? "AI Assistant" : (user?.name ?? "Anonymous"),
          role: msg.role,
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
        const user = msg.authorId ? await ctx.db.get(msg.authorId) : null;
        return {
          ...msg,
          authorName: msg.isSystem ? "AI Teaching Assistant" : msg.role === "ai" ? "AI Assistant" : (user?.name ?? "Anonymous"),
          role: msg.role,
        };
      })
    );
  },
});

export const postAIMessage = internalMutation({
  args: {
    groupId: v.id("groups"),
    body: v.string(),
    source: v.optional(v.union(v.literal("nudge"), v.literal("summary"))),
  },
  handler: async (ctx, { groupId, body, source }) => {
    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("Group not found");

    if (source === "nudge") {
      if (group.endedAt) return;
      const lastMsg = await ctx.db
        .query("messages")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .order("desc")
        .first();
      if (lastMsg?.role === "ai") return;
    }

    await ctx.db.insert("messages", {
      sessionId: group.sessionId,
      groupId,
      body,
      role: "ai",
    });
  },
});

export const getGroupMessages = internalQuery({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    return await Promise.all(
      messages.map(async (msg) => {
        const authorName = msg.authorId
          ? (await ctx.db.get(msg.authorId))?.name ?? "Anonymous"
          : "AI Assistant";
        return {
          body: msg.body,
          authorName,
          authorId: msg.authorId,
          role: msg.role,
        };
      })
    );
  },
});

export const getRecentGroupMessagesWithTime = internalQuery({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .order("desc")
      .take(30);
    return await Promise.all(
      messages.reverse().map(async (msg) => {
        const authorName = msg.authorId
          ? (await ctx.db.get(msg.authorId))?.name ?? "Anonymous"
          : "AI Assistant";
        return {
          body: msg.body,
          authorName,
          authorId: msg.authorId,
          role: msg.role,
          _creationTime: msg._creationTime,
        };
      })
    );
  },
});
