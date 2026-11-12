"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CalendarClock, History, Loader2, Plus, Sparkles } from "lucide-react";
import type { EventKind, TimelineEvent } from "@/lib/notice-types";
import { fmtDate } from "@/lib/format";
import { KIND_STYLE, KINDS, collapseRepeats, groupAgenda, isUpcoming, type Suggestion } from "@/lib/timeline";
import { cn } from "@/lib/cn";
import EventRow from "./EventRow";
import type { EventActions } from "./EventMenu";
import ViewToggle, { type TimelineView } from "./ViewToggle";

function GroupHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-[#f2f7f7] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-mute">
      <span>{label}</span>
      <span>{count}</span>
    </div>
  );
}

export default function AgendaList({
  events,
  today,
  suggestions,
  showPast,
  jumpDate,
  actions,
  onShowPastChange,
  onViewChange,
  onAddSuggestion,
  onExportUpcoming,
  onAdd,
}: {
  events: TimelineEvent[];
  today: string;
  suggestions: Suggestion[];
  showPast: boolean;
  jumpDate: string | null;
  actions: EventActions;
  onShowPastChange: (show: boolean) => void;
  onViewChange: (view: TimelineView) => void;
  onAddSuggestion: (suggestion: Suggestion) => Promise<void>;
  onExportUpcoming: () => void;
  onAdd: () => void;
}) {
  const [filter, setFilter] = useState<EventKind | "all">("all");
  const [adding, setAdding] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const upcoming = events.filter((e) => isUpcoming(e, today));
  const past = events.filter((e) => !isUpcoming(e, today)).sort((a, b) => b.date.localeCompare(a.date));
  const matches = (e: TimelineEvent) => filter === "all" || e.kind === filter;
  const groups = groupAgenda(collapseRepeats(upcoming.filter(matches)), today);
  const pastShown = past.filter(matches);
  const suggestionsShown = suggestions.filter((s) => filter === "all" || s.kind === filter);

  useEffect(() => {
    if (!jumpDate || !scrollRef.current) return;
    const rows = Array.from(scrollRef.current.querySelectorAll<HTMLElement>("li[data-date]"));
    const target = rows.find((row) => (row.dataset.date ?? "") >= jumpDate) ?? rows[rows.length - 1];
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [jumpDate, showPast]);

  async function addSuggestion(suggestion: Suggestion) {
    setAdding(suggestion.title);
    try {
      await onAddSuggestion(suggestion);
    } finally {
      setAdding(null);
    }
  }

  const isEmpty = groups.length === 0 && suggestionsShown.length === 0 && (!showPast || pastShown.length === 0);

  return (
    <section
      data-tour="event-list"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#d5e3e4] bg-white shadow-soft"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <ViewToggle view="agenda" onChange={onViewChange} />
        <div role="group" aria-label="Filter dates" className="flex flex-wrap gap-1 text-[12.5px] font-semibold">
          {(["all", ...KINDS] as const).map((k) => {
            const count = k === "all" ? upcoming.length : upcoming.filter((e) => e.kind === k).length;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                aria-pressed={filter === k}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-1 transition-colors",
                  filter === k ? "border-brand-dark bg-brand-dark text-white" : "border-line bg-white text-mute hover:border-brand/40 hover:text-ink",
                )}
              >
                {k === "all" ? "All" : KIND_STYLE[k].plural} {count}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="grid h-full min-h-60 place-items-center px-6 py-10 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                <CalendarClock size={22} aria-hidden />
              </span>
              <p className="mt-3 font-semibold text-brand-dark">{filter === "all" ? "Nothing coming up" : `No upcoming ${KIND_STYLE[filter].plural.toLowerCase()}`}</p>
              <p className="mt-1 text-sm text-mute">Add a date like an inspection, a rent payment or a notice deadline.</p>
              <button
                type="button"
                onClick={onAdd}
                className="mt-4 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white"
              >
                <Plus size={16} aria-hidden />
                Add date
              </button>
            </div>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.label}>
                <GroupHeading label={group.label} count={group.items.length} />
                <ul className="divide-y divide-line">
                  {group.items.map(({ event, moreDates }) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      today={today}
                      moreDates={moreDates}
                      highlighted={event.date === jumpDate}
                      actions={actions}
                    />
                  ))}
                </ul>
              </div>
            ))}

            {suggestionsShown.length > 0 && (
              <div>
                <GroupHeading label="Found in your lease · not added yet" count={suggestionsShown.length} />
                <ul className="divide-y divide-line">
                  {suggestionsShown.map((s) => (
                    <li key={s.title} className="flex items-center gap-3 px-4 py-2.5 sm:gap-3.5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-dashed border-brand/40 bg-brand-soft/50 text-brand">
                        <Sparkles size={16} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-brand-dark">{s.title}</p>
                        <p className="text-[12.5px] text-mute">
                          {fmtDate(s.date)} · {s.note}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addSuggestion(s)}
                        disabled={adding !== null}
                        className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-brand/30 bg-white px-3 text-[13px] font-semibold text-brand hover:bg-brand-soft disabled:opacity-60"
                      >
                        {adding === s.title ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Plus size={14} aria-hidden />}
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showPast && pastShown.length > 0 && (
              <div>
                <GroupHeading label="Past and done" count={pastShown.length} />
                <ul className="divide-y divide-line">
                  {pastShown.map((event) => (
                    <EventRow key={event.id} event={event} today={today} highlighted={event.date === jumpDate} actions={actions} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line bg-[#f2f7f7] px-4 py-2.5 text-[13px] font-semibold">
        <button
          type="button"
          onClick={() => onShowPastChange(!showPast)}
          disabled={past.length === 0}
          className="inline-flex cursor-pointer items-center gap-1.5 text-brand hover:underline disabled:cursor-default disabled:text-mute disabled:no-underline"
        >
          <History size={15} aria-hidden />
          {past.length === 0 ? "No past dates" : showPast ? "Hide past dates" : `Show ${past.length} past date${past.length > 1 ? "s" : ""}`}
        </button>
        {upcoming.length > 0 && (
          <p className="inline-flex items-center gap-1.5 text-mute">
            <Bell size={15} aria-hidden />
            <span className="hidden font-normal md:inline">We don&apos;t send reminders.</span>
            <button type="button" onClick={onExportUpcoming} className="cursor-pointer text-brand hover:underline">
              Add {upcoming.length} upcoming date{upcoming.length > 1 ? "s" : ""} to my calendar
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
