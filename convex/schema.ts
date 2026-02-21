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
    groupId: v.optional(v.id("groups")),
    authorId: v.id("users"),
    body: v.string(),
  })
    .index("by_session", ["sessionId"])
    .index("by_group", ["groupId"]),

  groups: defineTable({
    sessionId: v.id("sessions"),
    name: v.string(),
    memberIds: v.array(v.id("users")),
    createdBy: v.id("users"),
  }).index("by_session", ["sessionId"]),

  whiteboards: defineTable({
    roomId: v.string(),
    elements: v.string(),
    cursors: v.optional(v.string()),
  }).index("by_roomId", ["roomId"]),

  teachingSessions: defineTable({
    sessionCode: v.string(),
    status: v.union(
      v.literal("capturing"),
      v.literal("synthesizing"),
      v.literal("completed"),
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    summary: v.optional(v.string()),
    snapshotCount: v.number(),
  }).index("by_sessionCode", ["sessionCode"]),

  teachingSnapshots: defineTable({
    sessionCode: v.string(),
    description: v.string(),
    capturedAt: v.number(),
    elementHash: v.number(),
  }).index("by_sessionCode", ["sessionCode"]),
});

export default schema;
