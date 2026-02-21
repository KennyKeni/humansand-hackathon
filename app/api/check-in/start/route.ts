import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { sessionCode, sessionId } = await req.json();

    if (!sessionCode || !sessionId) {
      return NextResponse.json(
        { error: "Missing sessionCode or sessionId" },
        { status: 400 },
      );
    }

    // Get the lesson summary
    const teachingSession = await convex.query(api.teaching.getCaptureSession, {
      sessionCode,
    });

    if (!teachingSession?.summary) {
      return NextResponse.json(
        { error: "No lesson summary available" },
        { status: 400 },
      );
    }

    const lessonSummary = teachingSession.summary;

    // Get all participants (non-creator members)
    const members = await convex.query(api.sessionMembers.listMembersSystem, {
      sessionId,
    });

    const students = members.filter(
      (m) => m.role === "participant" || m.role === "student",
    );

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No students in session" },
        { status: 400 },
      );
    }

    // Set check-in phase
    await convex.mutation(api.teaching.setCheckInPhase, {
      sessionCode,
      checkInPhase: "checking-in",
    });

    // For each student, generate a personalized opening message and create check-in
    const results = await Promise.all(
      students.map(async (student) => {
        const { text: openingMessage } = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          messages: [
            {
              role: "user",
              content: `You are a warm, supportive AI Teaching Assistant checking in with a student after a lesson. Your goal is to understand what they learned and what confused them -- NOT to teach or correct them.

Here is the lesson summary:
${lessonSummary}

The student's name is ${student.name}.

Write a brief, friendly opening message (2-4 sentences) that:
1. Greets them by name
2. References 2-3 specific topics from the lesson
3. Asks what stood out to them and what felt unclear
4. Sets a warm, non-evaluative tone ("I want to understand where you're at so we can get you into the right study group")

Keep it conversational, not formal. Do not use bullet points or lists.`,
            },
          ],
          maxTokens: 300,
        });

        const checkInId = await convex.mutation(api.checkIns.startCheckIn, {
          sessionId,
          userId: student.userId,
          lessonSummary,
          openingMessage,
        });

        return { studentId: student.userId, checkInId };
      }),
    );

    return NextResponse.json({ started: results.length, results });
  } catch (error) {
    console.error("Check-in start error:", error);
    return NextResponse.json(
      { error: "Failed to start check-ins" },
      { status: 500 },
    );
  }
}
