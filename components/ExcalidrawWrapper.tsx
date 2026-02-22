"use client";

import { useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useWhiteboardSync } from "@/hooks/useWhiteboardSync";

export default function ExcalidrawWrapper({
  roomId,
  viewOnly = false,
  currentUserId,
  onAPIReady,
}: {
  roomId: string;
  viewOnly?: boolean;
  currentUserId?: string | null;
  onAPIReady?: (api: ExcalidrawImperativeAPI) => void;
}) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  const { handleChange, handlePointerUpdate, isLoading, initialData } =
    useWhiteboardSync(excalidrawAPI, roomId, currentUserId, viewOnly);

  if (isLoading) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5F0E8",
        }}
      >
        <p style={{ fontSize: 18, color: "#636363" }}>Loading whiteboard...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Excalidraw
        excalidrawAPI={(api) => {
          setExcalidrawAPI(api);
          onAPIReady?.(api);
        }}
        initialData={{
          ...initialData,
          appState: {
            ...initialData?.appState,
            viewBackgroundColor: "#F5F0E8",
          },
        }}
        isCollaborating={true}
        viewModeEnabled={viewOnly}
        {...(!viewOnly && {
          onChange: (elements) => handleChange(elements),
          onPointerUpdate: handlePointerUpdate,
        })}
      />
    </div>
  );
}
