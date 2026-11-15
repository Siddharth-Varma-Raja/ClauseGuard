import { AlarmClock, BellRing, CalendarCheck, Plus } from "lucide-react";
import type { TimelineEvent } from "@/lib/notice-types";
import { countdown, toDate, weekday } from "@/lib/timeline";

export default function NextUp({
  event,
  today,
  onRemind,
  onAdd,
}: {
  event: TimelineEvent | null;
  today: string;
  onRemind: (event: TimelineEvent) => void;
  onAdd: () => void;
}) {
  const shell =
    "relative overflow-hidden rounded-2xl bg-[radial-gradient(120%_140%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-4 text-white shadow-soft sm:p-5";

  if (!event) {
    return (
      <section className={shell}>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8fd3c8]">
          <CalendarCheck size={13} aria-hidden />
          All clear
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold">Nothing coming up</h2>
        <p className="mt-1 hidden text-sm text-white/75 sm:block">Add a date like an inspection or a rent payment to keep track of it here.</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-brand-dark transition hover:bg-brand-soft"
        >
          <Plus size={15} aria-hidden />
          Add date
        </button>
      </section>
    );
  }

  return (
    <section className={shell}>
      <span className="pointer-events-none absolute -bottom-20 -right-12 size-48 rounded-full bg-white/5" />
      <div className="relative flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#f5c451]">
          <AlarmClock size={13} aria-hidden />
          Next up · {countdown(event.date, today)}
        </p>
        <button
          type="button"
          onClick={() => onRemind(event)}
          className="hidden h-8 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-semibold text-brand-dark transition hover:bg-brand-soft sm:inline-flex"
        >
          <BellRing size={14} aria-hidden />
          Remind me
        </button>
      </div>
      <div className="relative mt-2.5 flex items-center gap-3.5 sm:items-start">
        <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-white/10 py-1.5 text-center ring-1 ring-white/15">
          <p className="text-[10px] font-bold uppercase text-white/70">{weekday(event.date)}</p>
          <p className="font-display text-2xl font-semibold leading-none">{toDate(event.date).getDate()}</p>
          <p className="text-[10px] font-bold uppercase text-white/70">
            {toDate(event.date).toLocaleDateString("en-IE", { month: "short" })}
          </p>
        </div>
        <div className="min-w-0">
          <h2 className="line-clamp-2 font-display text-[17px] font-semibold leading-snug sm:text-[19px]">{event.title}</h2>
          {event.note && <p className="mt-1 line-clamp-1 text-[13px] leading-snug text-white/75 sm:line-clamp-2">{event.note}</p>}
        </div>
        <button
          type="button"
          onClick={() => onRemind(event)}
          aria-label={`Remind me about "${event.title}"`}
          className="ml-auto grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-brand-dark sm:hidden"
        >
          <BellRing size={17} />
        </button>
      </div>
    </section>
  );
}
