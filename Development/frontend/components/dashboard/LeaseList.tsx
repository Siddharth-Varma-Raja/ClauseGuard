import Link from "next/link";
import { ArrowRight, ChevronRight, CircleCheck, FileText, TriangleAlert } from "lucide-react";
import { flaggedClauses, leaseName } from "@/lib/dashboard";
import type { Analysis, AnalysisSummary } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { cn } from "@/lib/cn";

function formatCreated(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

function Verdict({ lease, detail }: { lease: AnalysisSummary; detail?: Analysis }) {
  const left = detail ? flaggedClauses(detail).filter((c) => !c.reviewed) : [];
  const red = detail ? left.filter((c) => c.status === "red").length : lease.counts.red;
  const amber = detail ? left.filter((c) => c.status === "amber").length : lease.counts.amber;
  const hadFlags = lease.counts.red + lease.counts.amber > 0;

  if (red > 0) return <Badge tone="bad" text={`${red} high risk`} />;
  if (amber > 0) return <Badge tone="warn" text={`${amber} to check`} />;
  return <Badge tone="ok" text={hadFlags && detail ? "Reviewed" : "Looks fine"} />;
}

function Badge({ tone, text }: { tone: "bad" | "warn" | "ok"; text: string }) {
  const Icon = tone === "ok" ? CircleCheck : TriangleAlert;
  return (
    <span
      className={cn(
        "inline-flex w-32 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        tone === "bad" && "border-bad-line bg-bad-bg text-bad",
        tone === "warn" && "border-warn-line bg-warn-bg text-warn",
        tone === "ok" && "border-ok-line bg-ok-bg text-ok",
      )}
    >
      <Icon size={14}  />
      {text}
    </span>
  );
}

function LeaseRow({ lease, detail }: { lease: AnalysisSummary; detail?: Analysis }) {
  const { counts } = lease;
  const total = counts.red + counts.amber + counts.green + counts.grey;
  const flagged = detail ? flaggedClauses(detail) : [];
  const reviewed = flagged.filter((c) => c.reviewed).length;
  const progress = !detail ? "" : flagged.length === 0 ? " · nothing flagged" : ` · ${reviewed} of ${flagged.length} reviewed`;

  return (
    <li>
      <Link
        href={`/lease/${lease.id}`}
        className="group flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-soft sm:flex-nowrap"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <FileText size={21}  />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink group-hover:text-brand">{leaseName(lease.fileName)}</p>
          <p className="truncate text-sm text-mute">Uploaded {formatCreated(lease.createdAt)}</p>
        </div>
        <div className="w-full sm:w-44">
          <p className="text-xs text-mute">
            {total} clauses{progress}
          </p>
          <div className="animate-grow mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-line">
            {STATUS_ORDER.map((s) =>
              counts[s] > 0 ? <span key={s} className={STATUS[s].solid} style={{ width: `${(counts[s] / total) * 100}%` }} /> : null,
            )}
          </div>
        </div>
        <Verdict lease={lease} detail={detail} />
        <ChevronRight size={20} className="hidden shrink-0 text-neu-solid transition-transform group-hover:translate-x-0.5 sm:block"  />
      </Link>
    </li>
  );
}

export default function LeaseList({ leases, details, totalCount }: { leases: AnalysisSummary[]; details: Analysis[]; totalCount: number }) {
  return (
    <section data-tour="my-leases" className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-brand-dark">My leases</h2>
        <Link href="/lease" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          View all {totalCount}
          <ArrowRight size={15}  />
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {leases.map((lease) => (
          <LeaseRow key={lease.id} lease={lease} detail={details.find((d) => d.id === lease.id)} />
        ))}
      </ul>
    </section>
  );
}
