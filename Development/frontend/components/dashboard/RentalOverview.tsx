"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarRange, ChevronLeft, ChevronRight, Euro, House, PiggyBank } from "lucide-react";
import { addMonths, leaseTitle, upcomingEvents } from "@/lib/dashboard";
import { addMonths as addWholeMonths, daysBetween, monthsBetween } from "@/lib/timeline";
import { euro, fmtDate, relativeDays, daysUntil, todayIso } from "@/lib/format";
import type { Analysis, TimelineEvent } from "@/lib/notice-types";

const RING = [
  { key: "red", colour: "#ff9b8f", label: "high risk" },
  { key: "amber", colour: "#f5c451", label: "worth asking about" },
  { key: "green", colour: "#7fdca5", label: "fine" },
  { key: "grey", colour: "rgb(255 255 255 / 0.45)", label: "for information" },
] as const;

const NUMBER = "font-display font-semibold tabular-nums leading-none";

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

function ordinal(day: number) {
  if (day % 10 === 1 && day !== 11) return `${day}st`;
  if (day % 10 === 2 && day !== 12) return `${day}nd`;
  if (day % 10 === 3 && day !== 13) return `${day}rd`;
  return `${day}th`;
}

function Stat({ Icon, label, value, note, tone }: { Icon: typeof Euro; label: string; value: string; note: string; tone?: "bad" | "ok" }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-white/60 sm:text-[11px]">
        <Icon size={12} aria-hidden className="hidden shrink-0 sm:block" />
        <span className="truncate">{label}</span>
      </p>
      <p className={`${NUMBER} mt-1 text-lg sm:text-[22px]`}>{value}</p>
      <p className={`mt-1 flex items-start gap-1.5 text-[11px] leading-snug sm:text-xs ${tone === "bad" ? "text-[#ffb4ab]" : "text-white/65"}`}>
        {tone && <span className={`mt-1 size-1.5 shrink-0 rounded-full ${tone === "bad" ? "bg-[#ff9b8f]" : "bg-[#7fdca5]"}`} />}
        {note}
      </p>
    </div>
  );
}

function Ring({ counts }: { counts: Analysis["counts"] }) {
  const total = counts.red + counts.amber + counts.green + counts.grey;
  const length = 2 * Math.PI * 38;
  let offset = 0;
  const parts = RING.filter((part) => counts[part.key] > 0);
  const gap = parts.length > 1 ? 3 : 0;
  return (
    <div className="flex items-center gap-3.5">
      <div className="relative size-[84px] shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="11" />
          {total > 0 &&
            parts.map((part) => {
              const size = (length * counts[part.key]) / total;
              const arc = (
                <circle
                  key={part.key}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke={part.colour}
                  strokeWidth="11"
                  strokeDasharray={`${Math.max(size - gap, 1)} ${length}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += size;
              return arc;
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className={`${NUMBER} text-[22px]`}>{total}</p>
            <p className="mt-0.5 text-[10px] text-white/65">checked</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-[13px] font-semibold">Lease check</p>
        <ul className="mt-1.5 space-y-1 text-xs">
          {parts.map((part) => (
            <li key={part.key} className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: part.colour }} />
              <b className="w-5 font-semibold tabular-nums">{counts[part.key]}</b>
              <span className="text-white/70">{part.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Progress({ start, end, today }: { start: string; end: string; today: string }) {
  const total = Math.max(1, daysBetween(start, end));
  const at = (iso: string) => Math.min(100, Math.max(0, (daysBetween(start, iso) / total) * 100));
  const partFour = addWholeMonths(start, 6);
  const now = at(today);
  const marks = [
    { left: 0, title: "Moved in", date: shortDate(start), align: "left" },
    { left: at(partFour), title: "Part 4 rights", date: shortDate(partFour), align: "center" },
    { left: 100, title: "Lease ends", date: shortDate(end), align: "right" },
  ];
  const untilPartFour = daysBetween(today, partFour);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="flex items-center gap-2 text-[13px] font-semibold">
          Tenancy progress
          <span className="flex items-center gap-1.5 text-[11px] font-normal text-white/55">
            <span className="h-1.5 w-4 rounded-full bg-[#9fd6d6]" />
            Time so far
          </span>
        </p>
        <p className="text-xs text-white/60">
          {untilPartFour > 0 ? (
            <>
              <b className="font-semibold tabular-nums text-white">{untilPartFour} days</b> until Part 4 rights
            </>
          ) : (
            "Part 4 rights apply"
          )}
        </p>
      </div>
      <div className="relative mx-1 mb-8 mt-7 h-1.5 rounded-full bg-white/10">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[#9fd6d6]" style={{ width: `${now}%` }} />
        {marks.map((mark) => (
          <div key={mark.title}>
            <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0b3940] bg-white/50" style={{ left: `${mark.left}%` }} />
            <div
              className={`absolute top-3.5 whitespace-nowrap text-[11px] leading-tight ${mark.align === "center" ? "-translate-x-1/2 text-center" : mark.align === "right" ? "-translate-x-full text-right" : ""}`}
              style={{ left: `${mark.left}%` }}
            >
              <p className="font-semibold text-white/85">{mark.title}</p>
              <p className="text-white/55">{mark.date}</p>
            </div>
          </div>
        ))}
        {now > 0 && now < 100 && (
          <>
            <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#9fd6d6] shadow" style={{ left: `${now}%` }} />
            <span className="absolute -top-6 -translate-x-1/2 rounded-full bg-white px-1.5 py-0.5 text-[10.5px] font-bold text-brand-dark" style={{ left: `${now}%` }}>
              Today
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function nextRent(lease: Analysis, events: TimelineEvent[]) {
  const event = upcomingEvents(events).find((e) => e.kind === "rent");
  if (event) return `Due ${shortDate(event.date)}, ${relativeDays(daysUntil(event.date))}`;
  const start = lease.tenancyStart?.slice(0, 10);
  if (start) return `Due on the ${ordinal(Number(start.slice(8, 10)))}`;
  return "Rent day not given";
}

export default function RentalOverview({ leases, events }: { leases: Analysis[]; events: TimelineEvent[] }) {
  const [index, setIndex] = useState(0);
  const today = todayIso();
  const lease = leases[Math.min(index, leases.length - 1)];
  if (!lease) return null;

  const start = lease.tenancyStart?.slice(0, 10) ?? null;
  const term = lease.termMonths;
  const end = start && term ? addMonths(start, term) : null;
  const rent = lease.monthlyRentCents != null ? lease.monthlyRentCents / 100 : null;
  const deposit = lease.depositCents != null ? lease.depositCents / 100 : null;

  let subtitle = "The lease doesn't say when the tenancy starts";
  if (start && today < start) subtitle = `Starts on ${fmtDate(start)}`;
  else if (start && end && today > end) subtitle = `Fixed term ended on ${fmtDate(end)}`;
  else if (start && term) subtitle = `Month ${Math.min(term, monthsBetween(start, today) + 1)} of a ${term}-month lease · started ${fmtDate(start)}`;
  else if (start) subtitle = `Started on ${fmtDate(start)}`;

  const monthsLeft = end ? Math.max(0, monthsBetween(today, end)) : 0;
  const overLimit = rent != null && deposit != null && deposit > rent;

  const arrow =
    "grid size-8 cursor-pointer place-items-center rounded-full border border-white/25 bg-white/10 text-white disabled:cursor-default disabled:border-white/10 disabled:bg-transparent disabled:text-white/30";

  return (
    <section
      data-tour="spotlight"
      className="relative flex flex-col overflow-hidden rounded-3xl bg-[radial-gradient(120%_140%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-5 text-white shadow-soft"
    >
      <span className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/[0.04]" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9fd6d6]">
            <House size={13} aria-hidden />
            Tenancy snapshot
          </p>
          <h2 className="mt-1.5 truncate font-display text-[22px] font-semibold leading-tight">{leaseTitle(lease)}</h2>
          <p className="mt-0.5 text-[13px] text-white/70">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {leases.length > 1 && (
            <div role="group" aria-label="Choose a lease" className="flex items-center gap-1.5 text-xs text-white/70">
              <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0} aria-label="Previous lease" className={arrow}>
                <ChevronLeft size={16} />
              </button>
              <span className="tabular-nums" aria-live="polite">
                {index + 1} of {leases.length}
              </span>
              <button type="button" onClick={() => setIndex(index + 1)} disabled={index >= leases.length - 1} aria-label="Next lease" className={arrow}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <Link
            href={`/lease/${lease.id}`}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-brand-dark transition hover:-translate-y-0.5 hover:bg-brand-soft"
          >
            Open report
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/10">
        <Stat Icon={Euro} label="Rent" value={rent != null ? euro(rent) : "Not found"} note={nextRent(lease, events)} />
        <Stat
          Icon={PiggyBank}
          label="Deposit"
          value={deposit != null ? euro(deposit) : "Not found"}
          note={deposit == null || rent == null ? "Limit is one month's rent" : overLimit ? "Over 1 month's rent" : "Within 1 month's rent"}
          tone={deposit == null || rent == null ? undefined : overLimit ? "bad" : "ok"}
        />
        <Stat
          Icon={CalendarRange}
          label="Lease ends"
          value={end ? shortDate(end) : "Not found"}
          note={end ? (today > end ? `${end.slice(0, 4)}, term over` : `${end.slice(0, 4)}, ${monthsLeft} month${monthsLeft === 1 ? "" : "s"} left`) : "Length not given"}
        />
      </div>

      <div className="relative mt-auto grid grid-cols-1 gap-4 pt-4 md:grid-cols-[auto_minmax(0,1fr)] md:gap-7">
        <Ring counts={lease.counts} />
        {start && end ? (
          <Progress start={start} end={end} today={today} />
        ) : (
          <p className="self-center text-sm text-white/65">Tenancy progress shows here when the lease gives a start date and length.</p>
        )}
      </div>
    </section>
  );
}
