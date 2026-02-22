"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, MessageSquare, GripVertical } from "lucide-react";
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
    (isCreator && checkInPhase) ||
    (!isCreator && checkIn);

  const [tab, setTab] = useState<Tab>("chat");
  const [width, setWidth] = useState(320);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(Math.max(startWidth.current + delta, 280), 800);
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [width]);

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
        className="absolute right-0 top-16 z-30 rounded-l-md bg-background border border-r-0 shadow-md p-2 hover:bg-muted/50"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-30 flex flex-col bg-background border-l shadow-lg overflow-hidden"
      style={{ width }}
    >
      <div
        onMouseDown={onDragStart}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 z-40"
      />
      <div className="flex items-center justify-between border-b px-3 py-2">
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
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className="rounded p-1 hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
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
