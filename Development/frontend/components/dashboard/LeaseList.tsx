import Link from "next/link";
import { ArrowRight, ChevronRight, CircleCheck, Clock, FileText, TriangleAlert } from "lucide-react";
import { flaggedClauses, leaseName } from "@/lib/dashboard";
import { openedAgo } from "@/lib/leaseVisits";
import type { Analysis, AnalysisSummary, Status } from "@/lib/notice-types";
import { cn } from "@/lib/cn";

const BAR: { key: Status; colour: string; label: string }[] = [
  { key: "red", colour: "bg-bad-solid", label: "High risk" },
  { key: "amber", colour: "bg-warn-solid", label: "Worth asking about" },
  { key: "green", colour: "bg-ok-solid", label: "Fine" },
  { key: "grey", colour: "bg-neu-solid", label: "For information" },
];

function uploadedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
  const time = date.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
  return `Uploaded ${day} at ${time}`;
}

function Badge({ lease, detail }: { lease: AnalysisSummary; detail?: Analysis }) {
  const left = detail ? flaggedClauses(detail).filter((c) => !c.reviewed) : [];
  const red = detail ? left.filter((c) => c.status === "red").length : lease.counts.red;
  const amber = detail ? left.filter((c) => c.status === "amber").length : lease.counts.amber;
  const hadFlags = lease.counts.red + lease.counts.amber > 0;
  const tone = red > 0 ? "bad" : amber > 0 ? "warn" : "ok";
  const text = red > 0 ? `${red} high risk` : amber > 0 ? `${amber} to ask about` : hadFlags && detail ? "Reviewed" : "Looks fine";
  const Icon = tone === "ok" ? CircleCheck : TriangleAlert;
  return (
    <span
      className={cn(
        "inline-flex w-[132px] shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        tone === "bad" && "border-bad-line bg-bad-bg text-bad",
        tone === "warn" && "border-warn-line bg-warn-bg text-warn",
        tone === "ok" && "border-ok-line bg-ok-bg text-ok",
      )}
    >
      <Icon size={13} aria-hidden />
      {text}
    </span>
  );
}

function LeaseRow({ lease, detail, opened }: { lease: AnalysisSummary; detail?: Analysis; opened?: number }) {
  const { counts } = lease;
  const total = counts.red + counts.amber + counts.green + counts.grey;
  const seen = openedAgo(opened);

  return (
    <li>
      <Link
        href={`/lease/${lease.id}`}
        className="group grid grid-cols-[44px_minmax(0,1fr)_16px] items-center gap-x-4 gap-y-2 rounded-xl px-2 py-3 hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand md:grid-cols-[44px_minmax(0,1.5fr)_minmax(0,1.2fr)_150px_132px_16px]"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
          <FileText size={20} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-ink group-hover:text-brand">{lease.propertyAddress || leaseName(lease.fileName)}</span>
          <span className="block truncate text-[12.5px] text-mute">{lease.fileName}</span>
        </span>
        <ChevronRight size={18} aria-hidden className="text-[#a9babd] transition-transform group-hover:translate-x-0.5 md:order-last" />
        <span className="col-span-3 col-start-1 min-w-0 md:col-span-1 md:col-start-auto">
          <span className="flex items-center gap-1.5 text-[13px] tabular-nums text-ink">
            <Clock size={13} aria-hidden className="shrink-0 text-brand" />
            {uploadedAt(lease.createdAt)}
          </span>
          {seen && <span className="mt-0.5 block pl-5 text-xs text-mute">{seen}</span>}
        </span>
        <span className="col-span-3 col-start-1 min-w-0 md:col-span-1 md:col-start-auto">
          <span className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-line">
            {BAR.map((part) => (counts[part.key] > 0 ? <span key={part.key} className={part.colour} style={{ width: `${(counts[part.key] / total) * 100}%` }} /> : null))}
          </span>
          <span className="mt-1 block text-[11.5px] tabular-nums text-mute">{total} points checked</span>
        </span>
        <span className="col-span-3 col-start-1 md:col-span-1 md:col-start-auto">
          <Badge lease={lease} detail={detail} />
        </span>
      </Link>
    </li>
  );
}

export default function LeaseList({
  leases,
  details,
  totalCount,
  opened,
}: {
  leases: AnalysisSummary[];
  details: Analysis[];
  totalCount: number;
  opened: Record<string, number>;
}) {
  const used = BAR.filter((part) => leases.some((lease) => lease.counts[part.key] > 0));

  return (
    <section data-tour="my-leases" className="rounded-3xl border border-[#d5e3e4] bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="font-display text-[21px] font-semibold text-brand-dark">My leases</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-mute">
            {used.map((part) => (
              <span key={part.key} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${part.colour}`} />
                {part.label}
              </span>
            ))}
          </p>
          <Link href="/lease" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
            View all {totalCount}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {leases.map((lease) => (
          <LeaseRow key={lease.id} lease={lease} detail={details.find((d) => d.id === lease.id)} opened={opened[lease.id]} />
        ))}
      </ul>
    </section>
  );
}
