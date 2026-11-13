"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import Pager from "@/components/timeline/Pager";
import { VERDICTS, noticeType } from "@/lib/notice-meta";
import type { NoticeSummary } from "@/lib/notice-types";

const PAGE_SIZE = 3;
const LEGEND = (["invalid", "attention", "valid"] as const).map((key) => VERDICTS[key]);

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" });
}

export default function PastChecks({ notices, loading, error }: { notices: NoticeSummary[]; loading: boolean; error: string }) {
  const [page, setPage] = useState(0);
  const sorted = [...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const first = current * PAGE_SIZE + 1;

  return (
    <section data-tour="previous-checks" className="flex flex-col overflow-hidden rounded-2xl border border-[#d5e3e4] bg-white shadow-soft">
      <div className="px-5 pb-2.5 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-brand-dark">Your past checks</h2>
          {notices.length > 0 && (
            <span className="text-xs text-mute">
              {notices.length} check{notices.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {notices.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-mute">
            {LEGEND.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className={`h-3 w-[3px] rounded-full ${item.solid}`} />
                {item.label}
              </span>
            ))}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 border-t border-line p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p role="status" className="mx-4 mb-4 rounded-xl border border-warn-line bg-warn-bg p-3 text-sm text-warn">
          {error}
        </p>
      ) : notices.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center border-t border-line px-6 py-8 text-center">
          <p className="font-semibold text-brand-dark">No checks yet</p>
          <p className="mt-1 text-sm text-mute">Notices you check will be listed here.</p>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line border-t border-line">
            {shown.map((notice) => {
              const verdict = VERDICTS[notice.verdict] ?? VERDICTS.info;
              const { title, Icon } = noticeType(notice.type);
              return (
                <li key={notice.id}>
                  <Link
                    href={`/notices/${notice.id}`}
                    className="relative flex gap-3 py-3.5 pl-5 pr-4 hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                  >
                    <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full ${verdict.solid}`} />
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f4f8f8] text-brand ring-1 ring-[#e1e9ea]">
                      <Icon size={17} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{title}</span>
                        <span className="shrink-0 text-xs tabular-nums text-mute">{shortDate(notice.createdAt)}</span>
                      </span>
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${verdict.bg} ${verdict.text} ${verdict.ring}`}>
                        <verdict.Icon size={11} aria-hidden />
                        {verdict.label}
                      </span>
                      <span className="mt-1.5 line-clamp-2 block text-[12.5px] leading-snug text-mute">{notice.summary}</span>
                    </span>
                    <ChevronRight size={16} aria-hidden className="mt-2 shrink-0 text-[#a9babd]" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-line bg-[#f4f8f8] px-4 py-2.5">
              <span className="text-xs text-mute">
                Showing {first}–{first + shown.length - 1} of {sorted.length}
              </span>
              <Pager page={current} pages={pages} label="Pages of past checks" onChange={setPage} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
