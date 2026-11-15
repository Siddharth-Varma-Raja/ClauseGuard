"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BellRing, CalendarPlus, CircleCheck, LoaderCircle } from "lucide-react";
import Pager from "@/components/timeline/Pager";
import { addEvent, errorMessage } from "@/lib/api";
import { downloadIcs } from "@/lib/calendarExport";
import { daysUntil, relativeDays } from "@/lib/format";
import { DATE_KINDS, dateKind, noticeType } from "@/lib/notice-meta";
import type { Notice, TimelineEvent } from "@/lib/notice-types";

const PAGE_SIZE = 3;
const REMINDER_DAYS = [7, 1];

function parts(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return {
    weekday: date.toLocaleDateString("en-IE", { weekday: "short" }),
    day: date.getDate(),
    month: date.toLocaleDateString("en-IE", { month: "short" }),
    time: value.includes("T") ? date.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" }) : "",
  };
}

export default function KeyDates({ notice, className = "" }: { notice: Notice; className?: string }) {
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const typeTitle = noticeType(notice.type).title;
  const dates = notice.keyDates.map((item, index) => ({ ...item, day: item.date.slice(0, 10), kind: dateKind(item.label), index }));
  const kinds = Array.from(new Set(dates.map((item) => item.kind)));
  const pages = Math.max(1, Math.ceil(dates.length / PAGE_SIZE));
  const shown = dates.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const events: TimelineEvent[] = dates.map((item) => ({
    id: `${notice.id}-${item.index}`,
    title: `${item.label} (${typeTitle})`,
    date: item.day,
    kind: item.kind,
    note: `From your ${typeTitle.toLowerCase()} check.`,
    done: false,
  }));

  async function addToTimeline() {
    setAdding(true);
    setError("");
    try {
      for (const event of events) {
        await addEvent({ title: event.title, date: event.date, kind: event.kind, note: event.note });
      }
      setAdded(true);
    } catch (err) {
      setError(errorMessage(err, "The dates couldn't be added to your timeline. Please try again."));
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className={`rounded-2xl border border-[#d5e3e4] bg-white p-5 shadow-soft ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[17px] font-semibold text-brand-dark">Key dates</h2>
        {kinds.length > 1 && (
          <p className="flex gap-3 text-[11.5px] text-mute">
            {kinds.map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${DATE_KINDS[kind].dot}`} />
                {DATE_KINDS[kind].label}
              </span>
            ))}
          </p>
        )}
      </div>

      <ul className="mt-3 space-y-3">
        {shown.map((item) => {
          const when = parts(item.date);
          const days = daysUntil(item.day);
          const soon = item.kind === "deadline" && days >= 0 && days <= 30;
          return (
            <li key={item.index} className="flex gap-3">
              <div className="grid w-11 shrink-0 place-items-center rounded-xl bg-[#f4f8f8] py-1 text-center ring-1 ring-[#e1e9ea]">
                <p className="text-[10px] font-bold uppercase text-mute">{when.weekday}</p>
                <p className="font-display text-[19px] font-semibold leading-none tabular-nums text-brand-dark">{when.day}</p>
                <p className="text-[10px] font-bold uppercase text-mute">{when.month}</p>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className={`size-2 shrink-0 rounded-full ${DATE_KINDS[item.kind].dot}`} />
                  {item.label}
                </p>
                {when.time && <p className="mt-0.5 text-[12.5px] text-mute">At {when.time}</p>}
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ${
                    soon ? "bg-warn-bg text-warn ring-warn-line" : "bg-[#f4f8f8] text-mute ring-[#e1e9ea]"
                  }`}
                >
                  {days < 0 ? `Passed ${relativeDays(days)}` : relativeDays(days)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <div className="mt-3 flex justify-end">
          <Pager page={page} pages={pages} label="Pages of key dates" onChange={setPage} />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-bad-line bg-bad-bg p-2 text-xs text-bad">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {added ? (
          <Link
            href="/timeline"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ok-bg text-[13px] font-semibold text-ok ring-1 ring-ok-line hover:brightness-95"
          >
            <CircleCheck size={15} aria-hidden />
            Open timeline
            <ArrowRight size={14} aria-hidden />
          </Link>
        ) : (
          <button
            type="button"
            onClick={addToTimeline}
            disabled={adding}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {adding ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <CalendarPlus size={15} aria-hidden />}
            {adding ? "Adding…" : "Add to timeline"}
          </button>
        )}
        <button
          type="button"
          onClick={() => downloadIcs(events, REMINDER_DAYS)}
          title="Downloads the dates for your calendar app, with alerts a week and a day before"
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#cfdcde] bg-white text-[13px] font-semibold text-brand-dark hover:bg-surface"
        >
          <BellRing size={15} aria-hidden />
          Get reminders
        </button>
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-mute lg:[@media(max-height:800px)]:hidden">Get reminders downloads the dates for your calendar app, with alerts a week and a day before.</p>
    </section>
  );
}
