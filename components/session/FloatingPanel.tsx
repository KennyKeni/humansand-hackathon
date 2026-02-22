"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare, Maximize2, Minimize2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { MemberList } from "./MemberList";
import { ChatPanel } from "./chat/ChatPanel";
import { CheckInChat } from "./CheckInChat";
import { TeacherCheckInDashboard } from "./TeacherCheckInDashboard";
import type { ActiveContext } from "@/app/session/[code]/page";

type Member = {
  _id: Id<"sessionMembers">;
  userId: Id<"users">;
  name: string;
  role: "creator" | "participant" | "professor" | "student";
};

type CheckIn = {
  _id: Id<"checkIns">;
  status: "active" | "completed" | "expired";
} | null;

type Tab = "chat" | "members" | "check-in";

export function FloatingPanel({
  sessionId,
  currentUserId,
  members,
  isOpen,
  onToggle,
  activeContext,
  role,
  checkIn,
  checkInPhase,
  sessionCode,
  isEnded,
}: {
  sessionId: Id<"sessions">;
  currentUserId: Id<"users"> | null;
  members: Member[];
  isOpen: boolean;
  onToggle: () => void;
  activeContext: ActiveContext;
  role: "creator" | "participant" | "professor" | "student";
  checkIn?: CheckIn;
  checkInPhase?: string;
  sessionCode?: string;
  isEnded: boolean;
}) {
  const isCreator = role === "creator" || role === "professor";
  const hasCheckInTab =
    (isCreator && !!checkInPhase) ||
    (!isCreator && !!checkIn);

  const [tab, setTab] = useState<Tab>("chat");
  const [expanded, setExpanded] = useState(false);

  // Auto-switch to check-in tab when check-in becomes available
  useEffect(() => {
    if (hasCheckInTab && tab === "chat") {
      setTab("check-in");
    }
  }, [hasCheckInTab]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-0 top-16 z-30 rounded-l-md bg-cream/95 border border-r-0 border-parchment shadow-md p-2 hover:bg-cream-deep backdrop-blur-sm"
      >
        <MessageSquare className="h-5 w-5 text-charcoal-soft" />
      </button>
    );
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden border-l border-parchment bg-cream shadow-lg"
      style={
        expanded
          ? { flex: "1 1 100%", width: "100%" }
          : { flex: "0 0 33.333%", minWidth: 340, maxWidth: 480 }
      }
    >
      <div className="flex items-center justify-between border-b border-parchment px-3 py-2 shrink-0">
        <div className="flex gap-1">
          <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
            Chat
          </TabButton>
          <TabButton active={tab === "members"} onClick={() => setTab("members")}>
            Members ({members.length})
          </TabButton>
          {hasCheckInTab && (
            <TabButton active={tab === "check-in"} onClick={() => setTab("check-in")}>
              Check-In
            </TabButton>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1 text-charcoal-soft hover:bg-cream-deep hover:text-foreground"
            title={expanded ? "Exit fullscreen" : "Fullscreen"}
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={onToggle}
            className="rounded p-1 text-charcoal-soft hover:bg-cream-deep hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === "chat" ? (
          <ChatPanel
            sessionId={sessionId}
            currentUserId={currentUserId}
            activeContext={activeContext}
            isEnded={isEnded}
          />
        ) : tab === "members" ? (
          <MemberList
            members={members}
            role={role}
            sessionId={sessionId}
          />
        ) : tab === "check-in" ? (
          isCreator ? (
            <TeacherCheckInDashboard
              sessionId={sessionId}
              sessionCode={sessionCode ?? ""}
              checkInPhase={checkInPhase}
              members={members}
              creatorId={currentUserId!}
            />
          ) : checkIn ? (
            <CheckInChat
              checkIn={checkIn}
              sessionId={sessionId}
              sessionCode={sessionCode ?? ""}
              currentUserId={currentUserId!}
            />
          ) : null
        ) : null}
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
      className={`relative px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.05em] transition-colors ${
        active
          ? "text-terracotta border-b-2 border-terracotta"
          : "text-charcoal-soft hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
