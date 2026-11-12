import { CalendarPlus, CircleCheck, Plus, Undo2 } from "lucide-react";
import type { TimelineEvent } from "@/lib/notice-types";
import { KIND_STYLE, countdown, toDate } from "@/lib/timeline";
import { cn } from "@/lib/cn";
import EventMenu, { type EventActions } from "./EventMenu";

export default function DayPanel({
  date,
  events,
  today,
  actions,
  onAddForDate,
}: {
  date: string;
  events: TimelineEvent[];
  today: string;
  actions: EventActions;
  onAddForDate: (date: string) => void;
}) {
  const day = toDate(date);
  const shortDate = day.toLocaleDateString("en-IE", { day: "numeric", month: "short" });

  return (
    <section className="flex flex-col rounded-2xl border border-[#d5e3e4] bg-white shadow-soft">
      <div className="rounded-t-2xl bg-[#f2f7f7] px-4 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-mute">{date === today ? "Today" : "Selected day"}</p>
        <p className="font-display text-xl font-semibold text-brand-dark">
          {day.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>
      <div className="space-y-2.5 p-4">
        {events.length === 0 && <p className="py-2 text-center text-sm text-mute">Nothing on this day.</p>}
        {events.map((event) => {
          const kind = KIND_STYLE[event.kind];
          return (
            <div key={event.id} className={cn("rounded-xl border p-3", event.kind === "deadline" ? "border-warn-line bg-warn-bg/50" : "border-line bg-white")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-px text-[11px] font-bold", kind.pill)}>{kind.label}</span>
                  <span className="text-xs font-semibold text-mute">{event.done ? "Done" : countdown(event.date, today)}</span>
                </div>
                <EventMenu event={event} actions={actions} />
              </div>
              <p className={cn("mt-1 font-semibold", event.done && "text-mute line-through")}>{event.title}</p>
              {event.note && <p className="text-[13px] text-mute">{event.note}</p>}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {!event.done && event.date >= today && (
                  <button
                    type="button"
                    onClick={() => actions.onExport(event)}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-2.5 text-xs font-semibold text-white"
                  >
                    <CalendarPlus size={14} aria-hidden />
                    Add to calendar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => actions.onToggleDone(event)}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-xs font-semibold text-mute hover:text-ink"
                >
                  {event.done ? <Undo2 size={14} aria-hidden /> : <CircleCheck size={14} aria-hidden />}
                  {event.done ? "Not done" : "Done"}
                </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => onAddForDate(date)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand/40 py-2 text-sm font-semibold text-brand hover:bg-brand-soft/50"
        >
          <Plus size={15} aria-hidden />
          Add a date on {shortDate}
        </button>
      </div>
    </section>
  );
}
