import type { TimelineEvent } from "@/lib/notice-types";
import { KIND_STYLE, KINDS, eventsByDate, monthCells, monthStart, toDate } from "@/lib/timeline";
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

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#d5e3e4] bg-white shadow-soft">
      <div className="flex items-center justify-between bg-[#f2f7f7] px-3 py-2">
        <MonthNav
          month={month}
          today={today}
          todaySelected={selected === today}
          onChange={onMonthChange}
          onToday={() => {
            onMonthChange(monthStart(today));
            if (selected !== today) onSelect(today);
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pt-2">
        <div className="grid grid-cols-7 text-center text-[10.5px] font-bold uppercase text-mute" aria-hidden>
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-0.5">
          {monthCells(month).map(({ date, inMonth: current }) => {
            const dayEvents = byDate.get(date) ?? [];
            const kinds = KINDS.filter((k) => dayEvents.some((e) => e.kind === k));
            const isToday = date === today;
            const isSelected = date === selected;
            const label = toDate(date).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelect(date)}
                aria-label={`${label}${isToday ? ", today" : ""}${dayEvents.length ? `, ${dayEvents.length} date${dayEvents.length > 1 ? "s" : ""}` : ""}`}
                aria-pressed={isSelected}
                className={cn(
                  "relative grid min-h-6 max-h-9 cursor-pointer place-items-center rounded-lg text-[12.5px]",
                  isSelected
                    ? "bg-brand-dark font-bold text-white"
                    : cn("hover:bg-surface", isToday ? "font-bold text-brand ring-1 ring-brand" : current ? "text-ink" : "text-neu-solid/60"),
                )}
              >
                {toDate(date).getDate()}
                {kinds.length > 0 && (
                  <span className="absolute bottom-[2px] flex gap-0.5">
                    {kinds.map((k) => (
                      <span key={k} className={cn("size-1 rounded-full", isSelected ? "bg-white" : KIND_STYLE[k].dot)} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-3 mt-2.5 grid shrink-0 grid-cols-3 gap-2 text-center [@media(max-height:760px)]:hidden">
        {KINDS.map((k) => {
          const count = inMonth.filter((e) => e.kind === k).length;
          return (
            <div key={k} className={cn("rounded-xl py-1.5", KIND_STYLE[k].soft)}>
              <p className="font-display text-base font-semibold leading-none">{count}</p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold">
                <span className={cn("size-1.5 rounded-full", KIND_STYLE[k].dot)} />
                {count === 1 ? KIND_STYLE[k].label.toLowerCase() : KIND_STYLE[k].plural.toLowerCase()}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mb-2.5 mt-2 shrink-0 px-3 text-center text-[11px] text-mute">
        {selected ? "Pick the day again to see all dates" : "Pick a day to see only its dates"}
      </p>
    </section>
  );
}
