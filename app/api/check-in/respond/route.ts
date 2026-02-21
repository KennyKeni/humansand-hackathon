import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { checkInId } = await req.json();

    if (!checkInId) {
      return NextResponse.json(
        { error: "Missing checkInId" },
        { status: 400 },
      );
    }

    // Fetch all messages (student message was already saved by the frontend)
    const messages = await convex.query(api.checkIns.listMessages, {
      checkInId,
    });

    // Build conversation history for Claude
    const conversationHistory = messages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.body,
    }));

    const exchangeCount = messages.filter((m) => m.role === "student").length;

    const { text: aiResponse } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: `You are a warm, supportive AI Teaching Assistant having a 1-on-1 check-in conversation with a student after a lesson. Your ONLY goal is to understand what they learned and what they're confused about.

RULES:
- Do NOT teach, correct, or explain concepts. If the student says something wrong, acknowledge it and move on.
- Ask follow-up questions about specific topics they mention (or don't mention).
- Keep responses short (2-3 sentences max).
- Be conversational, warm, and supportive.
- Reference specific topics from the lesson when asking follow-ups.

${exchangeCount >= 5 ? "You now have enough information about this student's comprehension. Wrap up warmly with something like: 'Thanks so much! I think I have a good picture of where you're at. Your teacher will get you into a study group soon!'" : "Keep exploring their understanding of the lesson topics."}`,
      messages: conversationHistory,
      maxTokens: 250,
    });

    // Save AI response
    await convex.mutation(api.checkIns.addAssistantMessage, {
      checkInId,
      body: aiResponse,
    });

    const suggestComplete = exchangeCount >= 5;

    return NextResponse.json({ aiResponse, suggestComplete });
  } catch (error) {
    console.error("Check-in respond error:", error);
    return NextResponse.json(
      { error: "Failed to process response" },
      { status: 500 },
    );
  }
}
