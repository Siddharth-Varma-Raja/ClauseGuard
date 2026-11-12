import Link from "next/link";
import { Route } from "lucide-react";
import type { TimelineEvent } from "@/lib/notice-types";
import { euro, fmtDate } from "@/lib/format";
import { addMonths, countdown, daysBetween, isUpcoming, monthsBetween, type LeaseInfo } from "@/lib/timeline";
import { cn } from "@/lib/cn";

type Milestone = { label: string; date: string };

function Stat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: string }) {
  return (
    <div className="min-w-0 flex-1 px-3 first:pl-0 last:pr-0 sm:px-5 lg:flex-none">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand/70">{label}</p>
      <p className={cn("font-display text-lg font-semibold leading-tight sm:text-xl", tone ?? "text-brand-dark")}>{value}</p>
      <p className="text-xs text-mute sm:truncate">{detail}</p>
    </div>
  );
}

function ProgressBar({ lease, today }: { lease: LeaseInfo; today: string }) {
  const end = addMonths(lease.start, lease.termMonths);
  const total = Math.max(1, daysBetween(lease.start, end));
  const position = (date: string) => Math.min(100, Math.max(0, (daysBetween(lease.start, date) / total) * 100));
  const todayAt = position(today);
  const milestones: Milestone[] = [{ label: "Moved in", date: lease.start }];
  if (lease.termMonths > 6) milestones.push({ label: "Part 4 rights", date: addMonths(lease.start, 6) });
  milestones.push({ label: "Lease ends", date: end });

  return (
    <div className="relative mb-6 mt-7 h-1.5 min-w-0 flex-1 rounded-full bg-white">
      <div className="h-1.5 rounded-full bg-brand" style={{ width: `${todayAt}%` }} />
      {milestones.map((m, i) => {
        const at = position(m.date);
        const reached = m.date <= today;
        const align = i === 0 ? "text-left" : i === milestones.length - 1 ? "-translate-x-full text-right" : "-translate-x-1/2 text-center";
        return (
          <div key={m.label}>
            <span
              className={cn(
                "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
                reached ? "border-brand bg-brand" : "border-brand/50 bg-white",
              )}
              style={{ left: `${at}%` }}
            />
            <p className={cn("absolute top-4 whitespace-nowrap text-xs font-semibold text-brand-dark", align)} style={{ left: `${at}%` }}>
              {m.label} <span className="hidden font-normal text-mute xl:inline">· {fmtDate(m.date)}</span>
            </p>
          </div>
        );
      })}
      {todayAt > 0 && todayAt < 100 && (
        <>
          <span
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-brand shadow"
            style={{ left: `${todayAt}%` }}
          />
          <span
            className="absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2 py-px text-[11px] font-bold text-white"
            style={{ left: `${Math.min(92, Math.max(8, todayAt))}%` }}
          >
            Today
          </span>
        </>
      )}
    </div>
  );
}

export default function TenancyStrip({ lease, events, today }: { lease: LeaseInfo | null; events: TimelineEvent[]; today: string }) {
  const deadlines = events.filter((e) => e.kind === "deadline" && isUpcoming(e, today)).sort((a, b) => a.date.localeCompare(b.date));
  const nextRent = events.filter((e) => e.kind === "rent" && isUpcoming(e, today)).sort((a, b) => a.date.localeCompare(b.date))[0];
  const end = lease ? addMonths(lease.start, lease.termMonths) : null;
  const monthNow = lease ? Math.min(lease.termMonths, Math.max(1, monthsBetween(lease.start, today) + 1)) : 0;
  const monthsLeft = end ? Math.max(0, monthsBetween(today, end)) : 0;

  return (
    <section
      data-tour="timeline-summary"
      className="mt-4 flex flex-col gap-4 rounded-2xl border border-brand/15 bg-brand-soft px-5 py-4 lg:flex-row lg:items-center lg:gap-8"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-8">
        <div className="shrink-0 sm:w-40">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
            <Route size={16} className="text-brand" aria-hidden />
            Your tenancy
          </p>
          <p className="mt-0.5 text-xs text-mute">
            {lease ? `Month ${monthNow} of ${lease.termMonths}` : "No lease analysed yet"}
          </p>
        </div>
        {lease ? (
          <ProgressBar lease={lease} today={today} />
        ) : (
          <p className="text-sm text-mute">
            <Link href="/lease/new" className="font-semibold text-brand hover:underline">
              Analyse your lease
            </Link>{" "}
            to see when your Part 4 rights start and when your lease ends.
          </p>
        )}
      </div>

      <div className="flex shrink-0 divide-x divide-brand/15">
        <Stat
          label="Open deadlines"
          value={String(deadlines.length)}
          detail={deadlines[0] ? `next ${countdown(deadlines[0].date, today)}` : "nothing due"}
          tone={deadlines.length ? "text-warn" : undefined}
        />
        <Stat
          label="Next rent"
          value={lease?.monthlyRent ? euro(lease.monthlyRent) : nextRent ? fmtDate(nextRent.date) : "—"}
          detail={nextRent ? `due ${countdown(nextRent.date, today)}` : lease?.monthlyRent ? "per month" : "add a rent date"}
        />
        <Stat
          label="Lease left"
          value={end ? `${monthsLeft} month${monthsLeft === 1 ? "" : "s"}` : "—"}
          detail={end ? `ends ${fmtDate(end)}` : "from your lease"}
        />
      </div>
    </section>
  );
}
