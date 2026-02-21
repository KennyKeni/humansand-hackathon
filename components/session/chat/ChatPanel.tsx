"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

export function ChatPanel({
  sessionId,
  currentUserId,
}: {
  sessionId: Id<"sessions">;
  currentUserId: Id<"users"> | null;
}) {
  const messages = useQuery(api.messages.listBySession, { sessionId }) ?? [];

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} currentUserId={currentUserId} />
      <MessageInput sessionId={sessionId} />
    </div>
  );
}
