"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Check, Undo2, Trash2 } from "lucide-react";
import type { TimelineEvent, EventKind } from "@/lib/notice-types";
import Card from "../ui/Card";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";

type CalendarViewProps = {
  events: TimelineEvent[];
  today: string;
  onToggleDone: (event: TimelineEvent) => void;
  onDelete: (event: TimelineEvent) => void;
  onAddForDate: (dateIso: string) => void;
};

const KIND_DOT: Record<EventKind, string> = {
  deadline: "bg-red-500",
  rent: "bg-emerald-500",
  event: "bg-brand",
};

const KIND_LABEL: Record<EventKind, { label: string; pill: string }> = {
  deadline: { label: "Deadline", pill: "border-warn-line bg-warn-bg text-warn" },
  rent: { label: "Rent", pill: "border-ok-line bg-ok-bg text-ok" },
  event: { label: "Event", pill: "border-brand/20 bg-brand-soft text-brand-dark" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toIso(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default function CalendarView({
  events,
  today,
  onToggleDone,
  onDelete,
  onAddForDate,
}: CalendarViewProps) {
  const [displayedDate, setDisplayedDate] = useState(() => {
    const [y, m] = today.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const year = displayedDate.getFullYear();
  const month = displayedDate.getMonth();

  const monthName = displayedDate.toLocaleDateString("en-IE", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    setDisplayedDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setDisplayedDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    const [ty, tm] = today.split("-").map(Number);
    setDisplayedDate(new Date(ty, tm - 1, 1));
    setSelectedDate(today);
  }

  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells: { dayNumber: number; iso: string; currentMonth: boolean }[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, d);
    calendarCells.push({
      dayNumber: d,
      iso: toIso(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), d),
      currentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      dayNumber: d,
      iso: toIso(year, month, d),
      currentMonth: true,
    });
  }

  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    calendarCells.push({
      dayNumber: d,
      iso: toIso(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), d),
      currentMonth: false,
    });
  }

  const eventsByDate = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const list = eventsByDate.get(event.date) ?? [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  return (
    <div className="mt-6 space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-brand-dark sm:text-2xl">
              {monthName}
            </h2>
            <button
              onClick={goToday}
              className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-brand-dark hover:bg-brand-soft"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="flex size-9 items-center justify-center rounded-lg border border-line text-brand-dark hover:bg-surface"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="flex size-9 items-center justify-center rounded-lg border border-line text-brand-dark hover:bg-surface"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center">
          {WEEKDAYS.map((wd) => (
            <span key={wd} className="py-1 text-xs font-semibold uppercase text-mute sm:text-sm">
              {wd}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell) => {
            const cellEvents = eventsByDate.get(cell.iso) ?? [];
            const isToday = cell.iso === today;
            const isSelected = cell.iso === selectedDate;
            const hasDeadlines = cellEvents.some((e) => e.kind === "deadline");
            const hasRent = cellEvents.some((e) => e.kind === "rent");
            const hasCustom = cellEvents.some((e) => e.kind === "event");

            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => setSelectedDate(cell.iso)}
                className={cn(
                  "relative flex min-h-[50px] sm:min-h-[64px] flex-col items-center justify-between rounded-xl border p-1 sm:p-2 transition focus-visible:outline-2 focus-visible:outline-brand",
                  cell.currentMonth ? "bg-white text-slate-800" : "bg-slate-50/60 text-slate-400 border-transparent",
                  isSelected && "border-brand ring-2 ring-brand/30 bg-brand-soft/20",
                  !isSelected && cell.currentMonth && "border-line hover:border-brand/40 hover:bg-surface",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 sm:size-7 place-items-center rounded-full text-xs sm:text-sm font-semibold",
                    isToday ? "bg-brand text-white shadow-sm" : isSelected ? "text-brand" : "",
                  )}
                >
                  {cell.dayNumber}
                </span>

                <div className="flex items-center justify-center gap-1">
                  {hasDeadlines && (
                    <span className="size-1.5 sm:size-2 rounded-full bg-red-500" title="Deadline" />
                  )}
                  {hasRent && (
                    <span className="size-1.5 sm:size-2 rounded-full bg-emerald-500" title="Rent" />
                  )}
                  {hasCustom && (
                    <span className="size-1.5 sm:size-2 rounded-full bg-teal-600" title="Event" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-line pt-4 text-xs text-mute">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-500" /> Statutory Deadline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> Rent Payment
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-teal-600" /> Tenancy Event
          </span>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-brand-dark">
              Events on {fmtDate(selectedDate)}
            </h3>
            <p className="text-xs sm:text-sm text-mute">
              {selectedEvents.length === 0
                ? "No items scheduled for this date."
                : `${selectedEvents.length} event(s) recorded.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAddForDate(selectedDate)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <Plus size={16} />
            Add for this date
          </button>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-mute">No events on {fmtDate(selectedDate)}.</p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {selectedEvents.map((event) => {
              const kind = KIND_LABEL[event.kind] ?? KIND_LABEL.event;
              return (
                <li
                  key={event.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn("rounded-full border px-2 py-0.5 text-xs font-bold", kind.pill)}
                      >
                        {kind.label}
                      </span>
                      {event.done && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          Done
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-1 font-semibold text-brand-dark",
                        event.done && "text-mute line-through",
                      )}
                    >
                      {event.title}
                    </p>
                    {event.note && <p className="text-xs sm:text-sm text-mute">{event.note}</p>}
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-center">
                    <button
                      onClick={() => onToggleDone(event)}
                      aria-label={event.done ? "Mark as not done" : "Mark as done"}
                      className="cursor-pointer rounded-lg p-2 text-mute hover:bg-surface hover:text-brand"
                    >
                      {event.done ? <Undo2 size={17} /> : <Check size={17} />}
                    </button>
                    <button
                      onClick={() => onDelete(event)}
                      aria-label={`Delete "${event.title}"`}
                      className="cursor-pointer rounded-lg p-2 text-mute hover:bg-bad-bg hover:text-bad"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
