"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ExcalidrawWrapper = dynamic(
  () => import("@/components/ExcalidrawWrapper"),
  { ssr: false },
);
import { SessionHeader } from "@/components/session/SessionHeader";
import { MemberList } from "@/components/session/MemberList";
import { ChatPanel } from "@/components/session/chat/ChatPanel";

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const hasJoined = useRef(false);

  const session = useQuery(api.sessions.getByCode, { code });
  const membership = useQuery(
    api.sessionMembers.getMyMembership,
    session ? { sessionId: session._id } : "skip"
  );
  const members =
    useQuery(
      api.sessionMembers.listMembers,
      session ? { sessionId: session._id } : "skip"
    ) ?? [];
  const me = useQuery(api.users.getMe);
  const join = useMutation(api.sessionMembers.join);

  useEffect(() => {
    if (!session || membership !== null || hasJoined.current || joinError) return;
    hasJoined.current = true;

    join({ sessionId: session._id }).catch(() => {
      setJoinError("Failed to join session");
      hasJoined.current = false;
    });
  }, [session, membership, joinError]);

  if (joinError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{joinError}</p>
          <button
            className="text-sm underline"
            onClick={() => {
              setJoinError(null);
              hasJoined.current = false;
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Joining session...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <SessionHeader session={session} memberCount={members.length} />
      <div className="flex flex-1 overflow-hidden">
        {membersOpen ? (
          <aside className="w-56 shrink-0 overflow-y-auto border-r flex flex-col">
            <button
              onClick={() => setMembersOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium border-b hover:bg-muted/50 w-full"
            >
              <ChevronLeft className="h-4 w-4" />
              Members
            </button>
            <MemberList members={members} />
          </aside>
        ) : (
          <button
            onClick={() => setMembersOpen(true)}
            className="w-8 shrink-0 border-r flex items-center justify-center hover:bg-muted/50 cursor-pointer"
          >
            <span className="text-xs font-medium [writing-mode:vertical-lr] rotate-180">
              Members
            </span>
          </button>
        )}
        <main className="flex-1 overflow-hidden">
          <ExcalidrawWrapper roomId={code} />
        </main>
        {chatOpen ? (
          <aside className="w-80 shrink-0 border-l flex flex-col h-full">
            <button
              onClick={() => setChatOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium border-b hover:bg-muted/50 w-full"
            >
              Chat
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex-1 overflow-hidden">
              <ChatPanel
                sessionId={session._id}
                currentUserId={me?._id ?? null}
              />
            </div>
          </aside>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="w-8 shrink-0 border-l flex items-center justify-center hover:bg-muted/50 cursor-pointer"
          >
            <span className="text-xs font-medium [writing-mode:vertical-lr]">
              Chat
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
