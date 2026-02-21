"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Doc } from "@/convex/_generated/dataModel";
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
}: {
  session: Doc<"sessions">;
  memberCount: number;
  isCreator?: boolean;
  teachingCapture?: TeachingCaptureControls;
  sessionCode?: string;
  simulation?: SimulationControls;
  liveSnapshots?: Snapshot[];
}) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  function copyCode() {
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const captureStatus = teachingCapture?.status ?? "idle";
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [transcriptionOpen, setTranscriptionOpen] = useState(false);
  const hasSummary = captureStatus === "done" && teachingCapture?.summary;
  const hasSnapshots = liveSnapshots && liveSnapshots.length > 0;
  const showTranscriptionToggle =
    captureStatus === "capturing" ||
    captureStatus === "synthesizing" ||
    captureStatus === "done";

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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSummaryOpen(false);
                      teachingCapture.reset();
                    }}
                  >
                    New Lesson
                  </Button>
                </>
              )}
            </>
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
            {teachingCapture.summary}
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
