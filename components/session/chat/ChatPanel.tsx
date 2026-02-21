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
  isEnded,
}: {
  sessionId: Id<"sessions">;
  currentUserId: Id<"users"> | null;
  activeContext: ActiveContext;
  isEnded: boolean;
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
    <div className="flex h-full min-h-0 flex-col">
      <MessageList messages={messages} currentUserId={currentUserId} />
      {isEnded && activeContext.type === "group" ? (
        <div className="flex items-center justify-center border-t px-4 py-3 text-sm text-muted-foreground">
          This group has ended
        </div>
      ) : (
        <MessageInput
          sessionId={sessionId}
          groupId={activeContext.type === "group" ? activeContext.groupId : undefined}
        />
      )}
    </div>
  );
}
