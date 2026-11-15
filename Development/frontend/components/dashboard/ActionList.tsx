"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, CalendarPlus, ChevronRight, CircleCheck, Euro, FileWarning, House, ListChecks } from "lucide-react";
import Pager from "@/components/timeline/Pager";
import type { DashboardItem } from "@/lib/dashboard";
import { relativeDays } from "@/lib/format";

const PAGE_SIZE = 3;

const ICON = {
  deadline: CalendarClock,
  date: CalendarClock,
  review: ListChecks,
  notice: FileWarning,
  deposit: Euro,
  milestone: House,
  setup: CalendarPlus,
  clear: CircleCheck,
};

const TONE = {
  bad: { edge: "bg-bad-solid", chip: "bg-bad-bg text-bad ring-bad-line", label: "Act now" },
  warn: { edge: "bg-warn-solid", chip: "bg-warn-bg text-warn ring-warn-line", label: "Do soon" },
  brand: { edge: "bg-brand", chip: "bg-brand-soft text-brand-dark ring-brand/20", label: "Later" },
  ok: { edge: "bg-ok-solid", chip: "bg-ok-bg text-ok ring-ok-line", label: "Done" },
};

function dueText(item: DashboardItem) {
  if (item.days === undefined) return "";
  const text = relativeDays(item.days);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function ActionList({ items }: { items: DashboardItem[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = items.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const tones = (["bad", "warn", "brand"] as const).filter((tone) => items.some((item) => item.tone === tone));
  const first = current * PAGE_SIZE + 1;

  return (
    <section data-tour="action-list" className="flex flex-col rounded-3xl border border-[#d5e3e4] bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[21px] font-semibold text-brand-dark">Action list</h2>
        {items.length > 0 && <span className="rounded-full bg-brand-dark px-2.5 py-0.5 text-xs font-bold text-white">{items.length}</span>}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-ok-bg text-ok">
            <CircleCheck size={24} aria-hidden />
          </span>
          <p className="mt-3 font-semibold text-ink">Nothing to do right now</p>
          <p className="mt-1 max-w-64 text-sm text-mute">New tasks show up here when a date gets close or a check finds something.</p>
        </div>
      ) : (
        <>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11.5px] text-mute">
            <span>Most urgent first</span>
            <span className="flex flex-wrap gap-3">
              {tones.map((tone) => (
                <span key={tone} className="flex items-center gap-1.5">
                  <span className={`h-3 w-[3px] rounded-full ${TONE[tone].edge}`} />
                  {TONE[tone].label}
                </span>
              ))}
            </span>
          </div>
          <ul className="mt-2 flex-1 divide-y divide-line border-t border-line">
            {shown.map((item) => {
              const Icon = ICON[item.kind];
              const tone = TONE[item.tone];
              const due = dueText(item);
              return (
                <li key={item.key}>
                  <Link href={item.href} className="group relative flex items-center gap-3 py-3 pl-4 pr-1 hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
                    <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full ${tone.edge}`} />
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f4f8f8] text-brand ring-1 ring-[#e1e9ea]">
                      <Icon size={17} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[14.5px] font-semibold text-ink">{item.title}</span>
                        {due && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums ring-1 ${tone.chip}`}>{due}</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-mute">{item.text}</span>
                    </span>
                    <ChevronRight size={16} aria-hidden className="shrink-0 text-[#a9babd] transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs text-mute">
                Showing {first}–{first + shown.length - 1} of {items.length}
              </span>
              <Pager page={current} pages={pages} label="Pages of the action list" onChange={setPage} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
