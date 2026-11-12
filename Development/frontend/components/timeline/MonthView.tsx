import type { TimelineEvent } from "@/lib/notice-types";
import { KIND_STYLE, KINDS, eventsByDate, monthCells, toDate } from "@/lib/timeline";
import { cn } from "@/lib/cn";
import MonthNav from "./MonthNav";
import ViewToggle, { type TimelineView } from "./ViewToggle";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 2;

export default function MonthView({
  events,
  today,
  month,
  selected,
  onMonthChange,
  onSelect,
  onViewChange,
}: {
  events: TimelineEvent[];
  today: string;
  month: string;
  selected: string | null;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
  onViewChange: (view: TimelineView) => void;
}) {
  const byDate = eventsByDate(events);

  return (
    <section
      data-tour="event-list"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#d5e3e4] bg-white shadow-soft"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <ViewToggle view="month" onChange={onViewChange} />
        <MonthNav month={month} today={today} onChange={onMonthChange} />
        <div className="hidden gap-3 text-[11.5px] text-mute xl:flex">
          {KINDS.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", KIND_STYLE[k].dot)} />
              {KIND_STYLE[k].label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-line bg-[#f2f7f7] text-center text-[11px] font-bold uppercase text-mute" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1.5">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </span>
        ))}
      </div>

      <div className="grid min-h-[420px] flex-1 auto-rows-fr grid-cols-7 gap-px bg-line">
        {monthCells(month).map(({ date, inMonth }) => {
          const dayEvents = byDate.get(date) ?? [];
          const extra = dayEvents.length - MAX_CHIPS;
          const label = toDate(date).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-label={dayEvents.length ? `${label}: ${dayEvents.map((e) => e.title).join(", ")}` : label}
              aria-pressed={selected === date}
              className={cn(
                "flex min-w-0 cursor-pointer flex-col items-start overflow-hidden p-1 text-left transition-colors sm:p-1.5",
                inMonth ? "bg-white hover:bg-surface" : "bg-[#f2f7f7]",
                selected === date && "bg-brand-soft ring-2 ring-inset ring-brand/50 hover:bg-brand-soft",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold",
                  date === today ? "bg-brand text-white" : inMonth ? "text-ink" : "text-neu-solid/60",
                )}
              >
                {toDate(date).getDate()}
              </span>
              <span className="mt-0.5 flex w-full flex-wrap gap-0.5 sm:hidden">
                {dayEvents.map((e) => (
                  <span key={e.id} className={cn("size-1.5 rounded-full", KIND_STYLE[e.kind].dot)} />
                ))}
              </span>
              {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                <span
                  key={e.id}
                  className={cn(
                    "mt-1 hidden w-full items-center gap-1 truncate rounded-md border px-1.5 py-px text-[11.5px] font-semibold sm:flex",
                    KIND_STYLE[e.kind].pill,
                    e.done && "line-through opacity-60",
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", KIND_STYLE[e.kind].dot)} />
                  <span className="truncate">{e.title}</span>
                </span>
              ))}
              {extra > 0 && <span className="mt-0.5 hidden text-[11px] font-semibold text-mute sm:block">+{extra} more</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
