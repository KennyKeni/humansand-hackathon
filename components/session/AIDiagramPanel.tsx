"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Lightbulb, X, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const ExcalidrawWrapper = dynamic(
  () => import("@/components/ExcalidrawWrapper"),
  { ssr: false },
);

export function AIDiagramPanel({
  groupId,
  isOpen,
  onToggle,
}: {
  groupId: Id<"groups">;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const roomId = `ai-board-${groupId}`;
  const whiteboard = useQuery(api.whiteboard.get, { roomId });
  const triggerDiagram = useMutation(api.groups.triggerDiagram);
  const isEmpty = whiteboard === null;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await triggerDiagram({ groupId });
    } catch (e) {
      console.error("Failed to trigger diagram:", e);
    }
    setTimeout(() => setRefreshing(false), 3000);
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute left-3 top-32 z-40 flex items-center gap-1.5 rounded-md bg-background border shadow-md px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <Lightbulb className="h-4 w-4" />
        AI Diagram
      </button>
    );
  }

  return (
    <>
      <div className="absolute left-3 top-32 z-40 flex flex-col rounded-md border bg-background shadow-lg" style={{ width: 340, height: 280 }}>
        <div className="flex items-center justify-between border-b px-3 py-1.5">
          <span className="text-xs font-medium flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            AI Diagram
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded p-0.5 hover:bg-muted/50 disabled:opacity-50"
              title="Refresh diagram"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setFullscreen(true)}
              className="rounded p-0.5 hover:bg-muted/50"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onToggle}
              className="rounded p-0.5 hover:bg-muted/50"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden">
          {isEmpty && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 p-4">
              <p className="text-xs text-muted-foreground text-center">
                AI diagram will appear here as the conversation progresses
              </p>
            </div>
          )}
          <ExcalidrawWrapper
            roomId={roomId}
            viewOnly={true}
          />
        </div>
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="!max-w-[95vw] h-[90vh] p-0 gap-0 flex flex-col" showCloseButton={false}>
          <div className="flex items-center justify-between border-b px-3 py-1.5 shrink-0">
            <DialogTitle className="text-xs font-medium flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              AI Diagram
            </DialogTitle>
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded p-0.5 hover:bg-muted/50 disabled:opacity-50"
                title="Refresh diagram"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setFullscreen(false)}
                className="rounded p-0.5 hover:bg-muted/50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="relative flex-1 min-h-0">
            {isEmpty && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 p-4">
                <p className="text-sm text-muted-foreground text-center">
                  AI diagram will appear here as the conversation progresses
                </p>
              </div>
            )}
            <ExcalidrawWrapper
              roomId={roomId}
              viewOnly={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
