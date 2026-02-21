"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import dynamic from "next/dynamic";

const ExcalidrawWrapper = dynamic(
  () => import("@/components/ExcalidrawWrapper"),
  { ssr: false },
);
import { SessionHeader } from "@/components/session/SessionHeader";
import { FloatingPanel } from "@/components/session/FloatingPanel";

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
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
      <div className="relative flex-1 overflow-hidden">
        <main className="h-full w-full">
          <ExcalidrawWrapper roomId={code} />
        </main>
        <FloatingPanel
          sessionId={session._id}
          currentUserId={me?._id ?? null}
          members={members}
          isOpen={panelOpen}
          onToggle={() => setPanelOpen((prev) => !prev)}
        />
      </div>
    </div>
  );
}
