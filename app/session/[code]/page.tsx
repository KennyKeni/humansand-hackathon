"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Lock } from "lucide-react";
import dynamic from "next/dynamic";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const ExcalidrawWrapper = dynamic(
  () => import("@/components/ExcalidrawWrapper"),
  { ssr: false },
);
import { SessionHeader } from "@/components/session/SessionHeader";
import { FloatingPanel } from "@/components/session/FloatingPanel";
import { useTeachingCapture } from "@/hooks/useTeachingCapture";
import { useTeachingSimulation } from "@/hooks/useTeachingSimulation";

export type ActiveContext =
  | { type: "main" }
  | { type: "group"; groupId: Id<"groups">; name: string };

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeContext, setActiveContext] = useState<ActiveContext>({ type: "main" });
  const hasJoined = useRef(false);
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const handleAPIReady = useCallback(
    (api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api),
    [],
  );
  const [startingCheckIn, setStartingCheckIn] = useState(false);
  const resetSession = useMutation(api.teaching.resetSession);

  const teachingCapture = useTeachingCapture(excalidrawAPI);
  const simulation = useTeachingSimulation(excalidrawAPI);

  // Live snapshot subscription
  const isCapturing = teachingCapture.status !== "idle";
  const liveSnapshots = useQuery(
    api.teaching.getCaptureSnapshots,
    isCapturing ? { sessionCode: code } : "skip",
  );

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

  const myGroups = useQuery(
    api.groups.getMyGroups,
    session ? { sessionId: session._id } : "skip"
  ) ?? [];

  // Check-in queries
  const captureSession = useQuery(
    api.teaching.getCaptureSession,
    { sessionCode: code },
  );
  const checkInPhase = captureSession?.checkInPhase ?? undefined;

  const myCheckIn = useQuery(
    api.checkIns.getMyCheckIn,
    session ? { sessionId: session._id } : "skip",
  );

  const checkInStatus = useQuery(
    api.checkIns.getSessionCheckInStatus,
    session && checkInPhase ? { sessionId: session._id } : "skip",
  );

  useEffect(() => {
    if (!session || membership !== null || hasJoined.current || joinError) return;
    hasJoined.current = true;

    join({ sessionId: session._id }).catch(() => {
      setJoinError("Failed to join session");
      hasJoined.current = false;
    });
  }, [session, membership, joinError]);

  async function handleNewLesson() {
    try {
      await resetSession({ sessionCode: code });
    } catch (err) {
      console.error("Failed to reset lesson:", err);
    }
  }

  async function handleStartCheckIn() {
    if (!session || startingCheckIn) return;
    setStartingCheckIn(true);
    try {
      await fetch("/api/check-in/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode: code, sessionId: session._id }),
      });
    } catch (err) {
      console.error("Failed to start check-in:", err);
    } finally {
      setStartingCheckIn(false);
    }
  }

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

  const isViewOnly = activeContext.type === "main" && membership.role !== "creator";

  return (
    <div className="flex h-screen flex-col">
      <SessionHeader
        session={session}
        memberCount={members.length}
        isCreator={membership.role === "creator"}
        teachingCapture={teachingCapture}
        sessionCode={code}
        simulation={simulation}
        liveSnapshots={liveSnapshots ?? []}
        checkInPhase={checkInPhase}
        sessionId={session._id}
        checkInCompleted={checkInStatus?.completed}
        checkInTotal={checkInStatus?.total}
        onStartCheckIn={handleStartCheckIn}
        onNewLesson={handleNewLesson}
        captureSessionStatus={captureSession?.status}
        captureSessionSummary={captureSession?.summary ?? undefined}
      />

      {myGroups.length > 0 && (
        <div className="flex items-center gap-1 border-b px-4 py-1.5 bg-background">
          <button
            onClick={() => setActiveContext({ type: "main" })}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              activeContext.type === "main"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Main Board
          </button>
          {myGroups.map((group) => (
            <button
              key={group._id}
              onClick={() =>
                setActiveContext({ type: "group", groupId: group._id, name: group.name })
              }
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                activeContext.type === "group" && activeContext.groupId === group._id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        <main className="h-full w-full">
          <ExcalidrawWrapper
            key={activeContext.type === "main" ? "main" : activeContext.groupId}
            roomId={activeContext.type === "main" ? code : `group-${activeContext.groupId}`}
            viewOnly={isViewOnly}
            currentUserId={me?._id}
            onAPIReady={handleAPIReady}
          />
        </main>

        {isViewOnly && (
          <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded bg-background/80 px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
            <Lock className="h-3 w-3" />
            View Only
          </div>
        )}
        {activeContext.type === "group" && (
          <div className="absolute left-3 top-14 z-20 rounded bg-background/80 px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
            {activeContext.name}
          </div>
        )}

        <FloatingPanel
          sessionId={session._id}
          currentUserId={me?._id ?? null}
          members={members}
          isOpen={panelOpen}
          onToggle={() => setPanelOpen((prev) => !prev)}
          activeContext={activeContext}
          role={membership.role}
          checkIn={myCheckIn ?? undefined}
          checkInPhase={checkInPhase}
          sessionCode={code}
        />
      </div>
    </div>
  );
}
