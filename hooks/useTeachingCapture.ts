"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

type CaptureStatus = "idle" | "capturing" | "synthesizing" | "done";

const CAPTURE_INTERVAL_MS = 15_000;

function hashElements(excalidrawAPI: ExcalidrawImperativeAPI): number {
  const elements = excalidrawAPI.getSceneElements();
  let hash = elements.length;
  for (const el of elements) {
    hash = (hash * 31 + el.version) | 0;
  }
  return hash;
}

async function exportCanvasToBase64(
  excalidrawAPI: ExcalidrawImperativeAPI,
): Promise<string | null> {
  try {
    const elements = excalidrawAPI.getSceneElements();
    if (elements.length === 0) return null;

    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const blob = await exportToBlob({
      elements,
      appState: {
        ...excalidrawAPI.getAppState(),
        exportWithDarkMode: false,
        exportBackground: true,
      },
      files: excalidrawAPI.getFiles(),
      mimeType: "image/png",
    });

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Failed to export canvas:", err);
    return null;
  }
}

export function useTeachingCapture(
  excalidrawAPI: ExcalidrawImperativeAPI | null,
) {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [summary, setSummary] = useState<string | null>(null);

  const sessionCodeRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHashRef = useRef<number>(0);
  const isCapturingRef = useRef(false);
  // Keep a ref to excalidrawAPI so interval/timeout closures always see the latest
  const excalidrawAPIRef = useRef(excalidrawAPI);
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;
  }, [excalidrawAPI]);

  const startCaptureMutation = useMutation(api.teaching.startCapture);

  // Live subscription to the current session for snapshotCount
  const captureSession = useQuery(
    api.teaching.getCaptureSession,
    sessionCodeRef.current ? { sessionCode: sessionCodeRef.current } : "skip",
  );

  const captureOnce = useCallback(async () => {
    const api = excalidrawAPIRef.current;
    if (!api) {
      console.log("[capture] no excalidrawAPI");
      return;
    }
    if (!sessionCodeRef.current) {
      console.log("[capture] no sessionCode");
      return;
    }
    if (isCapturingRef.current) {
      console.log("[capture] already capturing, skipping");
      return;
    }

    const currentHash = hashElements(api);
    console.log("[capture] hash:", currentHash, "lastHash:", lastHashRef.current);
    if (currentHash === lastHashRef.current) {
      console.log("[capture] no change, skipping");
      return;
    }

    isCapturingRef.current = true;
    try {
      console.log("[capture] exporting canvas...");
      const base64 = await exportCanvasToBase64(api);
      if (!base64) {
        console.log("[capture] export returned null (empty canvas?)");
        return;
      }

      console.log("[capture] sending to /api/analyze-snapshot, base64 length:", base64.length);
      lastHashRef.current = currentHash;

      const res = await fetch("/api/analyze-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          sessionCode: sessionCodeRef.current,
          elementHash: currentHash,
        }),
      });
      const data = await res.json();
      console.log("[capture] response:", res.status, data);
    } catch (err) {
      console.error("[capture] failed:", err);
    } finally {
      isCapturingRef.current = false;
    }
  }, []);

  const startCapturing = useCallback(
    async (sessionCode: string) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      sessionCodeRef.current = sessionCode;
      lastHashRef.current = 0;
      setSummary(null);
      setStatus("capturing");

      await startCaptureMutation({ sessionCode });

      intervalRef.current = setInterval(() => {
        captureOnce();
      }, CAPTURE_INTERVAL_MS);

      // First capture after a short delay
      setTimeout(() => captureOnce(), 3000);
    },
    [startCaptureMutation, captureOnce],
  );

  const stopAndSynthesize = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!sessionCodeRef.current) return;

    // Final capture before synthesizing
    await captureOnce();

    setStatus("synthesizing");

    try {
      const res = await fetch("/api/synthesize-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode: sessionCodeRef.current }),
      });

      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Synthesis failed:", err);
    }

    setStatus("done");
  }, [captureOnce]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    sessionCodeRef.current = null;
    lastHashRef.current = 0;
    isCapturingRef.current = false;
    setStatus("idle");
    setSummary(null);
  }, []);

  return {
    status,
    snapshotCount: captureSession?.snapshotCount ?? 0,
    summary,
    startCapturing,
    stopAndSynthesize,
    reset,
  };
}
