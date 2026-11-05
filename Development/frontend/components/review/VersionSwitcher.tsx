"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, History, Upload } from "lucide-react";
import type { Analysis, AnalysisVersion } from "@/lib/notice-types";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function VersionSwitcher({
  analysis,
  versions,
  onUpload,
}: {
  analysis: Analysis;
  versions: AnalysisVersion[];
  onUpload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const latestId = versions[versions.length - 1].id;
  const isLatest = analysis.id === latestId;
  const current = versions.find((v) => v.id === analysis.id);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white py-1 pl-2.5 pr-2 text-xs font-semibold text-brand-dark transition-colors hover:border-brand hover:bg-brand-soft"
      >
        <History size={13} aria-hidden />
        Version {current?.version} of {versions.length}
        <span className={cn("rounded-full px-1.5 py-px", isLatest ? "bg-ok-bg text-ok" : "bg-neu-bg text-neu")}>
          {isLatest ? "Latest" : "Older"}
        </span>
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close versions" tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-20 cursor-default" />
          <div className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-5rem))] animate-pop-in rounded-2xl border border-line bg-white p-2 shadow-xl">
            <ul>
              {[...versions].reverse().map((version) => (
                <li key={version.id}>
                  <Link
                    href={`/lease/${version.id}`}
                    aria-current={version.id === analysis.id ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn("flex items-start gap-3 rounded-xl p-2.5 hover:bg-surface", version.id === analysis.id && "bg-brand-soft/70")}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-dark text-xs font-semibold text-white">
                      V{version.version}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                        Version {version.version}
                        {version.id === latestId && <span className="rounded-full bg-ok-bg px-1.5 py-px text-[11px] text-ok">Latest</span>}
                      </span>
                      <span className="block text-xs text-mute">Uploaded {fmtDate(version.createdAt.slice(0, 10))}</span>
                      <span className="mt-1 flex gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-bad-solid" aria-hidden />
                          <b>{version.counts.red}</b> high
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-warn-solid" aria-hidden />
                          <b>{version.counts.amber}</b> medium
                        </span>
                      </span>
                    </span>
                    {version.id === analysis.id && <Check size={17} className="mt-1 shrink-0 text-brand" aria-label="Viewing" />}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mx-1 my-1.5 h-px bg-line" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onUpload();
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-dark hover:bg-surface"
            >
              <Upload size={16} aria-hidden />
              Upload updated lease
            </button>
          </div>
        </>
      )}
    </div>
  );
}
