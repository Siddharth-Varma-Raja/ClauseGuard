"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarClock, CalendarDays, Euro, House, Plus } from "lucide-react";
import Pager from "@/components/timeline/Pager";
import { addMonths as lastDayOfTerm } from "@/lib/dashboard";
import { addMonths, countdown, daysBetween } from "@/lib/timeline";
import { todayIso } from "@/lib/format";
import type { Analysis, TimelineEvent } from "@/lib/notice-types";

type PointKind = "deadline" | "rent" | "event" | "milestone";
type Point = { date: string; title: string; kind: PointKind; done: boolean; more: number };

const PAGE_SIZE = 6;
const ORDER: PointKind[] = ["deadline", "milestone", "rent", "event"];

const STYLE = {
  deadline: { label: "Deadline", dot: "bg-warn-solid", ring: "ring-warn-line", text: "text-warn", Icon: CalendarClock },
  rent: { label: "Rent", dot: "bg-ok-solid", ring: "ring-ok-line", text: "text-ok", Icon: Euro },
  event: { label: "Visit or other", dot: "bg-brand", ring: "ring-brand/30", text: "text-brand", Icon: CalendarDays },
  milestone: { label: "Lease milestone", dot: "bg-brand-dark", ring: "ring-brand-dark/30", text: "text-brand-dark", Icon: House },
};
const PASSED = { label: "Passed", dot: "bg-[#b5c4c6]", ring: "ring-[#d5e3e4]", text: "text-mute" };

function milestones(lease: Analysis | undefined) {
  const start = lease?.tenancyStart?.slice(0, 10);
  if (!lease || !start) return [];
  const list = [
    { date: start, title: "Tenancy starts" },
    { date: addMonths(start, 6), title: "Part 4 rights start" },
  ];
  if (lease.termMonths) list.push({ date: lastDayOfTerm(start, lease.termMonths), title: "Fixed term ends" });
  return list;
}

function buildPoints(events: TimelineEvent[], lease: Analysis | undefined): Point[] {
  const taken = new Set(events.map((e) => e.date));
  const all = [
    ...events.map((e) => ({ date: e.date, title: e.title, kind: e.kind as PointKind, done: e.done })),
    ...milestones(lease)
      .filter((m) => !taken.has(m.date))
      .map((m) => ({ ...m, kind: "milestone" as PointKind, done: false })),
  ];
  const byDate = new Map<string, typeof all>();
  for (const item of all) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, items]) => {
      const sorted = [...items].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
      return { ...sorted[0], done: items.every((i) => i.done), more: items.length - 1 };
    });
}

function pageStarts(total: number, anchor: number) {
  const starts: number[] = [];
  for (let s = anchor; s > 0; s -= PAGE_SIZE) starts.unshift(Math.max(0, s - PAGE_SIZE));
  for (let s = anchor; s < total; s += PAGE_SIZE) starts.push(s);
  return starts.length ? starts : [0];
}

function dateLabel(iso: string, withWeekday = true) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IE", { weekday: withWeekday ? "short" : undefined, day: "numeric", month: "short" });
}

function look(point: Point, today: string) {
  return point.done || point.date < today ? PASSED : STYLE[point.kind];
}

function when(point: Point, today: string) {
  if (point.done) return "Done";
  if (point.date < today) return "Passed";
  return countdown(point.date, today);
}

function todayPosition(shown: Point[], today: string) {
  const next = shown.findIndex((p) => p.date >= today);
  if (next === -1) return 100;
  if (next === 0) return 0;
  const span = daysBetween(shown[next - 1].date, shown[next].date);
  const part = span > 0 ? daysBetween(shown[next - 1].date, today) / span : 0.5;
  return ((next - 0.5 + Math.min(0.7, Math.max(0.3, part))) / shown.length) * 100;
}

function Node({ point, today }: { point: Point; today: string }) {
  const style = look(point, today);
  const Icon = STYLE[point.kind].Icon;
  return (
    <span className={`relative grid size-9 shrink-0 place-items-center rounded-full bg-white ring-[3px] ${style.ring} ${style.text}`}>
      <Icon size={16} aria-hidden />
      {point.more > 0 && (
        <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-brand-dark text-[10px] font-bold text-white ring-2 ring-white">+{point.more}</span>
      )}
    </span>
  );
}

function Overview({ points, shown, lease, today }: { points: Point[]; shown: Point[]; lease: Analysis | undefined; today: string }) {
  const start = lease?.tenancyStart?.slice(0, 10);
  const from = start && lease?.termMonths ? start : points[0].date;
  const to = start && lease?.termMonths ? lastDayOfTerm(start, lease.termMonths) : points[points.length - 1].date;
  const first = points[0].date < from ? points[0].date : from;
  const last = points[points.length - 1].date > to ? points[points.length - 1].date : to;
  const total = daysBetween(first, last);
  if (total <= 0) return null;
  const at = (iso: string) => (daysBetween(first, iso) / total) * 100;
  const left = at(shown[0].date);
  const width = Math.max(2, at(shown[shown.length - 1].date) - left);
  const marks = [
    { left: 0, text: `${start && first === start ? "Moved in · " : ""}${dateLabel(first, false)} ${first.slice(0, 4)}`, align: "" },
    ...(start && lease?.termMonths ? [{ left: at(addMonths(start, 6)), text: `Part 4 rights · ${dateLabel(addMonths(start, 6), false)}`, align: "-translate-x-1/2" }] : []),
    { left: 100, text: `${start && last === to && lease?.termMonths ? "Lease ends · " : ""}${dateLabel(last, false)} ${last.slice(0, 4)}`, align: "-translate-x-full" },
  ];
  const now = today >= first && today <= last ? at(today) : null;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex items-center gap-4">
        <span className="hidden w-24 shrink-0 text-[11.5px] font-semibold text-mute sm:block">Whole tenancy</span>
        <div className="relative h-6 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#e1e9ea]" />
          <div className="absolute inset-y-0 rounded-md bg-brand/10 ring-1 ring-brand/40" style={{ left: `${left}%`, width: `${width}%` }} />
          {points.map((point) => (
            <span key={point.date} className={`absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${look(point, today).dot}`} style={{ left: `${at(point.date)}%` }} />
          ))}
          {now !== null && <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-brand-dark" style={{ left: `${now}%` }} />}
        </div>
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-mute sm:ml-28">
        {marks.map((mark) => (
          <span key={mark.text} className={`absolute whitespace-nowrap ${mark.align}`} style={{ left: `${mark.left}%` }}>
            {mark.text}
          </span>
        ))}
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-mute sm:ml-28">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded bg-brand/10 ring-1 ring-brand/40" />
          Dates shown above
        </span>
        {now !== null && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 rounded bg-brand-dark" />
            Today
          </span>
        )}
      </p>
    </div>
  );
}

export default function TimelineStrip({ events, lease }: { events: TimelineEvent[]; lease: Analysis | undefined }) {
  const today = todayIso();
  const points = buildPoints(events, lease);
  const firstUpcoming = points.findIndex((p) => p.date >= today);
  const anchor = firstUpcoming === -1 ? Math.max(0, points.length - PAGE_SIZE) : Math.max(0, firstUpcoming - 2);
  const starts = pageStarts(points.length, anchor);
  const [page, setPage] = useState<number | null>(null);
  const current = Math.min(page ?? starts.indexOf(anchor), starts.length - 1);
  const shown = points.slice(starts[current], starts[current + 1] ?? points.length);

  const kinds = ORDER.filter((kind) => points.some((p) => p.kind === kind && !(p.done || p.date < today)));
  const hasPassed = points.some((p) => p.done || p.date < today);
  const todayX = shown.length ? todayPosition(shown, today) : 0;
  const nextIndex = shown.findIndex((p) => p.date >= today);

  return (
    <section data-tour="timeline-strip" className="rounded-3xl border border-[#d5e3e4] bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="font-display text-[21px] font-semibold text-brand-dark">Your timeline</h2>
          {shown.length > 0 && (
            <span className="text-[12.5px] text-mute">
              Showing {dateLabel(shown[0].date, false)} – {dateLabel(shown[shown.length - 1].date, false)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {shown.length > 0 && (
            <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-mute">
              {kinds.map((kind) => (
                <span key={kind} className="flex items-center gap-1.5">
                  <span className={`size-2.5 rounded-full ${STYLE[kind].dot}`} />
                  {STYLE[kind].label}
                </span>
              ))}
              {hasPassed && (
                <span className="flex items-center gap-1.5">
                  <span className={`size-2.5 rounded-full ${PASSED.dot}`} />
                  {PASSED.label}
                </span>
              )}
            </p>
          )}
          <Pager page={current} pages={starts.length} label="Pages of the timeline" onChange={setPage} />
          <Link href="/timeline" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
            Open timeline
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-8 text-center">
          <p className="font-semibold text-ink">No dates yet</p>
          <p className="mt-1 max-w-72 text-sm text-mute">Add your rent day or a notice deadline and it shows up here in order.</p>
          <Link href="/timeline" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            <Plus size={15} aria-hidden />
            Add a date
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mt-2 hidden h-[214px] lg:block">
            <div className="absolute inset-x-0 top-[116px] h-1 rounded-full bg-[#e1e9ea]" />
            <div className="absolute left-0 top-[116px] h-1 rounded-full bg-[#b5c4c6]" style={{ width: `${todayX}%` }} />
            {shown.map((point, index) => {
              const style = look(point, today);
              const past = style === PASSED;
              const up = index % 2 === 0;
              return (
                <Link
                  key={point.date}
                  href={`/timeline?date=${point.date}`}
                  aria-label={`${point.title}, ${dateLabel(point.date)}${point.more ? `, and ${point.more} more` : ""}`}
                  className="group absolute top-0 h-full w-0"
                  style={{ left: `${((index + 0.5) / shown.length) * 100}%` }}
                >
                  <span className={`absolute left-1/2 w-[150px] -translate-x-1/2 text-center ${up ? "bottom-[146px]" : "top-[146px]"} ${past ? "opacity-60" : ""}`}>
                    <span className={`block text-[11.5px] font-bold uppercase tracking-wide tabular-nums ${style.text}`}>{dateLabel(point.date)}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[13.5px] font-semibold leading-snug text-ink group-hover:text-brand">{point.title}</span>
                    <span className="mt-0.5 block text-[11.5px] text-mute">{when(point, today)}</span>
                  </span>
                  <span className={`absolute left-1/2 w-px bg-[#cfdcde] ${up ? "top-[72px] h-[26px]" : "top-[138px] h-2"}`} />
                  <span className={`absolute left-0 top-[100px] -translate-x-1/2 transition-transform group-hover:scale-110 ${past ? "opacity-60" : ""}`}>
                    <Node point={point} today={today} />
                  </span>
                </Link>
              );
            })}
            <span
              className="absolute top-[109px] z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-dark px-2 py-0.5 text-[10.5px] font-bold text-white ring-2 ring-white"
              style={{ left: `clamp(24px, ${todayX}%, calc(100% - 24px))` }}
            >
              Today
            </span>
          </div>

          <ol className="relative mt-4 lg:hidden">
            {shown.map((point, index) => {
              const style = look(point, today);
              return (
                <li key={point.date}>
                  {index === nextIndex && <p className="mb-3 w-fit rounded-full bg-brand-dark px-2.5 py-0.5 text-[11px] font-bold text-white">Today</p>}
                  <Link href={`/timeline?date=${point.date}`} className={`flex items-center gap-3 pb-4 ${style === PASSED ? "opacity-60" : ""}`}>
                    <Node point={point} today={today} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[11px] font-bold uppercase tracking-wide ${style.text}`}>{dateLabel(point.date)}</span>
                      <span className="block truncate text-sm font-semibold text-ink">{point.title}</span>
                    </span>
                    <span className="h-fit shrink-0 rounded-full bg-[#f4f8f8] px-2 py-0.5 text-[11px] font-semibold text-mute ring-1 ring-[#e1e9ea]">{when(point, today)}</span>
                  </Link>
                </li>
              );
            })}
            {nextIndex === -1 && <li className="w-fit rounded-full bg-brand-dark px-2.5 py-0.5 text-[11px] font-bold text-white">Today</li>}
          </ol>

          {points.some((p) => p.more > 0) && <p className="mt-1 text-[11px] text-mute">A number on a date, such as +2, means more dates on that day.</p>}
          <Overview points={points} shown={shown} lease={lease} today={today} />
        </>
      )}
    </section>
  );
}
