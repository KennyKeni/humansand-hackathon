import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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
    userId: v.string(),
    cursor: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whiteboards")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!existing) return;

    const cursors: Record<string, unknown> = existing.cursors
      ? JSON.parse(existing.cursors)
      : {};
    cursors[args.userId] = JSON.parse(args.cursor);

    await ctx.db.patch(existing._id, { cursors: JSON.stringify(cursors) });
  },
});

export const removeCursor = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whiteboards")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!existing || !existing.cursors) return;

    const cursors: Record<string, unknown> = JSON.parse(existing.cursors);
    delete cursors[args.userId];

    await ctx.db.patch(existing._id, { cursors: JSON.stringify(cursors) });
  },
});
