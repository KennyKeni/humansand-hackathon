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
}: {
  roomId: string;
  viewOnly?: boolean;
  currentUserId?: string | null;
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
          backgroundColor: "#fff",
        }}
      >
        <p style={{ fontSize: 18, color: "#888" }}>Loading whiteboard...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={initialData}
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
