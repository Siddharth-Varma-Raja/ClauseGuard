"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, FileText, Lightbulb, Lock, Play, Scale, ShieldCheck, TriangleAlert, Upload } from "lucide-react";
import ProcessingCard from "@/components/lease/ProcessingCard";
import { ApiError, LEASE_ACCEPT, LEASE_MAX_BYTES, errorMessage, isAllowedLeaseFile, uploadLease } from "@/lib/api";
import type { UploadProgressEvent } from "@/lib/notice-types";
import { cn } from "@/lib/cn";

const MAX_SIZE_MB = LEASE_MAX_BYTES / 1024 / 1024;

const STEPS = [
  "Uploading your lease",
  "Reading the text",
  "Removing personal details",
  "Checking each clause against Irish tenancy law",
];
const STEP_INTERVAL_MS = 6000;

const TAGS = [
  { title: "Deposit of 3 months", text: "May break the law", icon: TriangleAlert, tone: "bg-bad-bg text-bad", place: "left-[8%] top-[18%] -rotate-3" },
  { title: "Rent review", text: "Looks fine", icon: CircleCheck, tone: "bg-ok-bg text-ok", place: "right-[8%] top-[13%] rotate-3" },
  { title: "No pets clause", text: "Worth asking about", icon: CircleAlert, tone: "bg-warn-bg text-warn", place: "right-[13%] top-[28%] -rotate-2" },
];

const FACTS = [
  "In Ireland a deposit can't be more than one month's rent.",
  "Your landlord can't ask for more than one month's rent in advance.",
  "Your landlord must register your tenancy with the RTB."
]

const PAGE_LINES = ["bg-line", "bg-[#f4b9b1] w-4/5", "bg-line", "bg-[#f3d38e] w-2/3", "bg-line w-1/2", "bg-[#a9dcbc] w-3/4", "bg-line"];

function uploadErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 413) return `This file is over ${MAX_SIZE_MB} MB. Try a smaller scan or compress the PDF.`;
    if (error.status === 415) return "This file type isn't supported. Upload a PDF, DOCX, JPG or PNG.";
    if (error.status === 422) return error.message;
    if (error.status === 408) return "The analysis took too long. The server may be waking up, please try again.";
  }
  return errorMessage(error, "The upload didn't go through. Try again.");
}

export default function UploadBox({ title, highlight, subtitle, isNewUser = false, children }: { title: string; highlight: string; subtitle: string; isNewUser?: boolean; children?: React.ReactNode }) {
  const router = useRouter();
  const [fact] = useState(() => FACTS[Math.floor(Math.random() * FACTS.length)]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progressEvent, setProgressEvent] = useState<UploadProgressEvent | null>(null);

  async function startUpload(selectedFile: File | undefined) {
    setError("");
    if (!selectedFile) return;

    if (!isAllowedLeaseFile(selectedFile)) {
      setError("This file type isn't supported. Upload a PDF, DOCX, JPG or PNG.");
      return;
    }
    if (selectedFile.size === 0) {
      setError("This file is empty. Choose another file.");
      return;
    }
    if (selectedFile.size > LEASE_MAX_BYTES) {
      setError(`This file is over ${MAX_SIZE_MB} MB. Try a smaller scan or compress the PDF.`);
      return;
    }

    setUploading(true);
    setFile(selectedFile);
    setProgressEvent({
      step: "uploaded",
      stepIndex: 0,
      progress: 0.05,
      message: "Sending file to server…",
      estimatedSeconds: 30,
      estimatedSecondsRemaining: 30,
    });

    try {
      const result = await uploadLease(selectedFile, (evt) => {
        setProgressEvent(evt);
      });
      router.push(`/lease/${result.id}`);
    } catch (err) {
      setError(uploadErrorMessage(err));
      setUploading(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    startUpload(event.dataTransfer.files[0]);
  }

  if (uploading) {
    return (
      <ProcessingCard
        event={progressEvent}
        fileName={file?.name}
        fileSizeBytes={file?.size}
      />
    );
  }

  return (
    <>
      <div className="relative isolate pb-6 pt-2">
        <span className="pointer-events-none absolute hidden sm:block left-0 top-0 -z-10 size-96 rounded-full bg-[#bfe3e0] opacity-60 blur-3xl" />
        <span className="pointer-events-none absolute hidden sm:block right-0 top-1/3 -z-10 size-96 rounded-full bg-[#ffe2c6] opacity-50 blur-3xl" />
        <span className="pointer-events-none absolute hidden sm:block bottom-0 left-1/3 -z-10 size-80 rounded-full bg-[#d4ecd9] opacity-60 blur-3xl" />

        <div className="animate-fade-up text-center">
          {isNewUser ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-warn-line bg-white py-1.5 pl-1.5 pr-4 text-xs text-ink shadow-soft sm:text-sm">
              <span className="grid size-7 place-items-center rounded-full bg-warn-bg text-warn">
                <Lightbulb size={15} />
              </span>
              <span>
                <b className="font-semibold text-warn">Did you know?</b> {fact}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-4 text-xs font-semibold text-brand-dark shadow-soft sm:text-sm">
              <span className="grid size-7 place-items-center rounded-full bg-ok-solid text-white">
                <Scale size={15} />
              </span>
              Built on Irish tenancy law and RTB guidance
            </span>
          )}
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-brand-dark">
            {title} <span className="bg-[linear-gradient(transparent_62%,#ffd9a8_62%,#ffd9a8_90%,transparent_90%)]">{highlight}</span>
          </h1>
          <p className="mt-2 text-lg text-mute">{subtitle}</p>
        </div>

        <label
          htmlFor="lease-file"
          data-tour="upload-box"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{ animationDelay: "150ms" }}
          className="animate-fade-up group mx-auto mt-7 block max-w-5xl cursor-pointer rounded-[2rem] bg-[linear-gradient(135deg,#1a7d86,#0a3f47)] p-3 shadow-[0_30px_70px_-10px_rgb(11_58_66/0.45)] focus-within:outline-3 focus-within:outline-offset-4 focus-within:outline-[#1b8a98]"
        >
          <div
            className={cn(
              "relative flex min-h-[30rem] flex-col items-center overflow-hidden rounded-3xl border-2 border-dashed px-6 pb-6 pt-8 text-center transition-colors",
              "bg-[radial-gradient(rgb(255_255_255/0.09)_1.2px,transparent_1.2px),radial-gradient(70%_70%_at_50%_18%,rgb(120_220_215/0.35),transparent_70%)] bg-size-[22px_22px,100%_100%]",
              dragging ? "border-white bg-white/10" : "border-white/35 group-hover:border-white/60",
            )}
          >
            {TAGS.map((tag, i) => (
              <span key={tag.title} className={cn("absolute hidden lg:block", tag.place)}>
                <span
                  className="animate-float flex items-center gap-3 rounded-2xl bg-white py-2.5 pl-2.5 pr-4 text-left shadow-[0_14px_30px_rgb(0_0_0/0.22)]"
                  style={{ animationDelay: `${i * 1.2}s` }}
                >
                  <span className={cn("grid size-9 place-items-center rounded-xl", tag.tone)}>
                    <tag.icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{tag.title}</span>
                    <span className="block text-xs text-mute">{tag.text}</span>
                  </span>
                </span>
              </span>
            ))}

            <div className="relative h-40 w-32">
              <span className="absolute inset-0 -translate-x-3 translate-y-1 -rotate-9 rounded-2xl bg-white/35" />
              <span className="absolute inset-0 translate-x-3 translate-y-1 rotate-6 rounded-2xl bg-white/60" />
              <div className="absolute inset-0 overflow-hidden rounded-2xl bg-white px-5 py-6 shadow-[0_18px_36px_rgb(0_0_0/0.28)]">
                {PAGE_LINES.map((line, i) => (
                  <span key={i} className={cn("mb-3 block h-2 rounded-full", line)} />
                ))}
                <span className="animate-scan absolute inset-x-0 h-10 border-b-2 border-ok-solid bg-[linear-gradient(transparent,rgb(31_157_85/0.22))]" />
              </div>
              <span className="absolute -bottom-5 -right-6 grid size-14 place-items-center rounded-full border-4 border-[#12636c] bg-[linear-gradient(135deg,#2bb56a,#178a4a)] text-white shadow-lg">
                <ShieldCheck size={26} />
              </span>
            </div>

            <span className="mt-18 inline-flex items-center gap-4 rounded-full bg-white py-3 pl-3 pr-6 font-sans text-lg font-semibold whitespace-nowrap text-brand-dark shadow-[0_0_0_10px_rgb(255_255_255/0.12),0_22px_40px_rgb(0_0_0/0.28)] transition-transform group-hover:scale-[1.03] sm:pr-10">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#1f9d55,#0e5560)] text-white">
                <Upload size={15} />
              </span>
              {dragging ? "Drop it here" : "Upload your lease"}
            </span>
            <p className="mt-6 text-white/85">
              or <span className="font-semibold text-white">drop your file anywhere in this box</span>
            </p>

            {isNewUser && (
              <p className="mt-4 flex flex-wrap items-center justify-center gap-3 text-white/85">
                Not ready to upload yet?
                <Link
                  href="/lease/try"
                  className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-white/55 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20"
                >
                  <Play size={15} />
                  Explore a sample lease
                </Link>
              </p>
            )}

            {error && (
              <p role="alert" className="mt-5 max-w-lg rounded-xl bg-white px-4 py-3 text-sm font-medium text-bad">
                {error}
              </p>
            )}

            <div className="mt-auto flex flex-wrap justify-center gap-x-6 gap-y-2 pt-6 text-xs text-white/65 sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <FileText size={15} />
                PDF, Word or photo, up to {MAX_SIZE_MB} MB
              </span>
              <span className="inline-flex items-center gap-2">
                <Lock size={15} />
                Private, personal details removed
              </span>
            </div>

            <input
              id="lease-file"
              type="file"
              accept={LEASE_ACCEPT}
              onChange={(e) => {
                startUpload(e.target.files?.[0]);
                e.target.value = "";
              }}
              className="sr-only"
            />
          </div>
        </label>
      </div>
      {children}
    </>
  );
}
