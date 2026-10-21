"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Upload, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import PageTour from "@/components/PageTour";
import { UPLOAD_TOUR } from "@/lib/tours";

const MAX_SIZE_MB = 10;

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function NewLeasePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  function chooseFile(selectedFile: File | undefined) {
    setError("");
    setFile(null);

    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("This file isn't a PDF. Save your lease as a PDF and try again.");
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

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/leases", { method: "POST", body: formData });

      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (!isJson) {
        throw new Error(`Upload API returned ${res.status} ${res.statusText}. Is app/api/leases/route.ts in place?`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`);

      router.push(`/lease/${data.id}`);
    } catch (err) {
      console.error("Lease upload failed:", err);
      setError(err instanceof Error ? err.message : "The upload didn't go through. Try again.");
      setUploading(false);
    }
  }

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

          <input
            id="lease-file"
            type="file"
            accept="application/pdf,.pdf"
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
          {uploading ? "Uploading…" : "Check my lease"}
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