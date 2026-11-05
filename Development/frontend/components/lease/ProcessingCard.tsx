"use client";

import { useEffect, useState } from "react";
import { Check, Clock, FileSearch, FileText, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import type { UploadProgressEvent } from "@/lib/notice-types";

const LINE_WIDTHS = [92, 78, 86, 64, 90, 72, 84, 58, 88, 70];

const DEFAULT_STAGES = [
  { key: "uploaded", label: "Uploading lease document" },
  { key: "extracting", label: "Reading text with Document AI OCR" },
  { key: "validating", label: "Verifying residential lease format" },
  { key: "redacting", label: "Redacting sensitive PII" },
  { key: "analysing", label: "Checking clauses against Irish tenancy law" },
];

interface ProcessingCardProps {
  steps?: string[];
  current?: number;
  event?: UploadProgressEvent | null;
  fileName?: string;
  fileSizeBytes?: number;
}

export default function ProcessingCard({
  steps,
  current,
  event,
  fileName,
  fileSizeBytes,
}: ProcessingCardProps) {
  let activeIndex = 0;
  let progressFraction = 0.05;
  let displayMessage = "Analyzing document…";

  if (event) {
    if (event.stepIndex !== undefined && event.stepIndex >= 0) {
      activeIndex = event.stepIndex;
    }
    progressFraction = Math.max(0.05, Math.min(1.0, event.progress));
    displayMessage = event.message || displayMessage;
  } else if (typeof current === "number" && steps && steps.length > 0) {
    activeIndex = current;
    progressFraction = Math.max(0.05, Math.min(1.0, (current + 1) / steps.length));
  }

  const [countdown, setCountdown] = useState<number | null>(
    event?.estimatedSecondsRemaining ?? event?.estimatedSeconds ?? null
  );

  useEffect(() => {
    if (event?.estimatedSecondsRemaining !== undefined) {
      setCountdown(event.estimatedSecondsRemaining);
    }
  }, [event?.estimatedSecondsRemaining]);

  useEffect(() => {
    if (countdown === null || countdown <= 0 || event?.step === "completed") return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev && prev > 1 ? prev - 1 : 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown, event?.step]);

  const linesRead = Math.round(progressFraction * LINE_WIDTHS.length);

  const stages = steps
    ? steps.map((s, idx) => ({ key: String(idx), label: s }))
    : DEFAULT_STAGES;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Card className="grid gap-8 overflow-hidden p-6 sm:grid-cols-[220px_1fr] sm:p-10">
        <div className="mx-auto flex w-full max-w-[220px] flex-col items-center justify-center self-center rounded-lg border border-line bg-white p-5 shadow-[0_12px_32px_-12px_rgb(10_59_67/0.35)]">
          <div className="mb-4 h-2.5 w-1/2 rounded-full bg-brand-dark/80" />
          <div className="w-full space-y-2.5">
            {LINE_WIDTHS.map((width, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-colors duration-700 ${
                  i < linesRead ? "bg-brand" : "bg-line"
                }`}
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
          {fileName && (
            <div className="mt-4 flex items-center gap-1.5 text-xs text-mute truncate max-w-full">
              <FileText size={13} className="shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-dark">
              <FileSearch size={24} />
            </div>
            {countdown !== null && (
              <div className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-mute">
                <Clock size={14} className="text-brand" />
                <span>~{countdown}s remaining</span>
              </div>
            )}
          </div>

          <h1 className="mt-5 font-display text-2xl font-semibold text-brand-dark sm:text-3xl">
            Reviewing your lease
          </h1>
          <p className="mt-2 text-sm text-mute">{displayMessage}</p>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
              style={{ width: `${progressFraction * 100}%` }}
            />
          </div>

          <ol className="mt-6 space-y-3.5" aria-live="polite">
            {stages.map((stage, i) => {
              const isDone = i < activeIndex || event?.step === "completed";
              const isActive = i === activeIndex && event?.step !== "completed";
              return (
                <li key={stage.key} className="flex items-center gap-3 text-sm">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      isDone
                        ? "bg-brand text-white"
                        : isActive
                        ? "bg-brand-soft text-brand ring-2 ring-brand/30"
                        : "border border-line text-mute"
                    }`}
                  >
                    {isDone ? (
                      <Check size={14} />
                    ) : isActive ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={
                      isDone
                        ? "font-medium text-ink"
                        : isActive
                        ? "font-semibold text-brand-dark"
                        : "text-mute"
                    }
                  >
                    {stage.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </Card>
    </div>
  );
}
