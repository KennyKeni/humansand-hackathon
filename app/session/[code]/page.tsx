"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Lock, ChevronDown, ClipboardList } from "lucide-react";
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
import { SummaryModal } from "@/components/session/SummaryModal";

export type ActiveContext =
  | { type: "main" }
  | { type: "group"; groupId: Id<"groups">; name: string };

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeContext, setActiveContext] = useState<ActiveContext>({ type: "main" });
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
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
  const endAll = useMutation(api.groups.endAll);

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

  const activeGroups = myGroups.filter((g) => !g.endedAt);
  const archivedGroups = myGroups.filter((g) => !!g.endedAt);

  const activeGroup =
    activeContext.type === "group"
      ? myGroups.find((g) => g._id === activeContext.groupId)
      : null;

  const isEnded = !!activeGroup?.endedAt;

  const isViewOnly =
    (activeContext.type === "main" && membership.role !== "creator") ||
    (activeContext.type === "group" && isEnded);

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
        <TabBar
          activeGroups={activeGroups}
          archivedGroups={archivedGroups}
          activeContext={activeContext}
          setActiveContext={setActiveContext}
          isCreator={membership.role === "creator"}
          onEndAll={async () => {
            try {
              await endAll({ sessionId: session._id });
              setSummaryModalOpen(true);
              setActiveContext({ type: "main" });
            } catch {
              // mutation failed - don't open modal
            }
          }}
        />
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

        {membership.role === "creator" && archivedGroups.length > 0 && !panelOpen && (
          <button
            onClick={() => setSummaryModalOpen(true)}
            className="absolute right-0 top-28 z-30 rounded-l-md bg-background border border-r-0 shadow-md p-2 hover:bg-muted/50"
          >
            <ClipboardList className="h-5 w-5" />
          </button>
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
          isEnded={isEnded}
        />
      </div>

      <SummaryModal
        open={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        sessionId={session._id}
      />
    </div>
  );
}

type GroupDoc = {
  _id: Id<"groups">;
  name: string;
  endedAt?: number;
};

function TabBar({
  activeGroups,
  archivedGroups,
  activeContext,
  setActiveContext,
  isCreator,
  onEndAll,
}: {
  activeGroups: GroupDoc[];
  archivedGroups: GroupDoc[];
  activeContext: ActiveContext;
  setActiveContext: (ctx: ActiveContext) => void;
  isCreator: boolean;
  onEndAll: () => void;
}) {
  const [archivedOpen, setArchivedOpen] = useState(false);

  return (
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
      {activeGroups.map((group) => (
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
      {isCreator && activeGroups.length > 0 && (
        <button
          onClick={onEndAll}
          className="rounded px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          End All Groups
        </button>
      )}
      {archivedGroups.length > 0 && (
        <div className="relative ml-auto">
          <button
            onClick={() => setArchivedOpen((prev) => !prev)}
            className={`flex items-center gap-1 rounded px-3 py-1 text-sm font-medium transition-colors ${
              activeContext.type === "group" && archivedGroups.some((g) => g._id === activeContext.groupId)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Archived ({archivedGroups.length})
            <ChevronDown className={`h-3 w-3 transition-transform ${archivedOpen ? "rotate-180" : ""}`} />
          </button>
          {archivedOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setArchivedOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-md border bg-background py-1 shadow-md">
                {archivedGroups.map((group) => (
                  <button
                    key={group._id}
                    onClick={() => {
                      setActiveContext({ type: "group", groupId: group._id, name: group.name });
                      setArchivedOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                      activeContext.type === "group" && activeContext.groupId === group._id
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
