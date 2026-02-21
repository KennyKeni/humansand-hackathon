import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  whiteboards: defineTable({
    roomId: v.string(),
    elements: v.string(),
    cursors: v.optional(v.string()),
  }).index("by_roomId", ["roomId"]),
});
