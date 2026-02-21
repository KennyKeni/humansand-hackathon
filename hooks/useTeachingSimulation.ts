"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

type SimStatus = "idle" | "running" | "done";

// Helpers for element creation
const text = (
  t: string,
  x: number,
  y: number,
  opts?: {
    fontSize?: number;
    color?: string;
    fontFamily?: number;
  },
) => ({
  type: "text" as const,
  text: t,
  x,
  y,
  fontSize: opts?.fontSize ?? 16,
  fontFamily: opts?.fontFamily ?? 4,
  strokeColor: opts?.color ?? "#1e1e1e",
});

const box = (
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: {
    stroke?: string;
    fill?: string;
    strokeWidth?: number;
  },
) => ({
  type: "rectangle" as const,
  x,
  y,
  width: w,
  height: h,
  strokeColor: opts?.stroke ?? "#1e1e1e",
  backgroundColor: opts?.fill ?? "transparent",
  fillStyle: "solid" as const,
  strokeWidth: opts?.strokeWidth ?? 2,
  roundness: { type: 3 as const },
});

const line = (x: number, y: number, w: number, color = "#1e1e1e") => ({
  type: "rectangle" as const,
  x,
  y,
  width: w,
  height: 1,
  strokeColor: color,
  backgroundColor: color,
  fillStyle: "solid" as const,
  strokeWidth: 1,
});

/*
 * Layout map (no overlaps):
 *
 * TITLE:           y 30-80,   x 60-700
 * STAFF:           y 110-210, x 60-750
 * NOTE VALUES:     y 250-530, x 60-380    (left column)
 * TIME SIGNATURES: y 250-530, x 430-830   (right column)
 * SUBDIVISION:     y 570-750, x 60-830    (full width)
 * RHYTHM EXAMPLE:  y 790-940, x 60-830    (full width)
 * RESTS:           y 980-1100, x 60-830   (full width)
 * KEY TAKEAWAY:    y 1140-1200, x 60-830  (full width)
 */
function getLessonSteps() {
  return [
    // ─── Step 1 (0s): Title ─────────────────────────────────────
    {
      delay: 0,
      elements: [
        text("Music Notes & Rhythms", 160, 30, { fontSize: 36 }),
        text(
          "Understanding rhythm, note values, and time signatures",
          130,
          78,
          { fontSize: 16, color: "#868e96" },
        ),
      ],
    },

    // ─── Step 2 (3s): The Musical Staff ─────────────────────────
    {
      delay: 3000,
      elements: [
        // Five staff lines
        ...Array.from({ length: 5 }, (_, i) => line(60, 130 + i * 18, 650)),
        // Treble clef
        text("𝄞", 70, 118, { fontSize: 52, color: "#1971c2" }),
        // Line note names (bottom to top: E G B D F)
        ...["E", "G", "B", "D", "F"].map((n, i) =>
          text(n, 725, 196 - i * 18, { fontSize: 13, color: "#e03131" }),
        ),
        // Space note names (bottom to top: F A C E)
        ...["F", "A", "C", "E"].map((n, i) =>
          text(n, 750, 187 - i * 18, { fontSize: 13, color: "#1971c2" }),
        ),
        // Mnemonic labels
        text("Lines: Every Good Boy Does Fine", 60, 210, {
          fontSize: 13,
          color: "#868e96",
        }),
        text("Spaces: F-A-C-E", 420, 210, {
          fontSize: 13,
          color: "#868e96",
        }),
      ],
    },

    // ─── Step 3 (7s): Note Values header + Whole & Half ─────────
    {
      delay: 7000,
      elements: [
        text("Note Values:", 60, 250, { fontSize: 24 }),
        // Table header
        box(60, 280, 320, 32, { stroke: "#dee2e6", fill: "#f1f3f5" }),
        text("Symbol", 75, 286, { fontSize: 13, color: "#868e96" }),
        text("Name", 155, 286, { fontSize: 13, color: "#868e96" }),
        text("Beats", 295, 286, { fontSize: 13, color: "#868e96" }),
        // Whole note row
        box(60, 312, 320, 40, { stroke: "#dee2e6", fill: "#fff5f5" }),
        text("○", 85, 318, { fontSize: 22, color: "#e03131" }),
        text("Whole Note", 145, 322, { color: "#e03131" }),
        text("4", 310, 322, { fontSize: 18, color: "#e03131" }),
        // Half note row
        box(60, 352, 320, 40, { stroke: "#dee2e6", fill: "#e7f5ff" }),
        text("𝅗𝅥", 82, 356, { fontSize: 24, color: "#1971c2" }),
        text("Half Note", 145, 362, { color: "#1971c2" }),
        text("2", 310, 362, { fontSize: 18, color: "#1971c2" }),
      ],
    },

    // ─── Step 4 (10s): Quarter & Eighth & Sixteenth ─────────────
    {
      delay: 10000,
      elements: [
        // Quarter note row
        box(60, 392, 320, 40, { stroke: "#dee2e6", fill: "#ebfbee" }),
        text("♩", 85, 396, { fontSize: 22, color: "#2f9e44" }),
        text("Quarter Note", 145, 402, { color: "#2f9e44" }),
        text("1", 310, 402, { fontSize: 18, color: "#2f9e44" }),
        // Eighth note row
        box(60, 432, 320, 40, { stroke: "#dee2e6", fill: "#f3f0ff" }),
        text("♪", 85, 436, { fontSize: 22, color: "#7048e8" }),
        text("Eighth Note", 145, 442, { color: "#7048e8" }),
        text("½", 305, 442, { fontSize: 18, color: "#7048e8" }),
        // Sixteenth note row
        box(60, 472, 320, 40, { stroke: "#dee2e6", fill: "#fff9db" }),
        text("♬", 85, 476, { fontSize: 22, color: "#e67700" }),
        text("Sixteenth Note", 145, 482, { color: "#e67700" }),
        text("¼", 305, 482, { fontSize: 18, color: "#e67700" }),
      ],
    },

    // ─── Step 5 (14s): Time Signatures — 4/4 ───────────────────
    {
      delay: 14000,
      elements: [
        text("Time Signatures:", 430, 250, { fontSize: 24 }),
        text("Top number = how many beats per measure", 430, 282, {
          fontSize: 13,
          color: "#868e96",
        }),
        text("Bottom number = which note gets one beat", 430, 300, {
          fontSize: 13,
          color: "#868e96",
        }),
        // 4/4
        box(430, 330, 90, 80, { stroke: "#e03131", fill: "#fff5f5" }),
        text("4", 462, 335, { fontSize: 28, color: "#e03131" }),
        text("4", 462, 368, { fontSize: 28, color: "#e03131" }),
        line(440, 365, 70, "#e03131"),
        text("\"Common Time\"", 535, 340, { fontSize: 15 }),
        text("4 beats per measure", 535, 365, {
          fontSize: 14,
          color: "#868e96",
        }),
        text("Quarter note = 1 beat", 535, 385, {
          fontSize: 14,
          color: "#868e96",
        }),
      ],
    },

    // ─── Step 6 (17s): Time Signatures — 3/4 and 6/8 ───────────
    {
      delay: 17000,
      elements: [
        // 3/4
        box(430, 425, 90, 80, { stroke: "#1971c2", fill: "#e7f5ff" }),
        text("3", 462, 430, { fontSize: 28, color: "#1971c2" }),
        text("4", 462, 463, { fontSize: 28, color: "#1971c2" }),
        line(440, 460, 70, "#1971c2"),
        text("\"Waltz Time\"", 535, 435, { fontSize: 15 }),
        text("3 beats per measure", 535, 460, {
          fontSize: 14,
          color: "#868e96",
        }),
        text("Think: OOM-pah-pah", 535, 480, {
          fontSize: 14,
          color: "#1971c2",
        }),
      ],
    },

    // ─── Step 7 (20s): Note Subdivision ─────────────────────────
    {
      delay: 20000,
      elements: [
        text("How Notes Subdivide:", 60, 560, { fontSize: 24 }),
        text("(each level splits in half)", 310, 566, {
          fontSize: 14,
          color: "#868e96",
        }),
        // Whole → 2 halves → 4 quarters → 8 eighths
        // Row 1: Whole
        box(310, 600, 180, 36, { stroke: "#e03131", fill: "#fff5f5" }),
        text("○  Whole = 4 beats", 330, 607, {
          fontSize: 14,
          color: "#e03131",
        }),
        // Row 2: Halves
        box(180, 655, 160, 36, { stroke: "#1971c2", fill: "#e7f5ff" }),
        text("𝅗𝅥  Half = 2", 208, 662, { fontSize: 14, color: "#1971c2" }),
        box(460, 655, 160, 36, { stroke: "#1971c2", fill: "#e7f5ff" }),
        text("𝅗𝅥  Half = 2", 488, 662, { fontSize: 14, color: "#1971c2" }),
        // Row 3: Quarters
        ...Array.from({ length: 4 }, (_, i) =>
          box(100 + i * 175, 710, 140, 36, {
            stroke: "#2f9e44",
            fill: "#ebfbee",
          }),
        ),
        ...Array.from({ length: 4 }, (_, i) =>
          text("♩ Qtr = 1", 122 + i * 175, 717, {
            fontSize: 14,
            color: "#2f9e44",
          }),
        ),
      ],
    },

    // ─── Step 8 (23s): Rhythm Example — Measure 1 ──────────────
    {
      delay: 23000,
      elements: [
        text("Rhythm Example in 4/4:", 60, 790, { fontSize: 24 }),
        // Measure 1: four quarter notes
        box(60, 830, 340, 70, { stroke: "#1e1e1e", fill: "#f8f9fa" }),
        text("Measure 1", 170, 815, { fontSize: 12, color: "#868e96" }),
        ...["♩", "♩", "♩", "♩"].map((n, i) =>
          text(n, 100 + i * 80, 840, { fontSize: 28 }),
        ),
        ...["1", "2", "3", "4"].map((n, i) =>
          text(n, 107 + i * 80, 878, { fontSize: 14, color: "#e03131" }),
        ),
        // Measure 2: mixed rhythm (half, quarter, 2 eighths)
        box(420, 830, 390, 70, { stroke: "#1e1e1e", fill: "#f8f9fa" }),
        text("Measure 2 (mixed)", 530, 815, {
          fontSize: 12,
          color: "#868e96",
        }),
        text("𝅗𝅥", 455, 838, { fontSize: 30, color: "#1971c2" }),
        text("♩", 555, 840, { fontSize: 28, color: "#2f9e44" }),
        text("♪", 645, 840, { fontSize: 28, color: "#7048e8" }),
        text("♪", 700, 840, { fontSize: 28, color: "#7048e8" }),
        // Counting for measure 2
        text("1 — 2", 453, 878, { fontSize: 14, color: "#1971c2" }),
        text("3", 560, 878, { fontSize: 14, color: "#2f9e44" }),
        text("4", 650, 878, { fontSize: 14, color: "#7048e8" }),
        text("+", 703, 878, { fontSize: 14, color: "#7048e8" }),
      ],
    },

    // ─── Step 9 (26s): Rests ────────────────────────────────────
    {
      delay: 26000,
      elements: [
        text("Rests (silence has value too!):", 60, 940, { fontSize: 24 }),
        text(
          "Every note has a matching rest — same duration, but silence instead of sound.",
          60,
          975,
          { fontSize: 14, color: "#868e96" },
        ),
        // Rest table
        box(60, 1005, 200, 36, { stroke: "#dee2e6", fill: "#f1f3f5" }),
        text("Note", 80, 1012, { fontSize: 13, color: "#868e96" }),
        text("Rest", 200, 1012, { fontSize: 13, color: "#868e96" }),

        box(60, 1041, 200, 34, { stroke: "#dee2e6" }),
        text("○ Whole", 75, 1048, { fontSize: 14, color: "#e03131" }),
        text("𝄻", 205, 1044, { fontSize: 20, color: "#e03131" }),

        box(60, 1075, 200, 34, { stroke: "#dee2e6" }),
        text("𝅗𝅥 Half", 75, 1082, { fontSize: 14, color: "#1971c2" }),
        text("𝄼", 205, 1078, { fontSize: 20, color: "#1971c2" }),

        box(60, 1109, 200, 34, { stroke: "#dee2e6" }),
        text("♩ Quarter", 75, 1116, { fontSize: 14, color: "#2f9e44" }),
        text("𝄽", 205, 1112, { fontSize: 20, color: "#2f9e44" }),

        // Annotation
        text("A rest means: don't play,", 300, 1050, {
          fontSize: 15,
          color: "#868e96",
        }),
        text("but keep counting!", 300, 1072, {
          fontSize: 15,
          color: "#868e96",
        }),
      ],
    },

    // ─── Step 10 (30s): Key Takeaway ────────────────────────────
    {
      delay: 30000,
      elements: [
        box(60, 1180, 750, 70, {
          stroke: "#f08c00",
          fill: "#fff9db",
          strokeWidth: 3,
        }),
        text(
          "KEY RULE: Each note is exactly HALF the duration of the one above it.",
          90,
          1192,
          { fontSize: 18, color: "#e67700" },
        ),
        text("Whole(4) → Half(2) → Quarter(1) → Eighth(½) → Sixteenth(¼)", 90, 1222, {
          fontSize: 15,
          color: "#e67700",
        }),
      ],
    },
  ];
}

export function useTeachingSimulation(
  excalidrawAPI: ExcalidrawImperativeAPI | null,
) {
  const [status, setStatus] = useState<SimStatus>("idle");
  const [step, setStep] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const excalidrawAPIRef = useRef(excalidrawAPI);
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;
  }, [excalidrawAPI]);

  const start = useCallback(async () => {
    if (!excalidrawAPIRef.current) return;

    setStatus("running");
    setStep(0);

    const { convertToExcalidrawElements } = await import(
      "@excalidraw/excalidraw"
    );
    const { CaptureUpdateAction } = await import("@excalidraw/excalidraw");

    const steps = getLessonSteps();

    steps.forEach((lessonStep, i) => {
      const timer = setTimeout(() => {
        const api = excalidrawAPIRef.current;
        if (!api) return;

        const currentElements = api.getSceneElements();
        const newElements = convertToExcalidrawElements(
          lessonStep.elements as any,
          { regenerateIds: true },
        );

        api.updateScene({
          elements: [...currentElements, ...newElements],
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });

        setStep(i + 1);

        if (i === steps.length - 1) {
          setStatus("done");
        }
      }, lessonStep.delay);

      timersRef.current.push(timer);
    });
  }, []);

  const stop = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setStatus("idle");
    setStep(0);
  }, []);

  const totalSteps = getLessonSteps().length;

  return { status, step, totalSteps, start, stop };
}
