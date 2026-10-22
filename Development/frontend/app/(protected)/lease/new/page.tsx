"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Upload, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import PageTour from "@/components/PageTour";
import ProcessingCard from "@/components/lease/ProcessingCard";
import { UPLOAD_TOUR } from "@/lib/tours";
import { ApiError, LEASE_ACCEPT, LEASE_MAX_BYTES, errorMessage, isAllowedLeaseFile, uploadLease } from "@/lib/api";

const MAX_SIZE_MB = LEASE_MAX_BYTES / 1024 / 1024;

const STEPS = [
  "Uploading your lease",
  "Reading the text",
  "Removing personal details",
  "Checking each clause against Irish tenancy law",
];
const STEP_INTERVAL_MS = 6000;

function uploadErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 413) return `This file is over ${MAX_SIZE_MB} MB. Try a smaller scan or compress the PDF.`;
    if (error.status === 415) return "This file type isn't supported. Upload a PDF, DOCX, JPG or PNG.";
    if (error.status === 422) return error.message;
    if (error.status === 408) return "The analysis took too long. The server may be waking up — please try again.";
  }
  return errorMessage(error, "The upload didn't go through. Try again.");
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function NewLeasePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  function chooseFile(selectedFile: File | undefined) {
    setError("");
    setFile(null);

    if (!selectedFile) return;

    if (!isAllowedLeaseFile(selectedFile)) {
      setError("This file type isn't supported. Upload a PDF, DOCX, JPG or PNG.");
      return;
    }
    if (selectedFile.size === 0) {
      setError("This file is empty. Choose another file.");
      return;
    }
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`This file is over ${MAX_SIZE_MB} MB. Try a smaller scan or compress the PDF.`);
      return;
    }

    setFile(selectedFile);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setError("");
    setProgress(0);
    const timer = setInterval(() => setProgress((p) => Math.min(p + 1, STEPS.length - 1)), STEP_INTERVAL_MS);

    try {
      const result = await uploadLease(file);
      clearInterval(timer);
      setProgress(STEPS.length);
      router.push(`/lease/${result.id}`);
    } catch (err) {
      setError(uploadErrorMessage(err));
      setUploading(false);
    } finally {
      clearInterval(timer);
    }
  }

  if (uploading) return <ProcessingCard steps={STEPS} current={progress} />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Link href="/lease" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-brand hover:underline">
          <ArrowLeft size={18} />
          Back to my leases
        </Link>
        <PageTour tourId="leases" steps={UPLOAD_TOUR} />
      </div>

      <h1 className="mt-6 font-display text-4xl font-semibold text-brand-dark">Check a lease</h1>
      <p className="mt-2 max-w-xl text-lg text-mute">
        Upload your rental agreement and we will highlight the clauses worth questioning before you sign.
      </p>

      <section className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
        <label
          htmlFor="lease-file"
          data-tour="drop-zone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[#1b8a98]",
            dragging ? "border-brand bg-brand-soft" : "border-line bg-surface/60 hover:border-brand hover:bg-brand-soft/50",
          )}
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-white text-brand shadow-soft">
            <Upload size={26} />
          </span>
          <span className="mt-4 text-lg font-semibold text-brand-dark">
            {dragging ? "Drop your lease here" : "Drag your lease here, or choose a file"}
          </span>
          <span className="mt-1 text-sm text-mute">PDF, DOCX, JPG or PNG up to {MAX_SIZE_MB} MB</span>
          <span className="mt-1 text-xs text-mute">Personal details are removed before your lease is analysed.</span>

          <input
            id="lease-file"
            type="file"
            accept={LEASE_ACCEPT}
            disabled={uploading}
            onChange={(e) => {
              chooseFile(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="sr-only"
          />
        </label>

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bad-bg text-bad">
              <FileText size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{file.name}</p>
              <p className="text-sm text-mute">{formatSize(file.size)}</p>
            </div>
            {!uploading && (
              <button
                onClick={() => setFile(null)}
                aria-label="Remove file"
                className="grid size-9 cursor-pointer place-items-center rounded-full text-mute hover:bg-surface"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">
            {error}
          </p>
        )}

        <button
          type="button"
          data-tour="check-button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading && <Loader2 size={18} className="animate-spin" />}
          {uploading ? "Checking…" : "Check my lease"}
        </button>

      </section>

      <ol data-tour="what-happens" className="mt-8 grid gap-4 grid-cols-3">
        {[
          ["We read your lease", "Each clause is found and separated out."],
          ["We check each clause", "Against Irish tenancy law and RTB guidance."],
          ["You review the results", "Issues are highlighted with what you can do."],
        ].map(([title, text], i) => (
          <li key={title} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-dark">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-ink">{title}</p>
              <p className="text-sm text-mute">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}