"use client";

import { useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useWhiteboardSync } from "@/hooks/useWhiteboardSync";

export default function ExcalidrawWrapper({ roomId }: { roomId: string }) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  const { handleChange, handlePointerUpdate, isLoading, initialData } =
    useWhiteboardSync(excalidrawAPI, roomId);

  if (isLoading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
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
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={initialData}
        isCollaborating={true}
        onChange={(elements) => handleChange(elements)}
        onPointerUpdate={handlePointerUpdate}
      />
    </div>
  );
}
