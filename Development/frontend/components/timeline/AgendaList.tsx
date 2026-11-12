"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarClock, CalendarDays, History, Loader2, Plus, Sparkles, X } from "lucide-react";
import type { EventKind, TimelineEvent } from "@/lib/notice-types";
import { fmtDate } from "@/lib/format";
import { KIND_STYLE, KINDS, collapseRepeats, groupAgenda, isUpcoming, toDate, type Suggestion } from "@/lib/timeline";
import { cn } from "@/lib/cn";
import EventRow from "./EventRow";
import type { EventActions } from "./EventMenu";
import Pager from "./Pager";

const HEADING_HEIGHT = 28;
const ROW_HEIGHT = 66;
const SUGGESTION_HEIGHT = 70;
const FOOTER_SPACE = 72;
const SMALLEST_BUDGET = 3 * ROW_HEIGHT + HEADING_HEIGHT;
const PAST_GROUP = "Past and done";
const LEASE_GROUP = "Found in your lease · not added yet";

type Entry =
  | { kind: "event"; key: string; group: string; date: string; height: number; event: TimelineEvent; moreDates: number }
  | { kind: "suggestion"; key: string; group: string; date: string; height: number; suggestion: Suggestion };

export type Focus = { date: string; id: number } | null;

function paginate(entries: Entry[], budget: number) {
  const pages: Entry[][] = [];
  let current: Entry[] = [];
  let used = 0;
  let lastGroup = "";
  for (const entry of entries) {
    let needed = entry.height + (entry.group === lastGroup ? 0 : HEADING_HEIGHT);
    if (current.length > 0 && used + needed > budget) {
      pages.push(current);
      current = [];
      used = 0;
      needed = entry.height + HEADING_HEIGHT;
    }
    current.push(entry);
    used += needed;
    lastGroup = entry.group;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

function dayLabel(date: string, style: "long" | "short" = "long") {
  return toDate(date).toLocaleDateString(
    "en-IE",
    style === "long" ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" },
  );
}

function GroupHeading({ label }: { label: string }) {
  return <div className="bg-[#f2f7f7] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-mute">{label}</div>;
}

export default function AgendaList({
  events,
  today,
  suggestions,
  day,
  focus,
  showPast,
  calendarOpen,
  actions,
  onShowPastChange,
  onClearDay,
  onToggleCalendar,
  onAddSuggestion,
  onAdd,
}: {
  events: TimelineEvent[];
  today: string;
  suggestions: Suggestion[];
  day: string | null;
  focus: Focus;
  showPast: boolean;
  calendarOpen: boolean;
  actions: EventActions;
  onShowPastChange: (show: boolean) => void;
  onClearDay: () => void;
  onToggleCalendar: () => void;
  onAddSuggestion: (suggestion: Suggestion) => Promise<void>;
  onAdd: (date?: string) => void;
}) {
  const [filter, setFilter] = useState<EventKind | "all">("all");
  const [adding, setAdding] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [budget, setBudget] = useState(SMALLEST_BUDGET);
  const [handledFocus, setHandledFocus] = useState<number | null>(null);
  const [shownDay, setShownDay] = useState<string | null>(day);
  const [jumpToPast, setJumpToPast] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    const measure = () => {
      if (wide.matches) setBudget(Math.max(ROW_HEIGHT + HEADING_HEIGHT, body.clientHeight));
      else setBudget(Math.max(SMALLEST_BUDGET, window.innerHeight - body.getBoundingClientRect().top - window.scrollY - FOOTER_SPACE));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    wide.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, []);

  if (day !== shownDay) {
    setShownDay(day);
    setPage(0);
  }

  const matches = (kind: EventKind) => filter === "all" || kind === filter;
  const upcoming = events.filter((e) => isUpcoming(e, today));
  const past = events.filter((e) => !isUpcoming(e, today)).sort((a, b) => b.date.localeCompare(a.date));
  const dayEvents = day ? events.filter((e) => e.date === day) : [];
  const counted = day ? dayEvents : upcoming;

  const suggestionEntries = suggestions
    .filter((s) => matches(s.kind) && (!day || s.date === day))
    .map(
      (suggestion): Entry => ({
        kind: "suggestion",
        key: `suggestion-${suggestion.title}`,
        group: LEASE_GROUP,
        date: suggestion.date,
        height: SUGGESTION_HEIGHT,
        suggestion,
      }),
    );

  const entries: Entry[] = day
    ? [
        ...dayEvents
          .filter((e) => matches(e.kind))
          .map((event): Entry => ({ kind: "event", key: event.id, group: dayLabel(day), date: event.date, height: ROW_HEIGHT, event, moreDates: 0 })),
        ...suggestionEntries,
      ]
    : [
        ...groupAgenda(collapseRepeats(upcoming.filter((e) => matches(e.kind))), today).flatMap((group) =>
          group.items.map(
            ({ event, moreDates }): Entry => ({ kind: "event", key: event.id, group: group.label, date: event.date, height: ROW_HEIGHT, event, moreDates }),
          ),
        ),
        ...suggestionEntries,
        ...(showPast
          ? past
              .filter((e) => matches(e.kind))
              .map((event): Entry => ({ kind: "event", key: event.id, group: PAST_GROUP, date: event.date, height: ROW_HEIGHT, event, moreDates: 0 }))
          : []),
      ];

  const pages = paginate(entries, budget);
  const findPage = (test: (entry: Entry) => boolean) => Math.max(0, pages.findIndex((p) => p.some(test)));

  if (focus && focus.id !== handledFocus) {
    setHandledFocus(focus.id);
    setPage(findPage((e) => e.date === focus.date));
  }
  if (jumpToPast && showPast) {
    setJumpToPast(false);
    setPage(findPage((e) => e.group === PAST_GROUP));
  }

  const currentPage = Math.min(page, Math.max(0, pages.length - 1));
  const visible = pages[currentPage] ?? [];
  const highlight = focus && focus.id === handledFocus ? focus.date : null;

  function chooseFilter(next: EventKind | "all") {
    setFilter(next);
    setPage(0);
  }

  function togglePast() {
    if (!showPast) setJumpToPast(true);
    else setPage(0);
    onShowPastChange(!showPast);
  }

  async function addSuggestion(suggestion: Suggestion) {
    setAdding(suggestion.title);
    try {
      await onAddSuggestion(suggestion);
    } finally {
      setAdding(null);
    }
  }

  const kindWord = filter === "all" ? "" : KIND_STYLE[filter].plural.toLowerCase();
  const emptyTitle = day
    ? `${filter === "all" ? "Nothing" : `No ${kindWord}`} on ${dayLabel(day, "short")}`
    : filter === "all"
      ? "Nothing coming up"
      : `No upcoming ${kindWord}`;

  return (
    <section
      data-tour="event-list"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#d5e3e4] bg-white shadow-soft"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleCalendar}
            aria-expanded={calendarOpen}
            aria-label={calendarOpen ? "Hide calendar" : "Show calendar"}
            className={cn(
              "grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border lg:hidden",
              calendarOpen ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white text-mute",
            )}
          >
            <CalendarDays size={16} />
          </button>
          {day ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-brand-dark py-1 pl-3 pr-1 text-[13px] font-semibold text-white">
              <span className="truncate">{dayLabel(day, "short")}</span>
              <button
                type="button"
                onClick={onClearDay}
                aria-label="Show all dates"
                className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full bg-white/15 hover:bg-white/30"
              >
                <X size={13} />
              </button>
            </span>
          ) : (
            <h2 className="text-sm font-semibold text-brand-dark">Upcoming dates</h2>
          )}
        </div>
        <div role="group" aria-label="Filter dates" className="flex gap-1 text-[12.5px] font-semibold">
          {(["all", ...KINDS] as const).map((k) => {
            const count = k === "all" ? counted.length : counted.filter((e) => e.kind === k).length;
            return (
              <button
                key={k}
                type="button"
                onClick={() => chooseFilter(k)}
                aria-pressed={filter === k}
                className={cn(
                  "cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-1 transition-colors",
                  filter === k ? "border-brand-dark bg-brand-dark text-white" : "border-line bg-white text-mute hover:border-brand/40 hover:text-ink",
                )}
              >
                {k === "all" ? "All" : KIND_STYLE[k].plural} {count}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={bodyRef} className="min-h-0 flex-1 overflow-hidden">
        {visible.length === 0 ? (
          <div className="grid h-full min-h-56 place-items-center px-6 py-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                <CalendarClock size={22} aria-hidden />
              </span>
              <p className="mt-3 font-semibold text-brand-dark">{emptyTitle}</p>
              <p className="mt-1 text-sm text-mute">
                {day ? "Add something for this day, or go back to all your dates." : "Add a date like an inspection, a rent payment or a notice deadline."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onAdd(day ?? undefined)}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white"
                >
                  <Plus size={16} aria-hidden />
                  {day ? `Add to ${dayLabel(day, "short")}` : "Add date"}
                </button>
                {day && (
                  <button
                    type="button"
                    onClick={onClearDay}
                    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-sm font-semibold text-brand-dark hover:bg-surface"
                  >
                    <ArrowLeft size={16} aria-hidden />
                    All dates
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ul>
            {visible.map((entry, i) => (
              <li key={entry.key} className={cn(i > 0 && visible[i - 1].group === entry.group && "border-t border-line")}>
                {(i === 0 || visible[i - 1].group !== entry.group) && <GroupHeading label={entry.group} />}
                {entry.kind === "event" ? (
                  <EventRow event={entry.event} today={today} moreDates={entry.moreDates} highlighted={entry.date === highlight} actions={actions} />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 sm:gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-dashed border-brand/40 bg-brand-soft/50 text-brand">
                      <Sparkles size={16} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-brand-dark">{entry.suggestion.title}</p>
                      <p className="line-clamp-2 text-[12.5px] text-mute">
                        {fmtDate(entry.suggestion.date)} · {entry.suggestion.note}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addSuggestion(entry.suggestion)}
                      disabled={adding !== null}
                      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-brand/30 bg-white px-3 text-[13px] font-semibold text-brand hover:bg-brand-soft disabled:opacity-60"
                    >
                      {adding === entry.suggestion.title ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Plus size={14} aria-hidden />}
                      Add
                    </button>
                  </div>
                )}
              </li>
            ))}
            {day && currentPage === pages.length - 1 && (
              <li className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onAdd(day)}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand/40 py-2 text-sm font-semibold text-brand hover:bg-brand-soft/50"
                >
                  <Plus size={15} aria-hidden />
                  Add more to {dayLabel(day, "short")}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-[#f2f7f7] px-3 py-2 text-[13px] font-semibold sm:px-4">
        {day ? (
          <button type="button" onClick={onClearDay} className="inline-flex cursor-pointer items-center gap-1.5 text-brand hover:underline">
            <ArrowLeft size={15} aria-hidden />
            All dates
          </button>
        ) : (
          <button
            type="button"
            onClick={togglePast}
            disabled={past.length === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 text-brand hover:underline disabled:cursor-default disabled:text-mute disabled:no-underline"
          >
            <History size={15} aria-hidden />
            {past.length === 0 ? "No past dates" : showPast ? "Hide past" : `Show ${past.length} past`}
          </button>
        )}
        <Pager page={currentPage} pages={pages.length} label="Pages of dates" onChange={setPage} />
      </div>
    </section>
  );
}
