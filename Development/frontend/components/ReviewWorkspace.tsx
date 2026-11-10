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
  MessageCircleQuestion, Download, List, FileText, FlaskConical, Upload, GitCompare, History, Mail
} from "lucide-react";

import type { Analysis, Clause } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { cn } from "@/lib/cn";
import { errorMessage, getPreferences, setClauseReviewed } from "@/lib/api";
import AskClauseGuard from "@/components/lease/AskClauseGuard";
import PageTour from "@/components/PageTour";
import { REVIEW_LEASE_TOUR, REVIEW_TOUR, SAMPLE_TOUR } from "@/lib/tours";
import ReviewSummary from "@/components/review/ReviewSummary";
import { loadViewPreference, saveViewPreference, type ReviewView } from "@/lib/viewPreference";
import LeaseScrollBar from "./review/LeaseScrollBar";
import AddToEmailButton from "./review/AddToEmailButton";
import LandlordEmailPanel from "./review/LandlordEmailPanel";
import UploadVersionDialog from "./review/UploadVersionDialog";
import VersionSwitcher from "./review/VersionSwitcher";
import WhatChanged from "./review/WhatChanged";
import { fmtDate } from "@/lib/format";
import { loadRaised, saveRaised } from "@/lib/raisedClauses";
import { SAMPLE_ID, isSampleId } from "@/lib/sample-lease";
import { match } from "assert";

type WorkspaceView = ReviewView | "changes";

export default function ReviewWorkspace({ analysis }: { analysis: Analysis }) {
  const versions = analysis.versions ?? [];
  const latestVersion = versions[versions.length - 1];
  const isLatest = !latestVersion || latestVersion.id === analysis.id;
  const versionIndex = versions.findIndex((v) => v.id === analysis.id);
  const previousVersion = versionIndex > 0 ? versions[versionIndex - 1] : null;
  const currentVersion = versions[versionIndex];
  const [emailIds, setEmailIds] = useState<string[]>([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [raised, setRaised] = useState(() => loadRaised(analysis.id));
  const [clauses, setClauses] = useState<Clause[]>(analysis.clauses);
  const issues = [...clauses.filter((c) => c.status === "red"), ...clauses.filter((c) => c.status === "amber")];
  const firstClause = issues[0] ?? clauses[0];
  const [actionError, setActionError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatClause, setChatClause] = useState<Clause | null>(null);
  function askAbout(clause: Clause) {
    setChatClause(clause);
    setChatOpen(true);
  }
  const [wantedClause] = useState(() => {
    const wanted = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("clause");
    return clauses.find((c) => c.id === wanted) ?? null;
  });
  const initialClause = wantedClause ?? firstClause;
  const [view, setView] = useState<WorkspaceView>(() => {
    if (wantedClause) return "lease";
    const wanted = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("view");
    return wanted === "changes" && previousVersion ? "changes" : loadViewPreference();
  });
  const [selectedId, setSelectedId] = useState<string | null>(initialClause?.id ?? null);
  const [page, setPage] = useState(initialClause?.page ?? 1);
  const [zoom, setZoom] = useState(100);
  const [detailed, setDetailed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const leaseScrollRef = useRef<HTMLDivElement>(null);
  const centreNextScroll = useRef(false);
  const [jumps, setJumps] = useState(0);

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
  }, [view, raised]);

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
    if (!selectedId || view !== "lease") return;
    const block = centreNextScroll.current ? "center" : "nearest";
    centreNextScroll.current = false;
    document.getElementById(`clause-${selectedId}`)?.scrollIntoView({ behavior: "smooth", block });
  }, [selectedId, page, view, jumps]);

  function isOnScreen(id: string) {
    const element = document.getElementById(`clause-${id}`);
    const box = leaseScrollRef.current?.getBoundingClientRect();
    if (!element || !box) return false;
    const rect = element.getBoundingClientRect();
    return rect.top >= box.top && rect.bottom <= box.bottom;
  }

  function jumpTo(status: Clause["status"]) {
    const matching = clauses.filter((c) => c.status === status);
    if (matching.length === 0) return;
    const at = matching.findIndex((c) => c.id === selectedId);
    if (at >= 0 && !isOnScreen(matching[at].id)) {
      selectClause(matching[at]);
      return;
    }
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

  function changeView(next: WorkspaceView) {
    setView(next);
  }

  function openEmail(preset?: string[]) {
    const highRisk = clauses.filter((c) => c.status === "red").map((c) => c.id);
    setEmailIds(preset ?? (emailIds.length > 0 ? emailIds : highRisk));
    setEmailOpen(true);
  }

  function toggleEmail(clause: Clause) {
    setEmailIds((ids) => (ids.includes(clause.id) ? ids.filter((id) => id !== clause.id) : [...ids, clause.id]));
  }

  function markEmailSent(sent: Clause[]) {
    setRaised(saveRaised(analysis.id, sent));
    setEmailIds([]);
    setEmailOpen(false);
  }

  const canEmail = (clause: Clause) => isLatest && (clause.status === "red" || clause.status === "amber");

  function openInLease(clause: Clause) {
    centreNextScroll.current = true;
    changeView("lease");
    setSelectedId(clause.id);
    setPage(clause.page);
    requestAnimationFrame(() =>
      document.getElementById("lease-view")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function selectClause(clause: Clause) {
    setSelectedId(clause.id);
    setPage(clause.page);
    setJumps((n) => n + 1);
    if (window.innerWidth < 1024) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {isSampleId(analysis.id) && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#bfe0e2] bg-brand-soft px-4 py-3 text-sm text-brand-dark">
          <FlaskConical size={18} className="shrink-0 text-brand" />
          <p>
            <b className="font-semibold">Sample lease.</b> Explore freely, nothing here is saved.
          </p>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/dashboard" className="font-semibold underline underline-offset-4">
              Exit sample
            </Link>
            <Link href="/lease/new" data-tour="sample-own" className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 font-semibold text-white hover:bg-brand">
              <Upload size={15} />
              Check my own lease
            </Link>
          </div>
        </div>
      )}

      {!isLatest && latestVersion && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#bfe0e2] bg-brand-soft px-4 py-3 text-sm text-brand-dark">
          <History size={18} className="shrink-0 text-brand" />
          <p>
            <b className="font-semibold">You are viewing an older version.</b> Version {currentVersion?.version}, uploaded{" "}
            {fmtDate(analysis.createdAt.slice(0, 10))}. It's kept for your records.
          </p>
          <Link href={`/lease/${latestVersion.id}`} className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 font-semibold text-white hover:bg-brand">
            Go to latest version
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      )}

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
            {versions.length > 1 && <VersionSwitcher analysis={analysis} versions={versions} onUpload={() => setUploadOpen(true)} />}
          </div>
        </div>
        {isLatest && (
          <div className="flex flex-wrap items-center gap-2">
            {issues.length > 0 && (
              <button
                type="button"
                data-tour="email-landlord"
                onClick={() => openEmail()}
                className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-semibold text-brand-dark shadow-soft transition-colors hover:border-brand hover:bg-brand-soft"
              >
                <Mail size={15} aria-hidden />
                Email landlord
                {emailIds.length > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-brand-dark px-1.5 text-xs text-white">{emailIds.length}</span>
                )}
              </button>
            )}
            <button
              type="button"
              data-tour="upload-updated"
              onClick={() => setUploadOpen(true)}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-semibold text-brand-dark shadow-soft transition-colors hover:border-brand hover:bg-brand-soft"
            >
              <Upload size={15} aria-hidden />
              Upload updated lease
            </button>
          </div>
        )}
        {view === "summary" && analysis.id === SAMPLE_ID ? (
          <PageTour key="sample" tourId="sample" steps={SAMPLE_TOUR} />
        ) : view === "summary" ? (
          <PageTour key="summary" tourId="review" steps={REVIEW_TOUR} />
        ) : view === "lease" ? (
          <PageTour key="lease" tourId="review-lease" steps={REVIEW_LEASE_TOUR} />
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ViewSwitch view={view} onChange={changeView} showChanges={Boolean(previousVersion)} />
        <SummaryBar
          reportHref={`/lease/${analysis.id}/report`}
          counts={{ red: countOf("red"), amber: countOf("amber"), green: countOf("green"), grey: countOf("grey") }}
          activeStatus={selected?.status ?? null}
          issuesReviewed={issues.filter((c) => c.reviewed).length}
          issuesTotal={issues.length}
          showJump={view === "lease"}
          bare={view !== "lease"}
          onJump={(status) => {
            if (view !== "lease") changeView("lease");
            jumpTo(status);
          }}
        />
      </div>

      {raised && isLatest && view !== "changes" && (
        <div className="mt-4 flex animate-pop-in flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-soft">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ok-bg text-ok">
            <Mail size={17} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 basis-64">
            <b className="font-semibold text-ink">
              You raised {raised.clauses.length} {raised.clauses.length === 1 ? "clause" : "clauses"} with your landlord.
            </b>{" "}
            <span className="text-mute">When they send back a new copy, upload it here and we will show you what changed.</span>
          </p>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 font-semibold text-white hover:bg-brand-dark"
          >
            <Upload size={15} aria-hidden />
            Upload updated lease
          </button>
        </div>
      )}

      {view === "changes" && previousVersion && (
        <WhatChanged analysis={analysis} previousVersion={previousVersion} onOpenClause={openInLease} onEmail={openEmail} />
      )}

      {view === "summary" && (
        <ReviewSummary
          analysis={analysis}
          clauses={clauses}
          onOpenClause={openInLease}
          onAskClause={askAbout}
          emailIds={isLatest ? emailIds : undefined}
          onToggleEmail={isLatest ? toggleEmail : undefined}
        />
      )}

      {view === "lease" && (
        <div id="lease-view" ref={gridRef} className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_460px]">
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

            <div className="flex min-h-0 flex-1 gap-3 p-3 sm:p-6 sm:pr-3">
              <div className="min-h-0 min-w-0 flex-1 overflow-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden" id="lease-scroll" ref={leaseScrollRef}>
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
              <LeaseScrollBar
                scrollRef={leaseScrollRef}
                clauses={clausesOnPage}
                selectedId={selectedId}
                measureKey={`${page}-${zoom}-${clausesOnPage.map((c) => c.id + c.status).join()}`}
                onSelect={selectClause}
              />
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
                onAsk={() => askAbout(selected)}
                onToggleReviewed={() => toggleReviewed(selected)}
                inEmail={emailIds.includes(selected.id)}
                onToggleEmail={canEmail(selected) ? () => toggleEmail(selected) : undefined}
              />
            ) : (
              <div className="rounded-3xl border border-line bg-white p-8 text-center text-mute">
                Select a clause in the lease to see what it means.
              </div>
            )}
          </aside>
        </div>
      )}

      {emailOpen && (
        <LandlordEmailPanel
          analysis={{ ...analysis, clauses }}
          selectedIds={emailIds}
          onChangeSelected={setEmailIds}
          onClose={() => setEmailOpen(false)}
          onSent={markEmailSent}
        />
      )}

      {uploadOpen && (
        <UploadVersionDialog
          analysis={analysis}
          nextVersion={(latestVersion?.version ?? 1) + 1}
          onClose={() => setUploadOpen(false)}
        />
      )}

      <AskClauseGuard
        analysisId={analysis.id}
        open={chatOpen}
        reference={chatClause}
        onOpenChange={setChatOpen}
        onClearReference={() => setChatClause(null)}
      />

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
  showJump,
  bare,
  onJump,
}: {
  reportHref: string;
  counts: Record<Clause["status"], number>;
  activeStatus: Clause["status"] | null;
  issuesReviewed: number;
  issuesTotal: number;
  showJump: boolean;
  bare: boolean;
  onJump: (status: Clause["status"]) => void;
}) {
  const pct = issuesTotal ? Math.round((issuesReviewed / issuesTotal) * 100) : 100;

  return (
    <section
      data-tour="verdict-banner"
      aria-label="Lease summary"
      className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center"
    >
      {showJump && (
        <div className="flex min-w-0 flex-1 justify-center">
          <div
            role="group"
            aria-label="Jump to clauses by rating"
            className="inline-flex max-w-full flex-wrap justify-center gap-0.5 rounded-[1.6rem] border border-line bg-white p-1.5 shadow-soft"
          >
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onJump(s)}
                disabled={counts[s] === 0}
                title={counts[s] ? `Jump to the next “${STATUS[s].label.toLowerCase()}” clause` : undefined}
                aria-pressed={activeStatus === s}
                className={cn(
                  "inline-flex h-9 cursor-pointer font-semibold items-center gap-2 rounded-full px-3.5 text-sm transition-all duration-200 disabled:cursor-default disabled:opacity-45",
                  activeStatus === s
                    ? "bg-brand-dark text-white shadow-sm"
                    : "text-mute enabled:hover:bg-surface enabled:hover:text-ink",
                )}
              >
                <span className={cn("size-2 rounded-full", STATUS[s].solid, activeStatus === s && "ring-2 ring-white")} aria-hidden />
                <span className="font-semibold">{counts[s]}</span>
                {STATUS[s].label.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className={cn(
          "ml-auto flex shrink-0 items-center gap-4",
          !bare && "self-start rounded-full border border-line bg-white p-1.5 shadow-soft",
        )}
      >
        {issuesTotal > 0 && (
          <div className={cn("hidden items-center gap-2 md:flex", !bare && "pl-3")} title="Flagged clauses you have marked as reviewed">
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
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand-dark px-4 text-sm font-semibold text-white hover:bg-brand"
        >
          Full report
          <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function ViewSwitch({
  view,
  onChange,
  showChanges,
}: {
  view: WorkspaceView;
  onChange: (view: WorkspaceView) => void;
  showChanges: boolean;
}) {
  const options: { value: WorkspaceView; label: string; Icon: typeof List }[] = [
    { value: "summary", label: "Summary", Icon: List },
    { value: "lease", label: "Lease viewer", Icon: FileText },
    ...(showChanges ? [{ value: "changes" as const, label: "What changed", Icon: GitCompare }] : []),
  ];

  return (
    <div
      data-tour="view-switch"
      role="radiogroup"
      aria-label="How to show the lease"
      className="inline-flex max-w-full shrink-0 items-center gap-1 self-start overflow-x-auto rounded-full border border-line bg-white p-1.5 shadow-soft"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={view === value}
          onClick={() => onChange(value)}
          className={cn(
            "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors sm:px-4",
            view === value ? "bg-brand-dark text-white shadow-sm" : "text-brand-dark hover:bg-surface",
          )}
        >
          <Icon size={15} aria-hidden className={cn(showChanges && "hidden sm:block")} />
          {label}
        </button>
      ))}
    </div>
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
  inEmail,
  onToggleEmail,
}: {
  clause: Clause;
  issues: Clause[];
  detailed: boolean;
  onSelect: (clause: Clause) => void;
  onAsk: () => void;
  onToggleReviewed: () => void;
  inEmail: boolean;
  onToggleEmail?: () => void;
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
        <p className="mt-0.5 text-xs font-medium text-mute">
          Clause {clause.number}, page {clause.page} of the lease
        </p>
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

      <div className="flex shrink-0 flex-wrap gap-2 border-t border-line bg-white px-4 py-3">
        {onToggleEmail && <AddToEmailButton added={inEmail} onToggle={onToggleEmail} fullWidth />}
        <button
          type="button"
          onClick={onAsk}
          className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          <MessageCircleQuestion size={16} aria-hidden />Ask about this clause
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