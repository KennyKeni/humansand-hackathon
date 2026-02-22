"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  reconcileElements,
  CaptureUpdateAction,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const COLLABORATOR_COLORS = [
  { background: "#FF6B6B80", stroke: "#FF6B6B" },
  { background: "#4ECDC480", stroke: "#4ECDC4" },
  { background: "#45B7D180", stroke: "#45B7D1" },
  { background: "#96CEB480", stroke: "#96CEB4" },
  { background: "#FFEAA780", stroke: "#FFEAA7" },
  { background: "#DDA0DD80", stroke: "#DDA0DD" },
  { background: "#98D8C880", stroke: "#98D8C8" },
  { background: "#F7DC6F80", stroke: "#F7DC6F" },
];

function getColorForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

const noopChange = () => {};
const noopPointer = () => {};

export function useWhiteboardSync(
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  roomId: string = "default",
  currentUserId?: string | null,
  viewOnly: boolean = false,
) {
  const whiteboard = useQuery(api.whiteboard.get, { roomId });
  const saveElements = useMutation(api.whiteboard.saveElements);
  const updateCursorMutation = useMutation(api.whiteboard.updateCursor);
  const removeCursorMutation = useMutation(api.whiteboard.removeCursor);

  const lastSavedVersionRef = useRef<string>("");
  const isApplyingRemoteRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply remote element updates
  useEffect(() => {
    if (!excalidrawAPI || !whiteboard?.elements) return;

    if (whiteboard.elements === lastSavedVersionRef.current) return;

    const remoteElements = JSON.parse(whiteboard.elements) as ExcalidrawElement[];

    if (viewOnly) {
      excalidrawAPI.updateScene({
        elements: remoteElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      return;
    }

    const localElements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();

    const reconciledElements = reconcileElements(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      localElements as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      remoteElements as any,
      appState,
    );

    isApplyingRemoteRef.current = true;
    excalidrawAPI.updateScene({
      elements: reconciledElements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    requestAnimationFrame(() => {
      isApplyingRemoteRef.current = false;
    });
  }, [excalidrawAPI, whiteboard?.elements, viewOnly]);

  // Apply remote cursor updates
  useEffect(() => {
    if (!excalidrawAPI || !whiteboard?.cursors) return;

    const cursors: Record<
      string,
      { x: number; y: number; tool: "pointer" | "laser"; username?: string }
    > = JSON.parse(whiteboard.cursors);

    const collaborators = new Map<
      string,
      {
        pointer?: { x: number; y: number; tool: "pointer" | "laser" };
        username?: string;
        color?: { background: string; stroke: string };
      }
    >();

    for (const [uid, cursor] of Object.entries(cursors)) {
      if (currentUserId && uid === currentUserId) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collaborators.set(uid as any, {
        pointer: { x: cursor.x, y: cursor.y, tool: cursor.tool },
        username: cursor.username || `User ${uid.slice(0, 4)}`,
        color: getColorForUser(uid),
      });
    }

    excalidrawAPI.updateScene({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collaborators: collaborators as any,
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  }, [excalidrawAPI, whiteboard?.cursors, currentUserId]);

  // Cleanup cursor on unmount (skip for view-only users)
  useEffect(() => {
    if (viewOnly) return;
    return () => {
      removeCursorMutation({ roomId: roomId });
    };
  }, [removeCursorMutation, viewOnly, roomId]);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (isApplyingRemoteRef.current) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const serialized = JSON.stringify(elements);
        lastSavedVersionRef.current = serialized;
        saveElements({ roomId: roomId, elements: serialized });
      }, 300);
    },
    [saveElements, roomId],
  );

  const handlePointerUpdate = useCallback(
    (payload: {
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "down" | "up";
    }) => {
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);

      cursorTimerRef.current = setTimeout(() => {
        updateCursorMutation({
          roomId: roomId,
          cursor: JSON.stringify({
            x: payload.pointer.x,
            y: payload.pointer.y,
            tool: payload.pointer.tool,
          }),
        });
      }, 100);
    },
    [updateCursorMutation, roomId],
  );

  // One-time initialization of whiteboard data; ref read during render is intentional
  const initialDataRef = useRef<{ elements: ExcalidrawElement[] } | null>(null);
  if (whiteboard !== undefined && !initialDataRef.current) { // eslint-disable-line react-hooks/refs
    initialDataRef.current = whiteboard === null
      ? { elements: [] }
      : { elements: JSON.parse(whiteboard.elements) as ExcalidrawElement[] };
  }
  const initialData = initialDataRef.current ?? undefined; // eslint-disable-line react-hooks/refs

  return {
    handleChange: viewOnly ? noopChange : handleChange,
    handlePointerUpdate: viewOnly ? noopPointer : handlePointerUpdate,
    isLoading: whiteboard === undefined,
    initialData,
  };
}
