"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  reconcileElements,
  CaptureUpdateAction,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const ROOM_ID = "default";

function generateUserId() {
  return Math.random().toString(36).slice(2, 10);
}

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

export function useWhiteboardSync(
  excalidrawAPI: ExcalidrawImperativeAPI | null,
) {
  const userIdRef = useRef<string>("");
  if (!userIdRef.current) {
    userIdRef.current = generateUserId();
  }

  const whiteboard = useQuery(api.whiteboard.get, { roomId: ROOM_ID });
  const saveElements = useMutation(api.whiteboard.saveElements);
  const updateCursorMutation = useMutation(api.whiteboard.updateCursor);
  const removeCursorMutation = useMutation(api.whiteboard.removeCursor);

  // Track the version we last saved to prevent echo
  const lastSavedVersionRef = useRef<string>("");
  // Track whether we're applying a remote update to prevent onChange loop
  const isApplyingRemoteRef = useRef(false);
  // Debounce timer refs
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply remote element updates
  useEffect(() => {
    if (!excalidrawAPI || !whiteboard?.elements) return;

    // Skip if this is the version we just saved (echo prevention)
    if (whiteboard.elements === lastSavedVersionRef.current) return;

    const remoteElements = JSON.parse(whiteboard.elements) as ExcalidrawElement[];
    const localElements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();

    const reconciledElements = reconcileElements(
      localElements as any,
      remoteElements as any,
      appState,
    );

    isApplyingRemoteRef.current = true;
    excalidrawAPI.updateScene({
      elements: reconciledElements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    // Reset after a tick to allow the onChange callback to fire and be ignored
    requestAnimationFrame(() => {
      isApplyingRemoteRef.current = false;
    });
  }, [excalidrawAPI, whiteboard?.elements]);

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
      // Don't show our own cursor
      if (uid === userIdRef.current) continue;
      collaborators.set(uid as any, {
        pointer: { x: cursor.x, y: cursor.y, tool: cursor.tool },
        username: cursor.username || `User ${uid.slice(0, 4)}`,
        color: getColorForUser(uid),
      });
    }

    excalidrawAPI.updateScene({
      collaborators: collaborators as any,
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  }, [excalidrawAPI, whiteboard?.cursors]);

  // Cleanup cursor on unmount
  useEffect(() => {
    const userId = userIdRef.current;
    return () => {
      removeCursorMutation({ roomId: ROOM_ID, userId });
    };
  }, [removeCursorMutation]);

  // Debounced save handler for onChange
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      // Skip if we're applying remote update
      if (isApplyingRemoteRef.current) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const serialized = JSON.stringify(elements);
        lastSavedVersionRef.current = serialized;
        saveElements({ roomId: ROOM_ID, elements: serialized });
      }, 300);
    },
    [saveElements],
  );

  // Debounced cursor update
  const handlePointerUpdate = useCallback(
    (payload: {
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "down" | "up";
    }) => {
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);

      cursorTimerRef.current = setTimeout(() => {
        updateCursorMutation({
          roomId: ROOM_ID,
          userId: userIdRef.current,
          cursor: JSON.stringify({
            x: payload.pointer.x,
            y: payload.pointer.y,
            tool: payload.pointer.tool,
          }),
        });
      }, 100);
    },
    [updateCursorMutation],
  );

  // Initial data for Excalidraw
  const initialData = useMemo(() => {
    if (whiteboard === undefined) return undefined; // still loading
    if (whiteboard === null) return { elements: [] }; // no whiteboard yet
    return {
      elements: JSON.parse(whiteboard.elements) as ExcalidrawElement[],
    };
  }, []); // only compute once on mount — subsequent updates come via subscription

  return {
    handleChange,
    handlePointerUpdate,
    isLoading: whiteboard === undefined,
    initialData,
  };
}
