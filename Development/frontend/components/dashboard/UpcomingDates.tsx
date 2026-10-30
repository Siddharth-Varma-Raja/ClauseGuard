import Link from "next/link";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import { upcomingEvents } from "@/lib/dashboard";
import { daysUntil, fmtDate, relativeDays } from "@/lib/format";
import type { TimelineEvent } from "@/lib/notice-types";
import { cn } from "@/lib/cn";

export default function UpcomingDates({ events }: { events: TimelineEvent[] }) {
  const next = upcomingEvents(events).slice(0, 4);

  return (
    <section data-tour="upcoming-dates" className="flex flex-col rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-brand-dark">Upcoming dates</h2>
        <CalendarDays size={20} className="text-brand"  />
      </div>

      {next.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <p className="font-semibold text-ink">No dates coming up</p>
          <p className="mt-1 max-w-60 text-sm text-mute">Add event or a notice period and we'll remind you before it's due.</p>
        </div>
      ) : (
        <ol className="relative mt-4 flex-1 before:absolute before:bottom-4 before:left-[7px] before:top-3 before:w-0.5 before:bg-line">
          {next.map((event, index) => {
            const days = daysUntil(event.date);
            return (
              <li key={event.id} className="relative flex gap-3.5 py-2.5">
                <span
                  className={cn(
                    "relative mt-1 size-4 shrink-0 rounded-full border-[3px] border-white ring-1 ring-line",
                    index === 0 && days <= 7 ? "bg-warn-solid" : "bg-brand",
                  )}
                  
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{event.title}</p>
                  <p className="text-sm text-mute">{fmtDate(event.date)}</p>
                </div>
                <span
                  className={cn(
                    "h-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    days <= 7 ? "bg-warn-bg text-warn" : "bg-surface text-mute",
                    days <= 2 && "animate-soft-pulse",
                  )}
                >
                  {relativeDays(days)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3.5 text-sm font-semibold text-brand">
        <Link href="/timeline" className="inline-flex items-center gap-1 hover:underline">
          <Plus size={15}  />
          Add a date
        </Link>
        <Link href="/timeline" className="inline-flex items-center gap-1 hover:underline">
          Open timeline
          <ArrowRight size={15}  />
        </Link>
      </div>
    </section>
  );
}
