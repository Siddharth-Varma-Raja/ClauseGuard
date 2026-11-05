"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, BookOpen, CalendarPlus, Check, ChevronDown, CircleCheck, Download, ExternalLink, FileSearch, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import StatusBadge from "@/components/ui/StatusBadge";
import { STATUS, STATUS_ORDER } from "@/lib/notice-status";
import { addEvent, errorMessage, getEvents } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Analysis, Clause, NewTimelineEvent, Status } from "@/lib/notice-types";
import { CountBoxes, LeaseDetails, ShortAnswer } from "./ReportSummary";

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
        <div className="flex shrink-0 sm:w-48">
          <StatusBadge status={clause.status} size="sm" />
        </div>
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

  const leaseName = analysis.fileName.replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");

  const details: [string, string | null][] = [
    ["Lease file", analysis.fileName],
    ["Uploaded", longDate(analysis.createdAt)],
    ["Property address", analysis.propertyAddress],
    ["Monthly rent", analysis.monthlyRentCents == null ? null : euroFromCents(analysis.monthlyRentCents)],
    ["Deposit", analysis.depositCents == null ? null : euroFromCents(analysis.depositCents)],
    ["Start date", analysis.tenancyStart ? longDate(analysis.tenancyStart) : null],
    ["Length", analysis.termMonths ? `${analysis.termMonths} months` : null],
    ["Size", `${analysis.pageCount} ${analysis.pageCount === 1 ? "page" : "pages"}, ${total} clauses`],
  ];

  const missing = [
    analysis.propertyAddress ? null : "property address",
    analysis.monthlyRentCents == null ? "monthly rent" : null,
    analysis.tenancyStart ? null : "start date",
    analysis.termMonths ? null : "length of the lease",
  ].filter((item): item is string => item !== null);

  return (
    <div className="mx-auto max-w-4xl">
      <style>{`@media print { header, [data-tour="tour-button"] { display: none !important; } body { background: white; } }`}</style>
      <Link href="/lease" className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-brand hover:underline print:hidden">
        <ArrowLeft size={18} />
        Back to my leases
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-mute">Your lease report</p>
          <h1 className="mt-1 break-words font-display text-3xl font-semibold text-brand-dark sm:text-4xl">{leaseName}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            flushSync(() => setPrinting(true));
            window.print();
          }}
          title="Opens the print dialog — choose “Save as PDF”"
          className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-dark px-5 font-semibold text-white shadow-soft hover:bg-brand print:hidden"
        >
          <Download size={18} /> Download PDF report
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <Link
          href={`/lease/${analysis.id}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold text-brand-dark hover:border-brand"
        >
          <FileSearch size={17} /> See it in my lease
        </Link>
        <button
          type="button"
          onClick={addDatesToTimeline}
          disabled={timeline.busy}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold text-brand-dark hover:border-brand disabled:opacity-60"
        >
          {timeline.busy ? <Loader2 size={17} className="animate-spin" /> : <CalendarPlus size={17} />}
          Add dates to my timeline
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

      <ShortAnswer counts={counts} total={total} />
      <CountBoxes counts={counts} />
      <LeaseDetails rows={details} missing={missing} />

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
  )
}
