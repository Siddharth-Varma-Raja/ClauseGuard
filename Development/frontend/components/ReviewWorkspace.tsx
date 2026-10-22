"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  Info,
  Minus,
  Plus, ChevronDown,
  MessageCircle, Download
} from "lucide-react";

import type { Analysis, Clause } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { cn } from "@/lib/cn";
import { errorMessage, getPreferences, setClauseReviewed } from "@/lib/api";
import ClauseChat from "@/components/lease/ClauseChat";
import { downloadReport } from "./lease/DownloadReport";
import PageTour from "@/components/PageTour";
import { REVIEW_TOUR } from "@/lib/tours";

export default function ReviewWorkspace({ analysis }: { analysis: Analysis }) {
  const [clauses, setClauses] = useState<Clause[]>(analysis.clauses);
  const issues = [...clauses.filter((c) => c.status === "red"), ...clauses.filter((c) => c.status === "amber")];
  const firstClause = issues[0] ?? clauses[0];
  const [downloadError, setDownloadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(firstClause?.id ?? null);
  const [page, setPage] = useState(firstClause?.page ?? 1);
  const [zoom, setZoom] = useState(100);
  const [detailed, setDetailed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = clauses.find((c) => c.id === selectedId) ?? null;
  const pageCount = Math.max(analysis.pageCount || 1, ...clauses.map((c) => c.page || 1));
  const clausesOnPage = clauses.filter((c) => c.page === page);
  const countOf = (status: Clause["status"]) => clauses.filter((c) => c.status === status).length;

  useEffect(() => {
    getPreferences()
      .then((prefs) => setDetailed(prefs.explanationDetail === "detailed"))
      .catch(() => undefined);
  }, []);

  function handleDownload() {
    setDownloadError("");
    try {
      downloadReport(analysis, clauses);
    } catch {
      setDownloadError("The report couldn't be downloaded. Try again.");
    }
  }

  async function toggleReviewed(clause: Clause) {
    const reviewed = !clause.reviewed;
    setActionError("");
    setClauses((prev) => prev.map((c) => (c.id === clause.id ? { ...c, reviewed } : c)));
    try {
      await setClauseReviewed(analysis.id, clause.id, reviewed);
    } catch (err) {
      setClauses((prev) => prev.map((c) => (c.id === clause.id ? { ...c, reviewed: !reviewed } : c)));
      setActionError(errorMessage(err, "That change didn't save. Try again."));
    }
  }

  function selectClause(clause: Clause) {
    setSelectedId(clause.id);
    setPage(clause.page);
    if (window.innerWidth < 1024) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Link href="/lease" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-brand hover:underline">
          <ArrowLeft size={18} />
          Back to my leases
        </Link>
        <PageTour tourId="review" steps={REVIEW_TOUR} />
      </div>

      <h1 className="font-display text-3xl font-semibold text-brand-dark">Lease Review</h1>

      <VerdictBanner
        fileName={analysis.fileName}
        total={clauses.length}
        counts={{ red: countOf("red"), amber: countOf("amber"), green: countOf("green"), grey: countOf("grey") }}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section
          data-tour="annotated-lease"
          aria-label="Annotated lease"
          className="min-w-0 overflow-hidden rounded-3xl border border-line bg-[#e7ecee]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
            <div className="flex items-center gap-1">
              <IconButton label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={18} />
              </IconButton>
              <span className="min-w-24 text-center text-sm font-semibold">
                Page {page} of {pageCount}
              </span>
              <IconButton label="Next page" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
                <ChevronRight size={18} />
              </IconButton>
            </div>

            <div className="flex items-center gap-1">
              <IconButton label="Zoom out" disabled={zoom <= 80} onClick={() => setZoom(zoom - 10)}>
                <Minus size={16} />
              </IconButton>
              <span className="w-12 text-center text-sm font-semibold">{zoom}%</span>
              <IconButton label="Zoom in" disabled={zoom >= 140} onClick={() => setZoom(zoom + 10)}>
                <Plus size={16} />
              </IconButton>
            </div>

            <button
              data-tour="download-report"
              onClick={handleDownload}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-semibold text-brand-dark transition hover:border-brand hover:bg-brand-soft"
            >
              <Download size={16} />
              Download report
            </button>
          </div>

          {downloadError && <p role="alert" className="border-b border-line bg-bad-bg px-4 py-2 text-sm text-bad">{downloadError}</p>}

          <div className="overflow-auto p-3 sm:p-8">
            <article
              className="mx-auto flex min-h-[560px] max-w-[680px] flex-col bg-white px-6 py-8 font-serif text-[#1d2a30] shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-8px_rgb(10_59_67/0.25)] sm:px-14 sm:py-12"
              style={{ fontSize: `${(15 * zoom) / 100}px`, lineHeight: 1.75 }}
            >
              <header className="mb-8 flex items-baseline justify-between border-b border-[#d9e0e3] pb-3 font-sans text-xs text-mute">
                <span>Residential Tenancy Agreement</span>
                <span className="truncate pl-4">{analysis.fileName}</span>
              </header>

              <div className="flex-1 space-y-6 pl-8 sm:pl-10">
                {clauses.length === 0 && (
                  <p className="italic text-mute">No clauses were found in this document.</p>
                )}
                {clauses.length > 0 && clausesOnPage.length === 0 && (
                  <p className="italic text-mute">This page continues the clause from the previous page.</p>
                )}

                {clausesOnPage.map((clause) => (
                  <LeaseClause
                    key={clause.id}
                    clause={clause}
                    isSelected={selected?.id === clause.id}
                    onSelect={() => selectClause(clause)}
                  />
                ))}
              </div>

              <footer className="mt-10 text-center font-sans text-xs text-mute">
                {page} / {pageCount}
              </footer>
            </article>
          </div>
        </section>

        <aside
          ref={panelRef}
          data-tour="clause-details"
          aria-label="Clause details"
          className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start"
        >
          {actionError && (
            <p role="alert" className="mb-3 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">{actionError}</p>
          )}
          {selected ? (
            <ClausePanel key={selected.id}
              clause={selected}
              issues={issues}
              detailed={detailed}
              onSelect={selectClause}
              onAsk={() => setShowChat(true)}
              onToggleReviewed={() => toggleReviewed(selected)}
            />
          ) : (
            <div className="rounded-3xl border border-line bg-white p-8 text-center text-mute">
              Select a clause in the lease to see what it means.
            </div>
          )}
        </aside>
      </div>

      {showChat && selected && (
        <ClauseChat key={selected.id} analysisId={analysis.id} clause={selected} onClose={() => setShowChat(false)} />
      )}

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-mute">
        <Info size={16} className="shrink-0" />
        ClauseGuard gives automated, informational analysis. It is not legal advice.
      </p>
    </div>
  );
}

function VerdictBanner({
  fileName,
  total,
  counts,
}: {
  fileName: string;
  total: number;
  counts: Record<Clause["status"], number>;
}) {
  const problems = counts.red + counts.amber;

  let headline = "No problems found in this lease";
  if (counts.red > 0) {
    headline = `${counts.red} ${counts.red === 1 ? "clause looks" : "clauses look"} unfair`;
  } else if (counts.amber > 0) {
    headline = `${counts.amber} ${counts.amber === 1 ? "clause is" : "clauses are"} worth checking`;
  }

  const subline =
    problems > 0
      ? `We checked ${total} clauses. Talk to your landlord about the highlighted ones before you sign.`
      : `We checked ${total} clauses. It's still worth reading the full lease before you sign.`;

  return (
    <section data-tour="verdict-banner" className="mt-4 rounded-3xl bg-brand-dark p-6 text-white sm:p-8">
      <p className="text-sm text-white/70">{fileName}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">{headline}</h1>
      <p className="mt-2 max-w-2xl text-white/80">{subline}</p>

      <div className="mt-6 flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden>
        {STATUS_ORDER.map(
          (s) =>
            counts[s] > 0 && (
              <div key={s} className={cn("rounded-full", STATUS[s].solid)} style={{ flexGrow: counts[s] }} />
            ),
        )}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {STATUS_ORDER.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn("size-2.5 rounded-full", STATUS[s].solid)} />
            <span className="font-semibold">{counts[s]}</span>
            <span className="text-white/75">{STATUS[s].label.toLowerCase()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}


function LeaseClause({
  clause,
  isSelected,
  onSelect,
}: {
  clause: Clause;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const style = STATUS[clause.status];

  return (
    <div className="relative">
      <span
        className={cn(
          "absolute -left-8 top-1 grid size-6 place-items-center rounded-full text-white sm:-left-10",
          style.solid,
        )}
      >
        <style.Icon size={14} />
      </span>

      <button
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`Clause ${clause.number}, ${clause.title}: ${style.label}`}
        className={cn(
          "-mx-2 block w-[calc(100%+1rem)] cursor-pointer rounded-md px-2 py-1 text-left transition-colors",
          isSelected ? "bg-brand-soft/70 outline-2 outline-brand" : "hover:bg-surface",
        )}
      >
        <span className="mb-1 flex items-center gap-2 font-bold">
          {clause.number}. {clause.title}
          {clause.reviewed && <Check size={15} className="text-ok" aria-label="Reviewed" />}
        </span>
        <span className={cn("box-decoration-clone px-0.5", style.mark)}>{clause.text}</span>
      </button>
    </div>
  );
}


function ClausePanel({
  clause,
  issues,
  detailed,
  onSelect,
  onAsk,
  onToggleReviewed,
}: {
  clause: Clause;
  issues: Clause[];
  detailed: boolean;
  onSelect: (clause: Clause) => void;
  onAsk: () => void;
  onToggleReviewed: () => void;
}) {
  const style = STATUS[clause.status];
  const issueIndex = issues.findIndex((c) => c.id === clause.id);
  const previousIssue = issueIndex > 0 ? issues[issueIndex - 1] : null;
  const nextIssue = issueIndex === -1 ? issues[0] : issues[issueIndex + 1];

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
      <div className={cn("px-6 pb-5 pt-6", style.soft)}>
        <p className={cn("flex items-center gap-2 text-sm font-semibold", style.text)}>
          <style.Icon size={17} />
          {style.label}
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-brand-dark">
          {clause.number}. {clause.title}
        </h2>
        {clause.confidence !== "high" && (
          <p className="mt-1 text-xs text-mute">
            ClauseGuard is {clause.confidence === "medium" ? "fairly" : "not very"} confident about this result — double-check it.
          </p>
        )}
      </div>

      <div className="max-h-[calc(100vh-17rem)] space-y-6 overflow-auto px-6 py-6">
        <blockquote className="border-l-2 border-line pl-4 font-serif italic text-mute">“{clause.text}”</blockquote>

        <div>
          <h3 className="font-semibold text-ink">What it means</h3>
          <p className="mt-1 leading-relaxed text-mute">{clause.explanation}</p>
        </div>

        {clause.reason && (
          <details open={detailed || clause.status === "red"} className="group rounded-2xl bg-brand-soft/70">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold text-brand-dark [&::-webkit-details-marker]:hidden">
              <ChevronDown size={18} className="shrink-0 -rotate-90 transition-transform group-open:rotate-0" />
              Why ClauseGuard flagged this
            </summary>
            <p className="px-4 pb-4 pl-10 leading-relaxed text-ink">{clause.reason}</p>
          </details>
        )}

        {clause.nextSteps.length > 0 && (
          <div>
            <h3 className="font-semibold text-ink">What you can do</h3>
            <ul className="mt-2 space-y-2">
              {clause.nextSteps.map((step) => (
                <li key={step} className="flex gap-3 rounded-xl bg-surface p-3 text-sm leading-relaxed">
                  <CircleCheck size={18} className="mt-0.5 shrink-0 text-brand" />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {clause.sources.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-ink">
              <BookOpen size={17} className="text-mute" />
              Sources
            </h3>
            <ul className="mt-2 space-y-2">
              {clause.sources.map((source, i) => (
                <li key={`${source.title}-${i}`} className="text-sm">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-start gap-1.5 font-medium text-brand hover:underline"
                    >
                      {source.title}
                      <ExternalLink size={14} className="mt-0.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="font-medium text-ink">{source.title}</span>
                  )}
                  {source.note && <span className="block text-mute">{source.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <button type="button" onClick={onAsk} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
            <MessageCircle size={16} aria-hidden />Ask a question about this clause
          </button>
          <button
            type="button"
            onClick={onToggleReviewed}
            aria-pressed={clause.reviewed}
            className={cn(
              "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
              clause.reviewed ? "border-ok-line bg-ok-bg text-ok" : "border-line bg-white text-brand-dark hover:bg-surface",
            )}
          >
            <Check size={16} aria-hidden />
            {clause.reviewed ? "Reviewed" : "Mark as reviewed"}
          </button>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          <button
            onClick={() => previousIssue && onSelect(previousIssue)}
            disabled={!previousIssue}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="text-sm text-mute">
            {issueIndex === -1 ? `${issues.length} issues` : `Issue ${issueIndex + 1} of ${issues.length}`}
          </span>
          <button
            onClick={() => nextIssue && onSelect(nextIssue)}
            disabled={!nextIssue}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-xl bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next issue
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}


function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 cursor-pointer place-items-center rounded-full text-brand-dark hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}