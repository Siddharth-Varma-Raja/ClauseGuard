"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import Pager from "@/components/timeline/Pager";
import { useShortScreen } from "@/lib/useShortScreen";
import { CHECKS, sortChecks } from "@/lib/notice-meta";
import type { NoticeCheck } from "@/lib/notice-types";


export default function CheckList({ checks, className = "flex" }: { checks: NoticeCheck[]; className?: string }) {
  const [page, setPage] = useState(0);
  const pageSize = useShortScreen() ? 3 : 4;
  const sorted = sortChecks(checks);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const shown = sorted.slice(current * pageSize, current * pageSize + pageSize);
  const hasProblems = sorted.some((check) => check.status === "fail" || check.status === "warn");

  return (
    <section className={`flex-col overflow-hidden rounded-2xl border border-[#d5e3e4] bg-white shadow-soft ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="font-display text-[17px] font-semibold text-brand-dark">What we checked</h2>
        {hasProblems && <span className="text-xs text-mute">Problems are listed first</span>}
      </div>

      {sorted.length === 0 ? (
        <p className="flex-1 px-5 py-6 text-sm text-mute">No separate checks were returned for this notice.</p>
      ) : (
        <ul className="flex-1 divide-y divide-line">
          {shown.map((check, index) => {
            const tone = CHECKS[check.status] ?? CHECKS.info;
            return (
              <li key={`${check.title}-${index}`} className="flex gap-3.5 px-4 py-3.5 sm:px-5">
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
                  <tone.Icon size={18} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold text-ink">{check.title}</p>
                    <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>{tone.label}</span>
                  </div>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-mute">{check.detail}</p>
                  {check.source && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-[#f4f8f8] px-2 py-0.5 text-[11.5px] font-medium text-mute ring-1 ring-[#e1e9ea]">
                      <BookOpen size={12} aria-hidden className="shrink-0 text-brand" />
                      {check.source}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-line bg-[#f4f8f8] px-4 py-2.5 sm:px-5">
        <p className="text-xs text-mute">General information based on Irish tenancy law. It isn&apos;t legal advice.</p>
        <Pager page={current} pages={pages} label="Pages of checks" onChange={setPage} />
      </div>
    </section>
  );
}
