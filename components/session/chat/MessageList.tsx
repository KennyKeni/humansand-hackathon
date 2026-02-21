"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Id } from "@/convex/_generated/dataModel";

type Message = {
  _id: Id<"messages">;
  body: string;
  authorName: string;
  authorId: Id<"users">;
  _creationTime: number;
};

export function MessageList({
  messages,
  currentUserId,
}: {
  messages: Message[];
  currentUserId: Id<"users"> | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="space-y-3 py-4">
        {messages.map((msg) => {
          const isOwn = msg.authorId === currentUserId;
          return (
            <div key={msg._id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
              <span className="text-xs text-muted-foreground mb-0.5">
                {msg.authorName}
              </span>
              <div
                className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                  isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
