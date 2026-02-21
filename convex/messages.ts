import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const send = mutation({
  args: {
    sessionId: v.id("sessions"),
    body: v.string(),
  },
  handler: async (ctx, { sessionId, body }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 2000) {
      throw new Error("Message must be 1-2000 characters");
    }

    await ctx.db.insert("messages", {
      sessionId,
      authorId: userId,
      body: trimmed,
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
