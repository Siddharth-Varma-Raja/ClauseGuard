"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, Upload, X } from "lucide-react";
import { ApiError, LEASE_ACCEPT, LEASE_MAX_BYTES, errorMessage, isAllowedLeaseFile, uploadLeaseVersion } from "@/lib/api";
import type { Analysis } from "@/lib/notice-types";
import { isSampleId } from "@/lib/sample-lease";
import { cn } from "@/lib/cn";

const MAX_SIZE_MB = LEASE_MAX_BYTES / 1024 / 1024;
const STEP_INTERVAL_MS = 6000;
const SAMPLE_STEP_INTERVAL_MS = 700;

function uploadErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404 || error.status === 405) return "Adding an updated lease isn't available yet. Please try again later.";
    if (error.status === 409) return "This file is the same as your current version, so there's nothing new to check.";
    if (error.status === 413) return `This file is over ${MAX_SIZE_MB} MB. Try a smaller scan or compress the PDF.`;
    if (error.status === 415) return "This file type isn't supported. Upload a PDF, DOCX, JPG or PNG.";
    if (error.status === 422) return error.message;
    if (error.status === 408) return "The analysis took too long. The server may be waking up, please try again.";
  }
  return errorMessage(error, "The upload didn't go through. Try again.");
}

export default function UploadVersionDialog({
  analysis,
  nextVersion,
  onClose,
}: {
  analysis: Analysis;
  nextVersion: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const isSample = isSampleId(analysis.id);

  const steps = [
    "Uploading your updated lease",
    "Reading the text",
    "Removing personal details",
    "Checking each clause",
    `Comparing it with Version ${nextVersion - 1}`,
  ];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function startUpload(file: File | null) {
    setError("");
    if (!isSample) {
      if (!file) return;
      if (!isAllowedLeaseFile(file)) {
        setError("This file type isn't supported. Upload a PDF, DOCX, JPG or PNG.");
        return;
      }
      if (file.size === 0) {
        setError("This file is empty. Choose another file.");
        return;
      }
      if (file.size > LEASE_MAX_BYTES) {
        setError(`This file is over ${MAX_SIZE_MB} MB. Try a smaller scan or compress the PDF.`);
        return;
      }
    }

    setUploading(true);
    setProgress(0);
    const timer = setInterval(
      () => setProgress((p) => Math.min(p + 1, steps.length - 1)),
      isSample ? SAMPLE_STEP_INTERVAL_MS : STEP_INTERVAL_MS,
    );

    try {
      if (isSample) await new Promise((resolve) => setTimeout(resolve, SAMPLE_STEP_INTERVAL_MS * steps.length));
      const result = await uploadLeaseVersion(analysis.id, file);
      setProgress(steps.length);
      router.push(`/lease/${result.id}?view=changes`);
    } catch (err) {
      setError(uploadErrorMessage(err));
      setUploading(false);
    } finally {
      clearInterval(timer);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    startUpload(event.dataTransfer.files[0] ?? null);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Upload your updated lease"
      onClose={onClose}
      onCancel={(event) => {
        if (uploading) event.preventDefault();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg animate-pop-in overflow-hidden rounded-3xl bg-white shadow-2xl backdrop:bg-ink/40"
    >
      <header className="flex items-start justify-between gap-3 p-6 pb-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-brand-dark">
            {uploading ? `Adding Version ${nextVersion}…` : "Upload your updated lease"}
          </h2>
          <p className="mt-1 text-sm text-mute">
            It's added to <b className="font-semibold text-ink">{analysis.fileName}</b> as Version {nextVersion}. Your earlier version stays saved.
          </p>
        </div>
        {!uploading && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-mute hover:bg-surface"
          >
            <X size={19} />
          </button>
        )}
      </header>

      {uploading ? (
        <ol className="space-y-2.5 p-6 pt-3" aria-live="polite">
          {steps.map((step, i) => (
            <li
              key={step}
              className={cn("flex items-center gap-2.5 text-sm", i < progress ? "text-ink" : i === progress ? "font-semibold text-brand-dark" : "text-mute/60")}
            >
              {i < progress ? (
                <CircleCheck size={18} className="text-ok-solid" aria-hidden />
              ) : i === progress ? (
                <Loader2 size={18} className="animate-spin text-brand" aria-hidden />
              ) : (
                <span className="grid size-[18px] place-items-center" aria-hidden>
                  <span className="size-1.5 rounded-full bg-line" />
                </span>
              )}
              {step}
            </li>
          ))}
        </ol>
      ) : (
        <div className="p-6 pt-3">
          {isSample ? (
            <button
              type="button"
              onClick={() => startUpload(null)}
              className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface/60 px-6 py-9 text-center transition-colors hover:border-brand hover:bg-brand-soft/50"
            >
              <span className="grid size-12 place-items-center rounded-full bg-brand text-white">
                <Upload size={20} aria-hidden />
              </span>
              <span className="font-semibold text-brand-dark">Use the sample updated lease</span>
              <span className="text-sm text-mute">This is a sample, so no file is needed.</span>
            </button>
          ) : (
            <label
              htmlFor="lease-version-file"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[#1b8a98]",
                dragging ? "border-brand bg-brand-soft" : "border-line bg-surface/60 hover:border-brand hover:bg-brand-soft/50",
              )}
            >
              <span className="grid size-12 place-items-center rounded-full bg-brand text-white">
                <Upload size={20} aria-hidden />
              </span>
              <span className="font-semibold text-brand-dark">{dragging ? "Drop it here" : "Choose the new file"}</span>
              <span className="text-sm text-mute">or drop it here. PDF, Word or photo, up to {MAX_SIZE_MB} MB</span>
              <input
                id="lease-version-file"
                type="file"
                accept={LEASE_ACCEPT}
                onChange={(e) => {
                  startUpload(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">
              {error}
            </p>
          )}

          <p className="mt-3 text-center text-xs text-mute">
            Is this a different property?{" "}
            <Link href="/lease/new" className="font-semibold text-brand underline">
              Check it as a new lease
            </Link>
          </p>
        </div>
      )}
    </dialog>
  );
}
