import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let code: string;
    do {
      code = generateCode();
    } while (
      await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique()
    );

    const sessionId = await ctx.db.insert("sessions", {
      code,
      title,
      createdBy: userId,
      active: true,
    });

    await ctx.db.insert("sessionMembers", {
      sessionId,
      userId,
      role: "creator",
    });

    return { code };
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
  },
});
