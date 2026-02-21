import { v } from "convex/values";
import { mutation } from "./_generated/server";

const STUDENT_NAMES = [
  "Alice Chen",
  "Bob Martinez",
  "Charlie Kim",
  "Diana Patel",
  "Ethan Johnson",
  "Fiona O'Brien",
  "George Tanaka",
  "Hannah Lee",
  "Ivan Petrov",
  "Julia Santos",
  "Kevin Nguyen",
  "Lara Schmidt",
  "Marcus Williams",
  "Nadia Ahmed",
  "Oscar Rivera",
];

export const seedStudents = mutation({
  args: {
    sessionId: v.id("sessions"),
    count: v.number(),
  },
  handler: async (ctx, { sessionId, count }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const created = [];
    for (let i = 0; i < count && i < STUDENT_NAMES.length; i++) {
      const name = STUDENT_NAMES[i];

      const userId = await ctx.db.insert("users", {
        name,
        isAnonymous: true,
      });

      await ctx.db.insert("sessionMembers", {
        sessionId,
        userId,
        role: "participant",
      });

      created.push({ userId, name });
    }

    return { created: created.length, students: created };
  },
});

export const clearCheckInData = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    // Delete check-in messages
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    for (const checkIn of checkIns) {
      const messages = await ctx.db
        .query("checkInMessages")
        .withIndex("by_checkIn", (q) => q.eq("checkInId", checkIn._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
      await ctx.db.delete(checkIn._id);
    }

    // Delete comprehension profiles
    const profiles = await ctx.db
      .query("comprehension")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const p of profiles) {
      await ctx.db.delete(p._id);
    }

    // Delete proposed matches
    const matches = await ctx.db
      .query("proposedMatches")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const m of matches) {
      await ctx.db.delete(m._id);
    }

    // Delete groups and their whiteboards and messages
    const groups = await ctx.db
      .query("groups")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const group of groups) {
      // Delete group messages
      const groupMessages = await ctx.db
        .query("messages")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();
      for (const msg of groupMessages) {
        await ctx.db.delete(msg._id);
      }
      // Delete group whiteboard
      const wb = await ctx.db
        .query("whiteboards")
        .withIndex("by_roomId", (q) => q.eq("roomId", `group-${group._id}`))
        .first();
      if (wb) await ctx.db.delete(wb._id);
      // Delete the group
      await ctx.db.delete(group._id);
    }

    // Reset checkInPhase on teaching session
    const sessions = await ctx.db.query("teachingSessions").collect();
    for (const s of sessions) {
      if (s.checkInPhase) {
        await ctx.db.patch(s._id, { checkInPhase: undefined });
      }
    }

    return { cleared: checkIns.length, groupsDeleted: groups.length };
  },
});
