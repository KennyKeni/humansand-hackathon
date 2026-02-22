"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TeachingCaptureControls {
  status: "idle" | "capturing" | "synthesizing" | "done";
  snapshotCount: number;
  summary: string | null;
  startCapturing: (sessionCode: string) => Promise<void>;
  stopAndSynthesize: () => Promise<void>;
  reset: () => void;
}

interface SimulationControls {
  status: "idle" | "running" | "done";
  step: number;
  totalSteps: number;
  start: () => void;
  stop: () => void;
}

interface Snapshot {
  _id: string;
  sessionCode: string;
  description: string;
  capturedAt: number;
  elementHash: number;
}

export function SessionHeader({
  session,
  memberCount,
  isCreator,
  teachingCapture,
  sessionCode,
  simulation,
  liveSnapshots,
  checkInPhase,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sessionId,
  checkInCompleted,
  checkInTotal,
  onStartCheckIn,
  onNewLesson,
  captureSessionStatus,
  captureSessionSummary,
}: {
  session: Doc<"sessions">;
  memberCount: number;
  isCreator?: boolean;
  teachingCapture?: TeachingCaptureControls;
  sessionCode?: string;
  simulation?: SimulationControls;
  liveSnapshots?: Snapshot[];
  checkInPhase?: string;
  sessionId?: Id<"sessions">;
  checkInCompleted?: number;
  checkInTotal?: number;
  onStartCheckIn?: () => void;
  onNewLesson?: () => void;
  captureSessionStatus?: string;
  captureSessionSummary?: string;
}) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  function copyCode() {
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Use the hook status, but fall back to database status when hook has reset (page refresh)
  const hookStatus = teachingCapture?.status ?? "idle";
  const dbCompleted = captureSessionStatus === "completed";
  const captureStatus = hookStatus !== "idle" ? hookStatus : (dbCompleted ? "done" : "idle");

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [transcriptionOpen, setTranscriptionOpen] = useState(false);
  const hasSummary = (captureStatus === "done" && teachingCapture?.summary) ||
    (dbCompleted && captureSessionSummary);
  const summaryText = teachingCapture?.summary || captureSessionSummary || null;
  const hasSnapshots = liveSnapshots && liveSnapshots.length > 0;
  const showTranscriptionToggle =
    captureStatus === "capturing" ||
    captureStatus === "synthesizing" ||
    captureStatus === "done";

  // Show "Start Check-In" button when synthesis is done and no check-in started yet
  const showStartCheckIn =
    isCreator && captureStatus === "done" && !checkInPhase;

  return (
    <div>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/lobby")}>
            Back
          </Button>
          <h1 className="text-lg font-semibold">{session.title}</h1>
          <Badge variant="secondary">{memberCount} members</Badge>
        </div>
        <div className="flex items-center gap-2">
          {isCreator && teachingCapture && sessionCode && (
            <>
              {captureStatus === "idle" && (
                <Button
                  size="sm"
                  onClick={() => teachingCapture.startCapturing(sessionCode)}
                >
                  Start Teaching
                </Button>
              )}
              {captureStatus === "capturing" && (
                <>
                  <Badge variant="outline" className="animate-pulse">
                    Recording ({teachingCapture.snapshotCount} snapshots)
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => teachingCapture.stopAndSynthesize()}
                  >
                    Check-In
                  </Button>
                </>
              )}
              {captureStatus === "synthesizing" && (
                <Badge variant="outline" className="animate-pulse">
                  Synthesizing lesson...
                </Badge>
              )}
              {captureStatus === "done" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSummaryOpen((v) => !v)}
                  >
                    {summaryOpen ? "Hide Summary" : "View Summary"}
                  </Button>
                  {!checkInPhase && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSummaryOpen(false);
                        teachingCapture.reset();
                        onNewLesson?.();
                      }}
                    >
                      New Lesson
                    </Button>
                  )}
                </>
              )}
            </>
          )}
          {/* Start Check-In button */}
          {showStartCheckIn && onStartCheckIn && (
            <Button size="sm" onClick={onStartCheckIn}>
              Start Check-In
            </Button>
          )}
          {/* Check-in phase badges */}
          {isCreator && checkInPhase === "checking-in" && (
            <Badge variant="outline" className="animate-pulse">
              Check-In in Progress
              {checkInCompleted !== undefined && checkInTotal !== undefined && (
                <span className="ml-1">
                  ({checkInCompleted}/{checkInTotal})
                </span>
              )}
            </Badge>
          )}
          {isCreator && checkInPhase === "matched" && (
            <Badge variant="secondary">Matches Ready</Badge>
          )}
          {isCreator && checkInPhase === "grouped" && (
            <Badge variant="secondary">Discussion Rooms Active</Badge>
          )}
          {isCreator && showTranscriptionToggle && (
            <Button
              size="sm"
              variant={transcriptionOpen ? "secondary" : "outline"}
              onClick={() => setTranscriptionOpen((v) => !v)}
            >
              {transcriptionOpen ? "Hide Transcription" : "Live Transcription"}
              {hasSnapshots && !transcriptionOpen && (
                <span className="ml-1 text-xs opacity-60">
                  ({liveSnapshots.length})
                </span>
              )}
            </Button>
          )}
          {isCreator && simulation && (
            <>
              {simulation.status === "idle" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => simulation.start()}
                >
                  Simulate Teaching
                </Button>
              )}
              {simulation.status === "running" && (
                <Badge variant="outline" className="animate-pulse">
                  Drawing... ({simulation.step}/{simulation.totalSteps})
                </Badge>
              )}
            </>
          )}
          <Button variant="outline" size="sm" onClick={copyCode}>
            {copied ? "Copied!" : session.code}
          </Button>
        </div>
      </div>
      {hasSummary && summaryOpen && (
        <div className="border-b bg-muted/30 px-6 py-4 max-h-64 overflow-y-auto">
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
            {summaryText}
          </div>
        </div>
      )}
      {transcriptionOpen && (
        <div className="border-b bg-muted/20 px-6 py-4 max-h-72 overflow-y-auto">
          <div className="space-y-3">
            {!hasSnapshots && (
              <p className="text-sm text-muted-foreground italic">
                Waiting for first capture...
              </p>
            )}
            {liveSnapshots &&
              [...liveSnapshots]
                .sort((a, b) => b.capturedAt - a.capturedAt)
                .map((snap, i) => (
                  <div
                    key={snap._id}
                    className="rounded-md border bg-background p-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        #{liveSnapshots.length - i}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(snap.capturedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {snap.description}
                    </p>
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
