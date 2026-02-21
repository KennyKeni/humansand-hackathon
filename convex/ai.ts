"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const evalSchema = z.object({
  shouldRespond: z.boolean().describe("Whether to respond. Default to false unless a clear trigger is detected."),
  trigger: z.enum(["misconception", "stuck", "shallow", "comprehension_check"]).nullable().describe("Which failure mode was detected, or null"),
  message: z.string().describe("The short peer-style message to send. Only used if shouldRespond is true."),
});

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

// Set to true for demo — AI responds more aggressively to show off all 3 triggers.
const DEMO_MODE = false;

export const evaluateGroupChat = internalAction({
  args: {
    groupId: v.id("groups"),
    trigger: v.union(v.literal("content"), v.literal("dead_air")),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, { groupId, trigger, scheduledAt }) => {
    const group = await ctx.runQuery(internal.groups.getById, { groupId });
    if (!group || group.endedAt) return;

    const messages = await ctx.runQuery(
      internal.messages.getRecentGroupMessagesWithTime,
      { groupId }
    );

    if (messages.length === 0 && trigger === "dead_air") return;

    let studentCount = 0;
    let lastAiTime: number | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "ai") {
        lastAiTime = messages[i]._creationTime;
        break;
      }
      studentCount++;
    }

    if (trigger === "content") {
      if (studentCount < 2) return;
    } else {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && scheduledAt && lastMsg._creationTime > scheduledAt) return;
      if (lastAiTime && Date.now() - lastAiTime < 2 * 60 * 1000) return;
    }

    const conversationText = messages
      .map((m) => `${m.authorName}: ${m.body}`)
      .join("\n");

    // TODO: Add whiteboard context here for better misconception detection.
    // Will be integrated from the teaching capture branch.
    // Pass whiteboard snapshot text alongside conversation for correctness checking.

    try {
      const { object: evaluation } = await generateObject({
        model: anthropic("claude-sonnet-4-6"),
        schema: evalSchema,
        prompt: `You are a fellow student in a peer study group, NOT a teacher or tutor. You're reviewing the recent conversation to decide if you should chime in.

You do NOT have perfect knowledge of the subject matter. You might be wrong too. Frame your interventions as genuine curiosity or confusion, not as corrections from authority. If you think something might be off, question it -- but acknowledge you could be the one who's mistaken. Say things like "wait, I might be wrong but..." or "hmm I'm not sure that's right, wouldn't [X] mean...?"

The group is studying: ${group.name}

IMPORTANT: Most of the time, the conversation is going fine and you should NOT respond. Only respond if you clearly detect one of these three problems:

1. MISCONCEPTION: A student is explaining something incorrectly to another student. This is the most critical -- wrong info spreading is worse than no learning. But ONLY intervene if the misconception goes unchallenged -- if another student already questioned it or is working through it, stay out. Don't correct directly and NEVER hint at the right answer. Just ask a short, confused question that highlights the ambiguity. Let the students figure it out.
   Example: "wait, which ones are you multiplying together?" or "hmm are you sure about that part?"
   BAD example (too revealing): "wouldn't you multiply by the OTHER fraction?" -- this gives away the answer.

2. STUCK: The conversation has stalled -- students are saying "idk", going silent, or going in circles. Reframe the problem or suggest a concrete approach to try. NEVER reference "class", "the professor", "the lecture", or anything you haven't directly seen in this conversation -- you don't have that context and will make things up.
   Example: "what if you try writing out a specific example with numbers?" or "maybe break it into smaller steps?"

3. SHALLOW AGREEMENT: Students are agreeing with each other but their understanding is surface-level -- parroting definitions without real comprehension. Only intervene if this pattern persists across multiple messages -- not just one agreement. Ask a probing edge-case question to test depth.
   Example: "ok but what happens if the input is empty?" or "would that still work with duplicates?"

4. COMPREHENSION CHECK: A student who was struggling with something seems to have learned it from a peer, but it's not clear they actually understood -- they just said "oh ok" or "makes sense" without demonstrating understanding. Ask one casual follow-up question to check. Do NOT keep quizzing them -- one question is enough. If they already explained it back in their own words, they understood and you should stay out.
   Example: "so wait, could you explain that back to me? I'm still confused" or "so what would happen if we tried it with [different input]?"

Rules:
- If the conversation is productive and students are learning, respond with shouldRespond: false
- Keep your message to 1-2 short sentences, like a real student would text
- Never use formal language, bullet points, or long explanations
- Never say "great question" or "that's interesting" -- be natural
- Ask questions, never give answers
- You are a peer who might also be wrong, not an authority
- NEVER reference "class", "the professor", "the lecture", or "the board" -- you only know what's in this conversation
${DEMO_MODE ? "" : "- When in doubt, don't respond"}
Recent conversation:
${conversationText}`,
      });

      if (evaluation.shouldRespond) {
        await ctx.runMutation(internal.messages.postAIMessage, {
          groupId,
          body: evaluation.message,
          source: "nudge",
        });
      }
    } catch (error) {
      console.error("AI group evaluation failed:", error);
    }

    await ctx.scheduler.runAfter(90_000, internal.ai.evaluateGroupChat, {
      groupId,
      trigger: "dead_air",
      scheduledAt: Date.now(),
    });
  },
});

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
