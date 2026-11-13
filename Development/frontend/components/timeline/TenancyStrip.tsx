import { Route } from "lucide-react";
import type { TimelineEvent } from "@/lib/notice-types";
import { euro, fmtDate } from "@/lib/format";
import { addMonths, countdown, daysBetween, isUpcoming, monthsBetween, type LeaseInfo } from "@/lib/timeline";
import { cn } from "@/lib/cn";

type Milestone = { label: string; date: string; hint: string };
export type LeaseOption = { id: string; name: string };

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
  const milestones: Milestone[] = [{ label: "Start", date: lease.start, hint: "The day your tenancy starts." }];
  if (lease.termMonths > 6) {
    milestones.push({
      label: "Secure tenancy",
      date: addMonths(lease.start, 6),
      hint: "After 6 months your landlord needs a legal reason to end your tenancy (Part 4 of the Residential Tenancies Act).",
    });
  }
  milestones.push({ label: "Lease ends", date: end, hint: "The end of your fixed term." });

  return (
    <div className="relative mb-1 mt-2.5 h-1.5 min-w-0 flex-1 rounded-full bg-white sm:mb-6 sm:mt-7">
      <div className="h-1.5 rounded-full bg-brand" style={{ width: `${todayAt}%` }} />
      {milestones.map((m, i) => {
        const at = position(m.date);
        const align = i === 0 ? "text-left" : i === milestones.length - 1 ? "-translate-x-full text-right" : "-translate-x-1/2 text-center";
        return (
          <div key={m.label} title={m.hint}>
            <span
              className={cn(
                "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
                m.date <= today ? "border-brand bg-brand" : "border-brand/50 bg-white",
              )}
              style={{ left: `${at}%` }}
            />
            <p className={cn("absolute top-4 hidden cursor-help whitespace-nowrap text-xs font-semibold text-brand-dark sm:block", align)} style={{ left: `${at}%` }}>
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
            className="absolute -top-6 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2 py-px text-[11px] font-bold text-white sm:block"
            style={{ left: `${Math.min(92, Math.max(8, todayAt))}%` }}
          >
            Today
          </span>
        </>
      )}
    </div>
  );
}

function LeasePicker({ leases, value, onChange }: { leases: LeaseOption[]; value: string; onChange: (id: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Which lease is your current tenancy"
      className="mt-1 w-full cursor-pointer truncate rounded-md border border-brand/20 bg-white px-1.5 py-0.5 text-xs text-brand-dark"
    >
      {leases.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  );
}

function leaseStatus(lease: LeaseInfo, today: string) {
  const end = addMonths(lease.start, lease.termMonths);
  if (today < lease.start) return `Starts ${countdown(lease.start, today)}`;
  if (today >= end) return "Fixed term has ended";
  return `Month ${Math.min(lease.termMonths, monthsBetween(lease.start, today) + 1)} of ${lease.termMonths}`;
}

export default function TenancyStrip({
  lease,
  leases,
  leaseId,
  events,
  today,
  onLeaseChange,
}: {
  lease: LeaseInfo | null;
  leases: LeaseOption[];
  leaseId: string | null;
  events: TimelineEvent[];
  today: string;
  onLeaseChange: (id: string) => void;
}) {
  if (!lease) {
    if (leases.length < 2 || !leaseId) return null;
    return (
      <section className="mt-4 flex flex-col gap-2 rounded-2xl border border-brand/15 bg-brand-soft px-5 py-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="sm:w-44">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
            <Route size={16} className="text-brand" aria-hidden />
            Your tenancy
          </p>
          <LeasePicker leases={leases} value={leaseId} onChange={onLeaseChange} />
        </div>
        <p className="text-sm text-mute">This lease doesn&apos;t say when the tenancy starts, so we can&apos;t show its progress. Pick another lease above.</p>
      </section>
    );
  }

  const deadlines = events.filter((e) => e.kind === "deadline" && isUpcoming(e, today)).sort((a, b) => a.date.localeCompare(b.date));
  const nextRent = events.filter((e) => e.kind === "rent" && isUpcoming(e, today)).sort((a, b) => a.date.localeCompare(b.date))[0];
  const end = addMonths(lease.start, lease.termMonths);
  const monthsLeft = Math.max(0, monthsBetween(today, end));

  return (
    <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-brand/15 bg-brand-soft px-4 py-3 sm:gap-4 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-8">
        <div className="min-w-0 shrink-0 sm:w-44">
          <p className="flex items-center justify-between gap-1.5 text-sm font-semibold text-brand-dark sm:justify-start">
            <span className="flex items-center gap-1.5">
              <Route size={16} className="text-brand" aria-hidden />
              Your tenancy
            </span>
            <span className="text-xs text-brand sm:hidden">{leaseStatus(lease, today)}</span>
          </p>
          {leases.length > 1 ? (
            <LeasePicker leases={leases} value={lease.id} onChange={onLeaseChange} />
          ) : (
            <p className="mt-0.5 truncate text-xs text-mute" title={lease.name}>
              {lease.name}
            </p>
          )}
          <p className="mt-0.5 hidden text-xs font-semibold text-brand sm:block">{leaseStatus(lease, today)}</p>
        </div>
        <ProgressBar lease={lease} today={today} />
      </div>

      <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-mute sm:hidden">
        <span>
          <b className={deadlines.length ? "text-warn" : "text-brand-dark"}>{deadlines.length}</b> open deadline{deadlines.length === 1 ? "" : "s"}
        </span>
        {lease.monthlyRent && (
          <span>
            <b className="text-brand-dark">{euro(lease.monthlyRent)}</b> rent
          </span>
        )}
        <span>
          <b className="text-brand-dark">{monthsLeft}</b> month{monthsLeft === 1 ? "" : "s"} left
        </span>
      </p>

      <div className="hidden shrink-0 divide-x divide-brand/15 sm:flex">
        <Stat
          label="Open deadlines"
          value={String(deadlines.length)}
          detail={deadlines[0] ? `next ${countdown(deadlines[0].date, today)}` : "nothing due"}
          tone={deadlines.length ? "text-warn" : undefined}
        />
        <Stat
          label="Next rent"
          value={lease.monthlyRent ? euro(lease.monthlyRent) : nextRent ? fmtDate(nextRent.date) : "—"}
          detail={nextRent ? `due ${countdown(nextRent.date, today)}` : lease.monthlyRent ? "per month" : "no rent dates added"}
        />
        <Stat label="Lease left" value={`${monthsLeft} month${monthsLeft === 1 ? "" : "s"}`} detail={`ends ${fmtDate(end)}`} />
      </div>
    </section>
  );
}
