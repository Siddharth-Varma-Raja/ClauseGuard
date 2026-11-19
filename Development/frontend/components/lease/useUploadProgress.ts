"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UploadProgress, UploadStep } from "@/lib/api";


const STEPS: { label: string; doneAfter: UploadStep }[] = [
  { label: "Uploading your lease", doneAfter: "received" },
  { label: "Reading the text", doneAfter: "extract" },
  { label: "Checking it's a lease", doneAfter: "lease_check" },
  { label: "Removing personal details", doneAfter: "redact" },

  { label: "Checking each clause against Irish tenancy law", doneAfter: "analyse" },
];

export const UPLOAD_STEP_LABELS = STEPS.map((s) => s.label);

// Used only until the server sends its own estimate. Calibrated from Cloud Run uploads, Nov 2026.
const ASSUMED_UPLOAD_BYTES_PER_SECOND = 1_500_000;
const PROCESSING_GUESS_SECONDS = { pdf: 2.5, docx: 2.2, image: 4.5 };

function processingGuessSeconds(file: File | null) {
  if (!file) return PROCESSING_GUESS_SECONDS.pdf;
  if (file.type.startsWith("image/")) return PROCESSING_GUESS_SECONDS.image;
  if (file.name.toLowerCase().endsWith(".docx")) return PROCESSING_GUESS_SECONDS.docx;
  return PROCESSING_GUESS_SECONDS.pdf;
}

export function formatRemaining(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  if (seconds <= 0) return "Almost done…";
  if (seconds < 60) return `About ${seconds} second${seconds === 1 ? "" : "s"} remaining`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `About ${minutes} min${rest ? ` ${rest} s` : ""} remaining`;
}

/** Countdown text that refreshes four times a second while `running`. */
export function useRemainingText(readyAt: number, running: boolean) {
  const [now, setNow] = useState(() => (typeof performance === "undefined" ? 0 : performance.now()));
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(timer);
  }, [running]);
  return formatRemaining(readyAt - now);
}

export function useUploadProgress() {

  const [done, setDone] = useState(0);
  const [durations, setDurations] = useState<number[]>([]);
  const [readyAt, setReadyAt] = useState(0);
  const lastTick = useRef(0);
  const firstTick = useRef(0);
  const processingGuess = useRef(PROCESSING_GUESS_SECONDS.pdf);
  const hasServerEstimate = useRef(false);
  const firstEstimateSeconds = useRef<number | null>(null);
  const tookSeconds = useRef<number[]>([]);
  const serverSeconds = useRef<Partial<Record<UploadStep, number>>>({});

  const reset = useCallback((file: File | null) => {
    const now = performance.now();
    const uploadSeconds = (file?.size ?? 0) / ASSUMED_UPLOAD_BYTES_PER_SECOND;
    processingGuess.current = processingGuessSeconds(file);
    hasServerEstimate.current = false;
    firstEstimateSeconds.current = null;
    setDone(0);
    setDurations([]);
    setReadyAt(now + (uploadSeconds + processingGuess.current) * 1000);
    lastTick.current = now;
    firstTick.current = now;
    tookSeconds.current = [];
    serverSeconds.current = {};
  }, []);

  const onProgress = useCallback((event: UploadProgress) => {
    const now = performance.now();

    if (event.kind === "estimate") {
      if (!hasServerEstimate.current) {
        firstEstimateSeconds.current = (now - firstTick.current) / 1000 + event.remainingSeconds;
      }
      hasServerEstimate.current = true;
      setReadyAt(now + event.remainingSeconds * 1000);
      return;
    }

    serverSeconds.current[event.step] = event.seconds;
    // File received: only processing is left until the server's estimate arrives.
    if (event.step === "received" && !hasServerEstimate.current) {
      setReadyAt(now + processingGuess.current * 1000);
    }

    const index = STEPS.findIndex((s) => s.doneAfter === event.step);
    if (index === -1) return;
    tookSeconds.current[index] = (now - lastTick.current) / 1000;
    lastTick.current = now;
    setDurations([...tookSeconds.current]);
    setDone((n) => Math.max(n, index + 1));
  }, []);


  const logSummary = useCallback(() => {
    const totalSeconds = (performance.now() - firstTick.current) / 1000;
    console.info(`[upload] Analysis ready in ${totalSeconds.toFixed(2)} s`, {
      firstServerEstimateSeconds: firstEstimateSeconds.current,
      browserSeconds: Object.fromEntries(STEPS.map((s, i) => [s.doneAfter, tookSeconds.current[i]])),
      serverSeconds: serverSeconds.current,
    });
  }, []);

  return { steps: UPLOAD_STEP_LABELS, done, durations, readyAt, onProgress, reset, logSummary };
}
