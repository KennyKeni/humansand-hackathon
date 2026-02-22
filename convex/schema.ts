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
    authorId: v.optional(v.id("users")),
    body: v.string(),
    isSystem: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("user"), v.literal("ai"))),
  })
    .index("by_session", ["sessionId"])
    .index("by_group", ["groupId"]),

  groups: defineTable({
    sessionId: v.id("sessions"),
    name: v.string(),
    memberIds: v.array(v.id("users")),
    createdBy: v.id("users"),
    endedAt: v.optional(v.number()),
    summary: v.optional(v.string()),
    diagram: v.optional(v.string()),
    diagramUpdatedAt: v.optional(v.number()),
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
    checkInPhase: v.optional(
      v.union(
        v.literal("checking-in"),
        v.literal("matching"),
        v.literal("matched"),
        v.literal("grouped"),
      ),
    ),
  }).index("by_sessionCode", ["sessionCode"]),

  teachingSnapshots: defineTable({
    sessionCode: v.string(),
    description: v.string(),
    capturedAt: v.number(),
    elementHash: v.number(),
  }).index("by_sessionCode", ["sessionCode"]),

  checkIns: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("expired"),
    ),
    lessonSummary: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_user", ["sessionId", "userId"]),

  checkInMessages: defineTable({
    checkInId: v.id("checkIns"),
    role: v.union(v.literal("student"), v.literal("assistant")),
    body: v.string(),
    userId: v.optional(v.id("users")),
  }).index("by_checkIn", ["checkInId"]),

  comprehension: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    checkInId: v.id("checkIns"),
    topics: v.array(
      v.object({
        name: v.string(),
        understood: v.boolean(),
        confidence: v.string(),
        notes: v.optional(v.string()),
      }),
    ),
    overallSummary: v.string(),
    extractedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_user", ["sessionId", "userId"]),

  proposedMatches: defineTable({
    sessionId: v.id("sessions"),
    groups: v.array(
      v.object({
        name: v.string(),
        memberIds: v.array(v.id("users")),
        reason: v.string(),
      }),
    ),
    unmatchedIds: v.array(v.id("users")),
    computedAt: v.number(),
  }).index("by_session", ["sessionId"]),
});

export default schema;
