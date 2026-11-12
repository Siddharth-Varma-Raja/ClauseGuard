import Link from "next/link";
import { AlarmClock, ArrowRight, BellRing, CalendarCheck, Plus } from "lucide-react";
import type { TimelineEvent } from "@/lib/notice-types";
import { countdown, toDate, weekday } from "@/lib/timeline";
import { SOURCE_LINK } from "./EventMenu";

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
    "relative overflow-hidden rounded-2xl bg-[radial-gradient(120%_140%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-5 text-white shadow-soft";

  if (!event) {
    return (
      <section className={shell}>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8fd3c8]">
          <CalendarCheck size={13} aria-hidden />
          All clear
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold">Nothing coming up</h2>
        <p className="mt-1 text-sm text-white/75">Add a date like an inspection or a rent payment to keep track of it here.</p>
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

  const source = event.source && event.source !== "user" ? SOURCE_LINK[event.source] : null;

  return (
    <section className={shell}>
      <span className="pointer-events-none absolute -bottom-20 -right-12 size-48 rounded-full bg-white/5" />
      <p className="relative flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#f5c451]">
        <AlarmClock size={13} aria-hidden />
        Next up · {countdown(event.date, today)}
      </p>
      <div className="relative mt-2.5 flex items-start gap-3.5">
        <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-white/10 py-1.5 text-center ring-1 ring-white/15">
          <p className="text-[10px] font-bold uppercase text-white/70">{weekday(event.date)}</p>
          <p className="font-display text-2xl font-semibold leading-none">{toDate(event.date).getDate()}</p>
          <p className="text-[10px] font-bold uppercase text-white/70">
            {toDate(event.date).toLocaleDateString("en-IE", { month: "short" })}
          </p>
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-[19px] font-semibold leading-snug">{event.title}</h2>
          {event.note && <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/75">{event.note}</p>}
        </div>
      </div>
      <div className="relative mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onRemind(event)}
          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-semibold text-brand-dark transition hover:bg-brand-soft"
        >
          <BellRing size={15} aria-hidden />
          Remind me
        </button>
        {source && (
          <Link
            href={source.href}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/25 text-[13px] font-semibold transition hover:bg-white/10"
          >
            {source.label}
            <ArrowRight size={15} aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
