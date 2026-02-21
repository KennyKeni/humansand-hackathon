import { mutation } from "./_generated/server";

export const fixRole = mutation({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("sessionMembers").collect();
    for (const member of members) {
      if ((member.role as string) === "professor") {
        await ctx.db.patch(member._id, { role: "creator" });
      }
      if ((member.role as string) === "student") {
        await ctx.db.patch(member._id, { role: "participant" });
      }
    }
  },
});
