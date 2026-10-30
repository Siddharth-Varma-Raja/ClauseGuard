import Link from "next/link";
import { ArrowRight, CalendarDays, CircleCheck, Clock, Euro, FileText, FileWarning, House, ListChecks, TriangleAlert } from "lucide-react";
import type { DashboardItem } from "@/lib/dashboard";
import { flaggedClauses, leaseName } from "@/lib/dashboard";
import type { Analysis } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { euro, fmtDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const TONE = {
  bad: "bg-bad-bg text-bad",
  warn: "bg-warn-bg text-warn",
  brand: "bg-brand-soft text-brand",
  ok: "bg-ok-bg text-ok",
};

const ICON = {
  deadline: CalendarDays,
  date: CalendarDays,
  review: TriangleAlert,
  notice: FileWarning,
  deposit: Euro,
  milestone: House,
  setup: CalendarDays,
  clear: CircleCheck,
};

function ItemRow({ item }: { item: DashboardItem }) {
  const Icon = ICON[item.kind];
  return (
    <li>
      <Link href={item.href} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 transition-colors hover:border-brand hover:bg-brand-soft/40">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", TONE[item.tone])}>
          <Icon size={18}  />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{item.title}</p>
          <p className="truncate text-sm text-mute">{item.text}</p>
        </div>
        <ArrowRight size={16} className="shrink-0 text-brand transition-transform group-hover:translate-x-0.5"  />
      </Link>
    </li>
  );
}

function Fact({ Icon, label, value }: { Icon: typeof Euro; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-3">
      <p className="flex items-center gap-1.5 text-xs text-mute">
        <Icon size={13} />
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function LeaseAtAGlance({ analysis }: { analysis: Analysis }) {
  const rent = analysis.monthlyRentCents;
  const deposit = analysis.depositCents;
  const start = analysis.tenancyStart?.slice(0, 10);
  const hasFacts = rent != null || deposit != null || start || analysis.termMonths;
  const flagged = flaggedClauses(analysis);
  const allReviewed = flagged.every((c) => c.reviewed);
  const { counts } = analysis;
  const total = counts.red + counts.amber + counts.green + counts.grey;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-dark">
          <FileText size={15} />
          Your lease at a glance
        </p>
        <Link href={`/lease/${analysis.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          Open
          <ArrowRight size={14} />
        </Link>
      </div>
      <p className="mt-3 truncate text-sm text-mute">
        {leaseName(analysis.fileName)} · {total} clauses
      </p>

      {hasFacts ? (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {rent != null && <Fact Icon={Euro} label="Monthly rent" value={euro(rent / 100)} />}
          {deposit != null && <Fact Icon={Euro} label="Deposit" value={euro(deposit / 100)} />}
          {start && <Fact Icon={CalendarDays} label="Start date" value={fmtDate(start)} />}
          {analysis.termMonths ? <Fact Icon={Clock} label="Length" value={`${analysis.termMonths} months`} /> : null}
        </div>
      ) : (
        <>
          <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
            {STATUS_ORDER.map((s) =>
              counts[s] > 0 ? <span key={s} className={STATUS[s].solid} style={{ width: `${(counts[s] / total) * 100}%` }} /> : null,
            )}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-mute">
            {STATUS_ORDER.map((s) =>
              counts[s] > 0 ? (
                <li key={s} className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", STATUS[s].solid)}  />
                  {counts[s]} {STATUS[s].label.toLowerCase()}
                </li>
              ) : null,
            )}
          </ul>
        </>
      )}

      {rent != null && deposit != null && deposit <= rent ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-ok-bg px-3 py-2.5 text-sm text-ok">
          <CircleCheck size={16}  />
          Deposit is within one-month limit
        </p>
      ) : allReviewed && flagged.length > 0 ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-ok-bg px-3 py-2.5 text-sm text-ok">
          <CircleCheck size={16}  />
          All clauses reviewed
        </p>
      ) : null}
    </>
  );
}

const MAX_ROWS = 3;

const BOX = {
  bad: "border-bad-line bg-[linear-gradient(180deg,#fff4f2_0%,#ffffff_70%)]",
  warn: "border-warn-line bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_70%)]",
  brand: "border-line bg-[linear-gradient(180deg,#eef7f7_0%,#ffffff_70%)]",
  ok: "border-ok-line bg-[linear-gradient(180deg,#f1faf4_0%,#ffffff_70%)]",
};

const LABEL = {
  bad: "text-bad",
  warn: "text-warn",
  brand: "text-brand-dark",
  ok: "text-ok",
};

function FeaturedItem({ item }: { item: DashboardItem }) {
  const Icon = ICON[item.kind];
  const done = item.done ?? 0;
  return (
    <div className="mt-4 flex gap-3.5">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", TONE[item.tone])}>
        <Icon size={20}  />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{item.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-mute">{item.text}</p>
        {item.total ? (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <div className="animate-grow h-full rounded-full bg-ok-solid" style={{ width: `${(done / item.total) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-mute">
              {done} of {item.total} clauses reviewed
            </p>
          </>
        ) : null}
        <Link
          href={item.href}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-brand-dark px-4 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-dark hover:text-white"
        >
          {item.action}
          <ArrowRight size={15}  />
        </Link>
      </div>
    </div>
  );
}

export default function AlsoOnList({ items, latest }: { items: DashboardItem[]; latest: Analysis | null }) {
  const tone = items[0]?.tone ?? "brand";
  const shown = items.slice(0, MAX_ROWS);
  const more = items.length - shown.length;
  const HeaderIcon = tone === "bad" || tone === "warn" ? TriangleAlert : ListChecks;

  return (
    <section data-tour="also-on-list" className={cn("rounded-3xl border p-5 shadow-soft sm:p-6", BOX[tone])}>
      {items.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <p className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-widest", LABEL[tone])}>
              <HeaderIcon size={15}  />
              Also on your list
            </p>
            <span className="rounded-full bg-brand-dark px-2.5 py-0.5 text-xs font-bold text-white">{items.length}</span>
          </div>
          {items.length === 1 ? (
            <FeaturedItem item={items[0]} />
          ) : (
            <ul className="mt-4 space-y-2.5">
              {shown.map((item) => (
                <ItemRow key={item.key} item={item} />
              ))}
            </ul>
          )}
          {more > 0 && (
            <p className="mt-3 text-center text-sm text-mute">
              {more} more {more === 1 ? "item" : "items"} will show here once you finish
            </p>
          )}
        </>
      ) : latest ? (
        <LeaseAtAGlance analysis={latest} />
      ) : (
        <p className="text-sm text-mute">Nothing else needs your attention.</p>
      )}
    </section>
  );
}
