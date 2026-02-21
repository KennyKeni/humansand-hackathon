import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { sessionId, sessionCode, creatorId } = await req.json();

    if (!sessionId || !sessionCode || !creatorId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Fetch proposed matches
    const proposed = await convex.query(api.matches.getProposedMatches, {
      sessionId,
    });

    if (!proposed || proposed.groups.length === 0) {
      return NextResponse.json(
        { error: "No proposed matches found" },
        { status: 400 },
      );
    }

    // Get member names for the opening messages
    const members = await convex.query(api.sessionMembers.listMembersSystem, {
      sessionId,
    });
    const nameMap = new Map(members.map((m) => [m.userId, m.name]));

    // Distribute unmatched students round-robin into groups (smallest first)
    const finalGroups = proposed.groups.map((g) => ({
      ...g,
      memberIds: [...g.memberIds] as Id<"users">[],
    }));

    for (const unmatchedId of proposed.unmatchedIds) {
      let smallestIdx = 0;
      for (let i = 1; i < finalGroups.length; i++) {
        if (finalGroups[i].memberIds.length < finalGroups[smallestIdx].memberIds.length) {
          smallestIdx = i;
        }
      }
      finalGroups[smallestIdx].memberIds.push(unmatchedId as Id<"users">);
    }

    // Create actual group records and send opening messages
    const createdGroups = await Promise.all(
      finalGroups.map(async (group) => {
        const groupId = await convex.mutation(api.groups.createFromSystem, {
          sessionId,
          name: group.name,
          memberIds: group.memberIds,
          creatorId,
        });

        // Build member names list
        const memberNames = group.memberIds
          .map((id) => nameMap.get(id as string) ?? "Unknown")
          .join(", ");

        // Send an opening message from the teacher explaining the group
        const openingMessage =
          `Welcome to "${group.name}"! You've been grouped together because: ${group.reason}\n\n` +
          `Members: ${memberNames}\n\n` +
          `Use this space to discuss the lesson topics and help each other learn. Good luck!`;

        await convex.mutation(api.messages.sendSystem, {
          sessionId,
          authorId: creatorId as Id<"users">,
          body: openingMessage,
          groupId,
          isSystem: true,
        });

        return { groupId, name: group.name, memberIds: group.memberIds };
      }),
    );

    // Set phase to grouped
    await convex.mutation(api.teaching.setCheckInPhase, {
      sessionCode,
      checkInPhase: "grouped",
    });

    return NextResponse.json({ groups: createdGroups });
  } catch (error) {
    console.error("Send to rooms error:", error);
    return NextResponse.json(
      { error: "Failed to create discussion rooms" },
      { status: 500 },
    );
  }
}
