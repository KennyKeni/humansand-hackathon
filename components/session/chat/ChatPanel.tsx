"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { ActiveContext } from "@/app/session/[code]/page";

export function ChatPanel({
  sessionId,
  currentUserId,
  activeContext,
}: {
  sessionId: Id<"sessions">;
  currentUserId: Id<"users"> | null;
  activeContext: ActiveContext;
}) {
  const sessionMessages = useQuery(
    api.messages.listBySession,
    activeContext.type === "main" ? { sessionId } : "skip"
  );
  const groupMessages = useQuery(
    api.messages.listByGroup,
    activeContext.type === "group" ? { groupId: activeContext.groupId } : "skip"
  );

  const messages = (activeContext.type === "main" ? sessionMessages : groupMessages) ?? [];

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} currentUserId={currentUserId} />
      <MessageInput
        sessionId={sessionId}
        groupId={activeContext.type === "group" ? activeContext.groupId : undefined}
      />
    </div>
  );
}
