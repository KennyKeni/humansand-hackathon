"use client";

import { useState } from "react";
import { X, MessageSquare } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { MemberList } from "./MemberList";
import { ChatPanel } from "./chat/ChatPanel";

type Member = {
  _id: Id<"sessionMembers">;
  name: string;
  role: "creator" | "participant";
};

type Tab = "chat" | "members";

export function FloatingPanel({
  sessionId,
  currentUserId,
  members,
  isOpen,
  onToggle,
}: {
  sessionId: Id<"sessions">;
  currentUserId: Id<"users"> | null;
  members: Member[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [tab, setTab] = useState<Tab>("chat");

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-0 top-16 z-30 rounded-l-md bg-background border border-r-0 shadow-md p-2 hover:bg-muted/50"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 z-30 flex flex-col bg-background border-l shadow-lg">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex gap-1">
          <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
            Chat
          </TabButton>
          <TabButton active={tab === "members"} onClick={() => setTab("members")}>
            Members ({members.length})
          </TabButton>
        </div>
        <button
          onClick={onToggle}
          className="rounded p-1 hover:bg-muted/50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "chat" ? (
          <ChatPanel sessionId={sessionId} currentUserId={currentUserId} />
        ) : (
          <MemberList members={members} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}
