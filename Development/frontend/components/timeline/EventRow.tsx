import { BellPlus, CircleCheck, Repeat, Undo2 } from "lucide-react";
import type { TimelineEvent } from "@/lib/notice-types";
import { KIND_STYLE, countdown, daysBetween, toDate, weekday } from "@/lib/timeline";
import { cn } from "@/lib/cn";
import Tooltip from "../ui/Tooltip";
import EventMenu, { type EventActions } from "./EventMenu";

export default function EventRow({
  event,
  today,
  moreDates = 0,
  highlighted = false,
  actions,
}: {
  event: TimelineEvent;
  today: string;
  moreDates?: number;
  highlighted?: boolean;
  actions: EventActions;
}) {
  const kind = KIND_STYLE[event.kind] ?? KIND_STYLE.event;
  const days = daysBetween(today, event.date);
  const urgent = !event.done && event.kind === "deadline" && days >= 0 && days <= 14;
  const past = event.done || days < 0;

  return (
    <div
      data-date={event.date}
      className={cn("flex items-center gap-3 px-4 py-2.5 transition-colors sm:gap-3.5", highlighted && "bg-brand-soft/60")}
    >
      <div className="w-10 shrink-0 text-center">
        <p className="text-[10.5px] font-bold uppercase text-mute">{weekday(event.date)}</p>
        <p className={cn("font-display text-[22px] font-semibold leading-none", past ? "text-mute" : "text-brand-dark")}>
          {toDate(event.date).getDate()}
        </p>
      </div>
      <span className={cn("h-9 w-1 shrink-0 rounded-full", kind.dot, past && "opacity-40")} />

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] font-semibold", past ? "text-mute" : "text-ink", event.done && "line-through decoration-mute")}>
          {event.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-mute">
          <span className={cn("rounded-full border px-2 py-px text-[11px] font-bold", kind.pill)}>{kind.label}</span>
          <span className={cn("sm:hidden", urgent && "font-semibold text-warn")}>{event.done ? "Done" : countdown(event.date, today)}</span>
          {moreDates > 0 && (
            <span className="inline-flex items-center gap-1">
              <Repeat size={13} aria-hidden />
              <span className="sm:hidden">Repeats</span>
              <span className="hidden sm:inline">Repeats · {moreDates} more date{moreDates > 1 ? "s" : ""}</span>
            </span>
          )}
          {event.note && <span className="hidden truncate md:inline">{event.note}</span>}
        </div>
      </div>

      <span
        className={cn(
          "hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline",
          urgent ? "bg-warn-bg text-warn ring-1 ring-warn-line" : "bg-[#f2f7f7] text-mute",
        )}
      >
        {event.done ? "Done" : countdown(event.date, today)}
      </span>

      <div className="flex shrink-0 items-center">
        {!past && (
          <Tooltip text="Remind me">
            <button
              type="button"
              onClick={() => actions.onExport(event)}
              aria-label={`Remind me about "${event.title}"`}
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-mute hover:bg-surface hover:text-brand"
            >
              <BellPlus size={16} />
            </button>
          </Tooltip>
        )}
        <Tooltip text={event.done ? "Mark as not done" : "Mark as done"}>
          <button
            type="button"
            onClick={() => actions.onToggleDone(event)}
            aria-label={event.done ? `Mark "${event.title}" as not done` : `Mark "${event.title}" as done`}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-mute hover:bg-surface hover:text-brand"
          >
            {event.done ? <Undo2 size={16} /> : <CircleCheck size={16} />}
          </button>
        </Tooltip>
        <EventMenu event={event} actions={actions} />
      </div>
    </div>
  );
}
