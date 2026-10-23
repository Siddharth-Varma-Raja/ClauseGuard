"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, BookOpen, CalendarPlus, Check, ChevronDown, CircleCheck, Download, ExternalLink, FileSearch, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import StatusBadge from "@/components/ui/StatusBadge";
import { downloadReport } from "@/components/lease/DownloadReport";
import { STATUS, STATUS_ORDER, overallStatus } from "@/lib/notice-status";
import { addEvent, errorMessage, getEvents } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Analysis, Clause, NewTimelineEvent, Status } from "@/lib/notice-types";

function longDate(value: string | null) {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });
}

function euroFromCents(cents: number | null) {
  if (cents == null) return "—";
  const amount = cents / 100;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function termEnd(startIso: string, months: number) {
  const [y, m, d] = startIso.split("-").map(Number);
  const lastDayOfTargetMonth = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  const end = new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDayOfTargetMonth)) - 24 * 60 * 60 * 1000);
  return end.toISOString().slice(0, 10);
}

function Donut({ counts, total }: { counts: Record<Status, number>; total: number }) {
  const r = 50;
  const circumference = 2 * Math.PI * r;
  const gap = total > 1 ? 2 : 0;
  let offset = 0;

  return (
    <svg viewBox="0 0 120 120" className="size-40 shrink-0 sm:size-44" role="img" aria-label={`${total} clauses`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-line)" strokeWidth="14" />
      {total > 0 &&
        STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => {
          const length = (counts[s] / total) * circumference;
          const segment = (
            <circle
              key={s}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={STATUS[s].colour}
              strokeWidth="14"
              strokeDasharray={`${Math.max(length - gap, 0)} ${circumference}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += length;
          return segment;
        })}
      <text x="60" y="62" textAnchor="middle" className="fill-brand-dark font-display" fontSize="26" fontWeight="600">
        {total}
      </text>
      <text x="60" y="80" textAnchor="middle" className="fill-mute" fontSize="9">
        clauses
      </text>
    </svg>
  );
}

function ClauseRow({ analysisId, clause, open, onToggle }: { analysisId: string; clause: Clause; open: boolean; onToggle: () => void }) {
  const style = STATUS[clause.status] ?? STATUS.grey;
  const number = clause.number && clause.number !== "0" ? `#${clause.number}` : "–";

  return (
    <li className="break-inside-avoid border-b border-line last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 sm:px-6">
        <span className={cn("h-10 w-1.5 shrink-0 rounded-full", style.solid)} aria-hidden />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
        >
          <span className="w-10 shrink-0 text-mute">{number}</span>
          <span className="min-w-0 flex-1 font-semibold text-ink">
            {clause.title}
            {clause.reviewed && <Check size={15} className="ml-2 inline text-ok" aria-label="Reviewed" />}
          </span>
          <ChevronDown size={18} className={cn("shrink-0 text-mute transition-transform print:hidden", open && "rotate-180")} />
        </button>
        <StatusBadge status={clause.status} size="sm" />
        <span className="w-36 text-sm text-mute">
          Risk: <strong className="text-ink">{style.risk}</strong>
        </span>
        <Link
          href={`/lease/${analysisId}?clause=${encodeURIComponent(clause.id)}`}
          className="text-sm font-semibold text-brand-dark hover:underline print:hidden"
        >
          View in document
        </Link>
      </div>

      {open && (
        <div className="space-y-4 px-4 pb-6 sm:pl-[5.25rem] sm:pr-6">
          <blockquote className="border-l-2 border-line pl-4 font-serif italic text-mute">“{clause.text}”</blockquote>
          {clause.confidence !== "high" && (
            <p className="text-xs text-mute">ClauseGuard is {clause.confidence === "medium" ? "fairly" : "not very"} confident about this result.</p>
          )}
          <div>
            <h4 className="font-semibold text-ink">What it means</h4>
            <p className="mt-1 leading-relaxed text-mute">{clause.explanation}</p>
          </div>
          {clause.reason && (
            <div>
              <h4 className="font-semibold text-ink">Why ClauseGuard flagged this</h4>
              <p className="mt-1 leading-relaxed text-mute">{clause.reason}</p>
            </div>
          )}
          {clause.nextSteps.length > 0 && (
            <div>
              <h4 className="font-semibold text-ink">What you can do</h4>
              <ul className="mt-2 space-y-2">
                {clause.nextSteps.map((step) => (
                  <li key={step} className="flex gap-2.5 text-sm leading-relaxed text-ink">
                    <CircleCheck size={17} className="mt-0.5 shrink-0 text-brand" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {clause.sources.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-ink">
                <BookOpen size={16} className="text-mute" /> Sources
              </h4>
              <ul className="mt-2 space-y-1.5 text-sm">
                {clause.sources.map((source, i) => (
                  <li key={`${source.title}-${i}`}>
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 font-medium text-brand hover:underline">
                        {source.title}
                        <ExternalLink size={13} className="mt-0.5 shrink-0 print:hidden" />
                      </a>
                    ) : (
                      <span className="font-medium text-ink">{source.title}</span>
                    )}
                    {source.note && <span className="text-mute"> — {source.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function LeaseReport({ analysis }: { analysis: Analysis }) {
  const { clauses } = analysis;
  const counts: Record<Status, number> = { red: 0, amber: 0, green: 0, grey: 0 };
  clauses.forEach((c) => counts[c.status]++);
  const total = clauses.length;
  const verdict = overallStatus(counts);
  const VerdictIcon = STATUS[verdict.status].Icon;

  const [filter, setFilter] = useState<"all" | Status>("all");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [timeline, setTimeline] = useState<{ busy: boolean; tone?: "success" | "error"; text?: string }>({ busy: false });

  const shown = filter === "all" ? clauses : clauses.filter((c) => c.status === filter);

  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addDatesToTimeline() {
    if (!analysis.tenancyStart) {
      setTimeline({ busy: false, tone: "error", text: "We couldn't find a start date in this lease." });
      return;
    }
    const note = `From your lease: ${analysis.fileName}`;
    const wanted: NewTimelineEvent[] = [{ title: "Tenancy starts", date: analysis.tenancyStart, kind: "event", note }];
    if (analysis.termMonths) {
      wanted.push({ title: "Fixed term ends", date: termEnd(analysis.tenancyStart, analysis.termMonths), kind: "deadline", note });
    }

    setTimeline({ busy: true });
    try {
      const existing = await getEvents();
      const missing = wanted.filter((w) => !existing.some((e) => e.title === w.title && e.date === w.date));
      for (const event of missing) await addEvent(event);
      setTimeline({
        busy: false,
        tone: "success",
        text: missing.length
          ? `Added ${missing.length} ${missing.length === 1 ? "date" : "dates"} to your timeline.`
          : "These dates are already on your timeline.",
      });
    } catch (err) {
      setTimeline({ busy: false, tone: "error", text: errorMessage(err, "The dates couldn't be added. Try again.") });
    }
  }

  const facts: [string, string][] = [
    ["Uploaded", longDate(analysis.createdAt)],
    ["Property", analysis.propertyAddress ?? "—"],
    ["Monthly rent", euroFromCents(analysis.monthlyRentCents)],
    ["Deposit", euroFromCents(analysis.depositCents)],
    ["Starts", longDate(analysis.tenancyStart)],
    ["Term", analysis.termMonths ? `${analysis.termMonths} months` : "—"],
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <style>{`@media print { header, [data-tour="tour-button"] { display: none !important; } body { background: white; } }`}</style>

      <Link href="/lease" className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-brand hover:underline print:hidden">
        <ArrowLeft size={18} />
        Back to my leases
      </Link>

      <Card className="break-inside-avoid p-6 sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold", STATUS[verdict.status].badge)}>
              <VerdictIcon size={16} aria-hidden />
              {verdict.label}
            </span>
            <h1 className="mt-4 break-words font-display text-3xl font-semibold text-brand-dark sm:text-4xl">{analysis.fileName}</h1>

            <dl className="mt-5 grid gap-x-10 gap-y-3 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="inline text-mute">{label}: </dt>
                  <dd className="inline font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-7 flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={() => {
                  flushSync(() => setPrinting(true));
                  window.print();
                }}
                title="Opens the print dialog — choose “Save as PDF”"
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-brand-dark px-5 font-semibold text-white hover:bg-brand"
              >
                <Download size={18} /> Download PDF report
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 self-center sm:flex-row">
            <Donut counts={counts} total={total} />
            <ul className="space-y-2.5 text-sm">
              {STATUS_ORDER.map((s) => (
                <li key={s} className="flex items-center gap-3">
                  <span className={cn("size-3 shrink-0 rounded-full", STATUS[s].solid)} aria-hidden />
                  <span className="w-40 text-ink">{STATUS[s].label}</span>
                  <span className="font-semibold text-ink">{counts[s]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-8 flex h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
            {STATUS_ORDER.map((s) => counts[s] > 0 && <div key={s} className={STATUS[s].solid} style={{ flexGrow: counts[s] }} />)}
          </div>
        )}
      </Card>

      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 px-2 print:hidden">
        <Link href={`/lease/${analysis.id}`} className="inline-flex items-center gap-2 font-semibold text-brand-dark hover:underline">
          <FileSearch size={18} /> Open annotated review
        </Link>
        <button
          type="button"
          onClick={addDatesToTimeline}
          disabled={timeline.busy}
          className="inline-flex cursor-pointer items-center gap-2 font-semibold text-brand-dark hover:underline disabled:opacity-60"
        >
          {timeline.busy ? <Loader2 size={18} className="animate-spin" /> : <CalendarPlus size={18} />}
          Add lease dates to my timeline
        </button>
      </div>
      {timeline.text && timeline.tone && (
        <div className="mt-3 print:hidden">
          <Alert tone={timeline.tone}>
            {timeline.text}{" "}
            {timeline.tone === "success" && (
              <Link href="/timeline" className="underline">
                Open timeline
              </Link>
            )}
          </Alert>
        </div>
      )}

      <h2 className="mt-10 font-display text-3xl font-semibold text-brand-dark">All clauses</h2>

      <div role="tablist" aria-label="Filter clauses" className="mt-4 flex flex-wrap gap-2 print:hidden">
        {(["all", ...STATUS_ORDER] as const).map((key) => {
          const active = filter === key;
          const label = key === "all" ? "All" : STATUS[key].label;
          const count = key === "all" ? total : counts[key];
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className={cn(
                "cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active ? "border-brand-dark bg-brand-dark text-white" : "border-line bg-white text-ink hover:bg-surface",
              )}
            >
              {label} <span className={active ? "text-white/70" : "text-mute"}>{count}</span>
            </button>
          );
        })}
      </div>

      <Card className="mt-4 overflow-hidden">
        {(printing ? clauses : shown).length === 0 ? (
          <p className="p-8 text-center text-mute">No clauses in this group.</p>
        ) : (
          <ul>
            {(printing ? clauses : shown).map((clause) => (
              <ClauseRow
                key={clause.id}
                analysisId={analysis.id}
                clause={clause}
                open={printing || openIds.has(clause.id)}
                onToggle={() => toggle(clause.id)}
              />
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-8 text-center text-sm text-mute">
        ClauseGuard gives automated, informational analysis. It is not legal advice.
      </p>
    </div>
  );
}
