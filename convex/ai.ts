"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const summarySchema = z.object({
  overallSummary: z.string().describe("General takeaway of the group discussion - what was understood, what was not"),
  participants: z.array(
    z.object({
      userId: z.string().describe("The user's internal ID"),
      name: z.string().describe("The user's display name"),
      strengths: z.array(z.string()).describe("Topics or concepts this student understood well"),
      weaknesses: z.array(z.string()).describe("Topics or concepts this student struggled with or showed gaps in"),
    })
  ),
});

type GroupSummary = z.infer<typeof summarySchema>;

function formatSummaryForChat(summary: GroupSummary): string {
  let text = `**Group Summary**\n\n${summary.overallSummary}\n`;

  for (const p of summary.participants) {
    text += `\n**${p.name}**\n`;
    if (p.strengths.length > 0) {
      text += `- Strengths: ${p.strengths.join(", ")}\n`;
    }
    if (p.weaknesses.length > 0) {
      text += `- Gaps: ${p.weaknesses.join(", ")}\n`;
    }
  }

  return text;
}

export const summarizeGroup = internalAction({
  args: {
    groupId: v.id("groups"),
    whiteboardContext: v.optional(v.string()),
  },
  handler: async (ctx, { groupId }) => {
    const group = await ctx.runQuery(internal.groups.getById, { groupId });
    if (!group) {
      await ctx.runMutation(internal.groups.saveSummary, {
        groupId,
        summary: JSON.stringify({ error: true, message: "Summary could not be generated." }),
      });
      await ctx.runMutation(internal.messages.postAIMessage, {
        groupId,
        body: "Summary could not be generated.",
      });
      return;
    }

    const allMessages = await ctx.runQuery(
      internal.messages.getGroupMessages,
      { groupId }
    );

    if (allMessages.length === 0) {
      await ctx.runMutation(internal.groups.saveSummary, {
        groupId,
        summary: JSON.stringify({ error: true, message: "No messages to summarize." }),
      });
      await ctx.runMutation(internal.messages.postAIMessage, {
        groupId,
        body: "No messages to summarize.",
      });
      return;
    }

    try {
      let messagesToUse = allMessages;
      if (messagesToUse.length > 100) {
        messagesToUse = [
          ...messagesToUse.slice(0, 10),
          ...messagesToUse.slice(-90),
        ];
      }

      const conversationText = messagesToUse
        .map((m) => {
          const body =
            m.body.length > 500 ? m.body.slice(0, 500) + "..." : m.body;
          return `${m.authorName}: ${body}`;
        })
        .join("\n");

      const participants = [
        ...new Map(
          allMessages
            .filter((m) => m.role !== "ai" && m.authorId)
            .map((m) => [m.authorId, m.authorName])
        ).entries(),
      ].map(([id, name]) => ({ userId: id as string, name: name as string }));

      const { object: summary } = await generateObject({
        model: anthropic("claude-sonnet-4-6"),
        maxRetries: 3,
        schema: summarySchema,
        prompt: `You are an AI teaching assistant analyzing a student group discussion.

Participants (with internal IDs):
${participants.map((p) => `- ${p.name} (ID: ${p.userId})`).join("\n")}

Conversation:
${conversationText}

Analyze the discussion and for each participant, identify what topics/concepts they understood well (strengths) and where they showed gaps or confusion (weaknesses). Also provide an overall summary of the group's discussion.

Use the exact user IDs provided above in your response.`,
      });

      await ctx.runMutation(internal.groups.saveSummary, {
        groupId,
        summary: JSON.stringify(summary),
      });

      await ctx.runMutation(internal.messages.postAIMessage, {
        groupId,
        body: formatSummaryForChat(summary),
      });
    } catch (error) {
      console.error("AI summary failed:", error);
      await ctx.runMutation(internal.groups.saveSummary, {
        groupId,
        summary: JSON.stringify({ error: true, message: "Summary could not be generated." }),
      });
      await ctx.runMutation(internal.messages.postAIMessage, {
        groupId,
        body: "Summary could not be generated.",
      });
    }
  },
});
