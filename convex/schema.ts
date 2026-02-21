import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
  ...authTables,

  sessions: defineTable({
    code: v.string(),
    title: v.string(),
    createdBy: v.id("users"),
    active: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_createdBy", ["createdBy"]),

  sessionMembers: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    role: v.union(v.literal("creator"), v.literal("participant"), v.literal("professor"), v.literal("student")),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_session_user", ["sessionId", "userId"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    authorId: v.id("users"),
    body: v.string(),
  }).index("by_session", ["sessionId"]),

  whiteboards: defineTable({
    roomId: v.string(),
    elements: v.string(),
    cursors: v.optional(v.string()),
  }).index("by_roomId", ["roomId"]),
});

export default schema;
