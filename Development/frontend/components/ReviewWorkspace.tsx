"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
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

import { overallStatus, STATUS as RISK } from "@/lib/notice-status";
import type { Analysis, Clause } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { cn } from "@/lib/cn";
import { errorMessage, getPreferences, setClauseReviewed } from "@/lib/api";
import ClauseChat from "@/components/lease/ClauseChat";
import PageTour from "@/components/PageTour";
import { REVIEW_TOUR } from "@/lib/tours";

export default function ReviewWorkspace({ analysis }: { analysis: Analysis }) {
  const [clauses, setClauses] = useState<Clause[]>(analysis.clauses);
  const issues = [...clauses.filter((c) => c.status === "red"), ...clauses.filter((c) => c.status === "amber")];
  const firstClause = issues[0] ?? clauses[0];
  const [actionError, setActionError] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [initialClause] = useState(() => {
    const wanted = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("clause");
    return clauses.find((c) => c.id === wanted) ?? firstClause;
  });
  const [selectedId, setSelectedId] = useState<string | null>(initialClause?.id ?? null);
  const [page, setPage] = useState(initialClause?.page ?? 1);
  const [zoom, setZoom] = useState(100);
  const [detailed, setDetailed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const MIN_HEIGHT = 360;
    function fit() {
      if (!grid) return;
      if (window.innerWidth < 1024) {
        grid.style.height = "";
        return;
      }
      grid.style.height = `${MIN_HEIGHT}px`;
      const top = grid.getBoundingClientRect().top + window.scrollY;
      const root = grid.parentElement;
      let below = root ? root.getBoundingClientRect().bottom - grid.getBoundingClientRect().bottom : 0;
      for (let el = root?.parentElement; el && el !== document.documentElement; el = el.parentElement) {
        const style = getComputedStyle(el);
        below += parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth);
      }
      grid.style.height = `${Math.max(MIN_HEIGHT, Math.floor(window.innerHeight - top - below))}px`;
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const selected = clauses.find((c) => c.id === selectedId) ?? null;
  const pageCount = Math.max(analysis.pageCount || 1, ...clauses.map((c) => c.page || 1));
  const clausesOnPage = clauses.filter((c) => c.page === page);
  const countOf = (status: Clause["status"]) => clauses.filter((c) => c.status === status).length;

  useEffect(() => {
    getPreferences()
      .then((prefs) => setDetailed(prefs.explanationDetail === "detailed"))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`clause-${selectedId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId, page]);

  function jumpTo(status: Clause["status"]) {
    const matching = clauses.filter((c) => c.status === status);
    if (matching.length === 0) return;
    const at = matching.findIndex((c) => c.id === selectedId);
    selectClause(matching[(at + 1) % matching.length]);
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/lease"
            aria-label="Back to my leases"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-brand-dark hover:bg-brand-soft"
          >
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-mute">Lease review</p>
            <h1 className="truncate font-display text-xl font-semibold text-brand-dark">{analysis.fileName}</h1>
          </div>
        </div>
        <PageTour tourId="review" steps={REVIEW_TOUR} />
      </div>

      <SummaryBar
        reportHref={`/lease/${analysis.id}/report`}
        counts={{ red: countOf("red"), amber: countOf("amber"), green: countOf("green"), grey: countOf("grey") }}
        activeStatus={selected?.status ?? null}
        issuesReviewed={issues.filter((c) => c.reviewed).length}
        issuesTotal={issues.length}
        onJump={jumpTo}
      />

      <div ref={gridRef} className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_460px]">
        <section
          data-tour="annotated-lease"
          aria-label="Annotated lease"
          className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-line bg-[#e7ecee]"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-2">
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

          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
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
          className="flex min-h-0 scroll-mt-6 flex-col lg:overflow-hidden"
        >
          {actionError && (
            <p role="alert" className="mb-3 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">{actionError}</p>
          )}
          {selected ? (
            <ClausePanel
              key={selected.id}
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

      <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-mute">
        <Info size={16} className="shrink-0" />
        ClauseGuard gives automated, informational analysis. It is not legal advice.
      </p>
    </div>
  );
}

function SummaryBar({
  reportHref,
  counts,
  activeStatus,
  issuesReviewed,
  issuesTotal,
  onJump,
}: {
  reportHref: string;
  counts: Record<Clause["status"], number>;
  activeStatus: Clause["status"] | null;
  issuesReviewed: number;
  issuesTotal: number;
  onJump: (status: Clause["status"]) => void;
}) {
  const verdict = overallStatus(counts);
  const VerdictIcon = RISK[verdict.status].Icon;
  const total = counts.red + counts.amber + counts.green + counts.grey;
  const pct = issuesTotal ? Math.round((issuesReviewed / issuesTotal) * 100) : 100;

  return (
    <section
      data-tour="verdict-banner"
      aria-label="Lease summary"
      className="mt-3 overflow-hidden rounded-2xl border border-line bg-white/95 shadow-soft backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4">
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold", RISK[verdict.status].badge)}>
          <VerdictIcon size={15} aria-hidden />
          {verdict.label}
        </span>

        <div role="group" aria-label="Jump to clauses by rating" className="flex flex-wrap items-center gap-1.5">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onJump(s)}
              disabled={counts[s] === 0}
              title={counts[s] ? `Jump to the next “${STATUS[s].label.toLowerCase()}” clause` : undefined}
              aria-pressed={activeStatus === s}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-40",
                activeStatus === s ? "border-brand-dark bg-brand-dark text-white" : cn("border-line bg-white text-ink", STATUS[s].hover),
              )}
            >
              <span className={cn("size-2 rounded-full", STATUS[s].solid)} aria-hidden />
              <span className="font-semibold">{counts[s]}</span>
              {STATUS[s].label.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          {issuesTotal > 0 && (
            <div className="hidden items-center gap-2 md:flex" title="Flagged clauses you have marked as reviewed">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="whitespace-nowrap text-xs text-mute">
                <strong className="text-ink">{issuesReviewed}</strong>/{issuesTotal} reviewed
              </span>
            </div>
          )}
          <Link
            href={reportHref}
            data-tour="view-full-report"
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-brand-dark px-3.5 text-sm font-semibold text-white hover:bg-brand"
          >
            <Download size={15} aria-hidden />
            Full report
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </div>

      {total > 0 && (
        <div className="flex h-1" aria-hidden>
          {STATUS_ORDER.map((s) => counts[s] > 0 && <div key={s} className={STATUS[s].solid} style={{ flexGrow: counts[s] }} />)}
        </div>
      )}
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
    <div id={`clause-${clause.id}`} className="relative scroll-my-6">
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

  const issueLabel = issueIndex === -1 ? `${issues.length} issues` : `Issue ${issueIndex + 1} of ${issues.length}`;

  return (
    <div className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
      <div className={cn("shrink-0 px-5 pb-3 pt-3", style.soft)}>
        <div className="flex items-center justify-between gap-2">
          <p className={cn("flex items-center gap-1.5 text-sm font-semibold", style.text)}>
            <style.Icon size={16} />
            {style.label}
          </p>
          {issues.length > 0 && (
            <div className="flex items-center gap-0.5" aria-label="Flagged clauses">
              <button
                type="button"
                onClick={() => previousIssue && onSelect(previousIssue)}
                disabled={!previousIssue}
                aria-label="Previous issue"
                title="Previous issue"
                className="grid size-8 cursor-pointer place-items-center rounded-full text-brand-dark hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="min-w-[5.5rem] text-center text-xs font-medium text-mute">{issueLabel}</span>
              <button
                type="button"
                onClick={() => nextIssue && onSelect(nextIssue)}
                disabled={!nextIssue}
                aria-label="Next issue"
                title="Next issue"
                className="grid size-8 cursor-pointer place-items-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          )}
        </div>
        <h2 className="mt-1 line-clamp-2 font-display text-lg font-semibold leading-snug text-brand-dark" title={clause.title}>
          {clause.number}. {clause.title}
        </h2>
        {clause.confidence !== "high" && (
          <p className="mt-0.5 text-xs text-mute">
            ClauseGuard is {clause.confidence === "medium" ? "fairly" : "not very"} confident about this result — double-check it.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-auto px-5 py-4 text-[15px]">
        <blockquote className="border-l-2 border-line pl-4 font-serif italic text-mute lg:hidden">“{clause.text}”</blockquote>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">What it means</h3>
          <p className="mt-1.5 leading-relaxed text-ink">{clause.explanation}</p>
        </div>

        {clause.reason && (
          <details open={detailed || clause.status === "red"} className="group rounded-2xl bg-brand-soft/70">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-brand-dark [&::-webkit-details-marker]:hidden">
              <ChevronDown size={18} className="shrink-0 -rotate-90 transition-transform group-open:rotate-0" />
              Why ClauseGuard flagged this
            </summary>
            <p className="px-4 pb-4 pl-10 leading-relaxed text-ink">{clause.reason}</p>
          </details>
        )}

        {clause.nextSteps.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">What you can do</h3>
            <ul className="mt-2 space-y-2">
              {clause.nextSteps.map((step) => (
                <li key={step} className="flex gap-2.5 rounded-xl bg-surface px-3 py-2.5 leading-relaxed text-ink">
                  <CircleCheck size={18} className="mt-0.5 shrink-0 text-brand" />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {clause.sources.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-mute">
              <BookOpen size={15} />
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
      </div>

      <div className="flex shrink-0 gap-2 border-t border-line bg-white px-4 py-3">
        <button
          type="button"
          onClick={onAsk}
          disabled={true}
          className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          <MessageCircle size={16} aria-hidden />Ask about this clause
        </button>
        <button
          type="button"
          onClick={onToggleReviewed}
          aria-pressed={clause.reviewed}
          className={cn(
            "flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors",
            clause.reviewed ? "border-ok-line bg-ok-bg text-ok" : "border-line bg-white text-brand-dark hover:bg-surface",
          )}
        >
          <Check size={16} aria-hidden />
          {clause.reviewed ? "Reviewed" : "Mark reviewed"}
        </button>
      </div>
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