import type { TimelineEvent } from "@/lib/notice-types";
import { KIND_STYLE, KINDS, eventsByDate, monthCells, toDate } from "@/lib/timeline";
import { cn } from "@/lib/cn";
import MonthNav from "./MonthNav";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function MiniCalendar({
  events,
  today,
  month,
  selected,
  onMonthChange,
  onSelect,
}: {
  events: TimelineEvent[];
  today: string;
  month: string;
  selected: string | null;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
}) {
  const byDate = eventsByDate(events);
  const inMonth = events.filter((e) => e.date.slice(0, 7) === month.slice(0, 7));
  const nextDeadline = events
    .filter((e) => e.kind === "deadline" && !e.done && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]?.date;

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-[#d5e3e4] bg-white shadow-soft">
      <div className="flex items-center justify-between bg-[#f2f7f7] px-3 py-2">
        <MonthNav month={month} today={today} onChange={onMonthChange} />
      </div>

      <div className="px-3 pt-2">
        <div className="grid grid-cols-7 text-center text-[10.5px] font-bold uppercase text-mute" aria-hidden>
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-0.5">
          {monthCells(month).map(({ date, inMonth: current }) => {
            const dayEvents = byDate.get(date) ?? [];
            const kinds = KINDS.filter((k) => dayEvents.some((e) => e.kind === k));
            const isToday = date === today;
            const label = toDate(date).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelect(date)}
                aria-label={dayEvents.length ? `${label}, ${dayEvents.length} date${dayEvents.length > 1 ? "s" : ""}` : label}
                aria-pressed={selected === date}
                className={cn(
                  "relative grid h-[30px] cursor-pointer place-items-center rounded-lg text-[12.5px] transition-colors",
                  !current && "text-neu-solid/60",
                  current && !isToday && "text-ink hover:bg-surface",
                  date === nextDeadline && !isToday && "bg-warn-bg font-semibold text-warn ring-1 ring-warn-line",
                  isToday && "bg-brand font-bold text-white",
                  selected === date && !isToday && "ring-2 ring-brand/50",
                )}
              >
                {toDate(date).getDate()}
                {kinds.length > 0 && (
                  <span className="absolute bottom-[3px] flex gap-0.5">
                    {kinds.map((k) => (
                      <span key={k} className={cn("size-1 rounded-full", isToday ? "bg-white" : KIND_STYLE[k].dot)} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-3 mt-3 grid grid-cols-3 gap-2 text-center">
        {KINDS.map((k) => {
          const count = inMonth.filter((e) => e.kind === k).length;
          return (
            <div key={k} className={cn("rounded-xl py-2", KIND_STYLE[k].soft)}>
              <p className="font-display text-lg font-semibold leading-none">{count}</p>
              <p className="mt-1 text-[11px] font-semibold">{count === 1 ? KIND_STYLE[k].label.toLowerCase() : KIND_STYLE[k].plural.toLowerCase()}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-mute">In {toDate(month).toLocaleDateString("en-IE", { month: "long" })}</p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[11.5px] text-mute">
        <div className="flex gap-3">
          {KINDS.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", KIND_STYLE[k].dot)} />
              {KIND_STYLE[k].label}
            </span>
          ))}
        </div>
        <span className="hidden sm:inline">Pick a day to jump to it</span>
      </div>
    </section>
  );
}
