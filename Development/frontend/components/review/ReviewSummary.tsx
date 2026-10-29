"use client";

import { Fragment, useState, useSyncExternalStore, useRef, useEffect } from "react";
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Copy, FileText, X, MessageCircleQuestion } from "lucide-react";
import type { Analysis, Clause, Status } from "@/lib/notice-types";
import KeyLeaseDetails from "@/components/review/KeyLeaseDetails";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { cn } from "@/lib/cn";

const GROUP_HINT: Record<Status, string> = {
  red: "May be unfair or unlawful",
  amber: "Worth asking your landlord about",
  green: "No obvious issue found",
  grey: "General information",
};

export default function ReviewSummary({
  analysis,
  clauses,
  onOpenClause,
  onAskClause,
}: {
  analysis: Analysis;
  clauses: Clause[];
  onOpenClause: (clause: Clause) => void;
  onAskClause: (clause: Clause) => void;
}) {
  const countOf = (status: Status) => clauses.filter((c) => c.status === status).length;
  const [active, setActive] = useState<Status>(() => STATUS_ORDER.find((s) => countOf(s) > 0) ?? "red");

  const flagged = countOf("red") + countOf("amber");
  const shown = clauses.filter((c) => c.status === active);

  return (
    <section data-tour="review-summary" aria-label="Summary of your lease" className="mt-4 space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div data-tour="rating-tiles" className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
          <h2 className="font-display text-2xl font-semibold text-brand-dark">
            {flagged === 0
              ? "No clauses need your attention"
              : `${flagged} of ${clauses.length} clauses need your attention`}
          </h2>
          <p className="mt-1 text-mute">Choose a rating to see its clauses below.</p>

          <div role="tablist" aria-label="Ratings" className="mt-5 grid grid-cols-2 gap-3">
            {STATUS_ORDER.map((status) => {
              const style = STATUS[status];
              const count = countOf(status);
              const isActive = active === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  disabled={count === 0}
                  onClick={() => setActive(status)}
                  className={cn(
                    "relative cursor-pointer rounded-2xl border-2 p-4 text-left transition disabled:cursor-default disabled:opacity-50",
                    isActive ? cn(style.soft) : "border-line bg-white hover:-translate-y-0.5 hover:shadow-soft",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className={cn("grid size-9 place-items-center rounded-xl text-white", style.solid)}>
                      <style.Icon size={18} />
                    </span>
                    <span className="font-display text-3xl font-semibold text-ink">{count}</span>
                  </span>
                  <span className={cn("mt-3 block font-semibold", style.text)}>{style.label}</span>
                  <span className="mt-0.5 block text-xs text-mute">{GROUP_HINT[status]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <KeyLeaseDetails analysis={analysis} />
      </div>

      <ClauseList key={active} status={active} clauses={shown} allClauses={clauses} onOpenClause={onOpenClause} onAskClause={onAskClause} />
    </section>
  );
}

const ANIMATION = 450;


function ClauseList({
  status, clauses, allClauses, onOpenClause, onAskClause,
}: {
  status: Status;
  clauses: Clause[];
  allClauses: Clause[];
  onOpenClause: (clause: Clause) => void;
  onAskClause: (clause: Clause) => void;
}) {
  const columns = useIsTwoColumns() ? 2 : 1;
  const [openId, setOpenId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [perPage, setPerPage] = useState<number>(loadPerPage);
  const [page, setPage] = useState(1);
  const size = perPage === 0 ? clauses.length : perPage;
  const pageCount = Math.max(1, Math.ceil(clauses.length / size));
  const current = Math.min(page, pageCount);
  const first = (current - 1) * size;
  const visible = clauses.slice(first, first + size);

  function goToPage(next: number) {
    setPage(next);
    setOpenId(null);
    setClosingId(null);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changePerPage(next: number) {
    setPerPage(next);
    savePerPage(next);
    setPage(next === 0 ? 1 : Math.floor(first / next) + 1);
    setOpenId(null);
    setClosingId(null);
  }

  function toggle(id: string) {
    if (openId === id) {
      setClosingId(id);
      setOpenId(null);
    } else {
      setClosingId(openId);
      setOpenId(id);
    }
  }

  const rows: Clause[][] = [];
  for (let i = 0; i < visible.length; i += columns) {
    rows.push(visible.slice(i, i + columns));
  }
  const style = STATUS[status];
  return (
    <div ref={listRef} data-tour="clause-cards" className="scroll-mt-4">
      <h3 className={cn("flex items-center gap-2 px-1 font-semibold", style.text)}>
        <style.Icon size={18} />
        {style.label} ({clauses.length})
      </h3>
      <p className="mt-1 px-1 text-sm text-mute">
        Select <span className="font-semibold text-brand-dark">+</span> on a clause to read it here, without leaving
        this page.
      </p>

      {clauses.length > PER_PAGE_OPTIONS[0] && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-sm text-mute" aria-live="polite">
            Showing <strong className="font-semibold text-ink">{first + 1}–{first + visible.length}</strong> of{" "}
            <strong className="font-semibold text-ink">{clauses.length}</strong> clauses
          </p>
          <label className="flex items-center gap-2 text-sm text-mute">
            Show
            <select
              value={perPage}
              onChange={(e) => changePerPage(Number(e.target.value))}
              className="min-h-9 cursor-pointer rounded-xl border border-line bg-white px-3 font-semibold text-brand-dark shadow-soft hover:border-brand"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value={0}>All</option>
            </select>
            per page
          </label>
        </div>
      )}

      <ul key={`${current}-${perPage}`} className="mt-3 grid gap-3 md:grid-cols-2">
        {rows.map((row, r) => {
          const openHere = row.find((c) => c.id === openId);
          const closingHere = row.find((c) => c.id === closingId && c.id !== openId);
          const panelClause = openHere ?? closingHere;
          const column = panelClause ? row.indexOf(panelClause) : 0;
          return (
            <Fragment key={row[0].id}>
              {row.map((clause, i) => (
                <ClauseCard
                  key={clause.id}
                  clause={clause}
                  index={r * columns + i}
                  open={clause.id === openId}
                  onToggle={() => toggle(clause.id)}
                />
              ))}
              {panelClause && (
                <DetailsPanel
                  key={`panel-${r}`}
                  clause={panelClause}
                  allClauses={allClauses}
                  open={Boolean(openHere)}
                  arrowLeft={columns === 2 ? (column === 0 ? "25%" : "75%") : "2.75rem"}
                  onClose={() => toggle(panelClause.id)}
                  onClosed={() => setClosingId((id) => (id === panelClause.id ? null : id))}
                  onOpenInLease={() => onOpenClause(panelClause)}
                  onAsk={() => onAskClause(panelClause)}
                />
              )}
            </Fragment>
          );
        })}
      </ul>

      {pageCount > 1 && <Pagination page={current} pageCount={pageCount} onChange={goToPage} />}
    </div>
  );
}

const PER_PAGE_OPTIONS = [6, 10, 20];
const PER_PAGE_KEY = "clauseguard-clauses-per-page";

function loadPerPage(): number {
  try {
    const saved = localStorage.getItem(PER_PAGE_KEY);
    if (saved === "all") return 0;
    return PER_PAGE_OPTIONS.includes(Number(saved)) ? Number(saved) : 10;
  } catch {
    return 10;
  }
}

function savePerPage(value: number) {
    localStorage.setItem(PER_PAGE_KEY, value === 0 ? "all" : String(value));
}

function pageNumbers(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(page - 1, pageCount - 4));
  const end = Math.min(pageCount - 1, Math.max(page + 1, 5));
  const middle = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return [1, ...(start > 2 ? ["…" as const] : []), ...middle, ...(end < pageCount - 1 ? ["…" as const] : []), pageCount];
}

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const arrow =
    "inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full border border-line bg-white px-3 text-sm font-semibold text-brand-dark transition-colors hover:border-brand hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-white";

  return (
    <nav aria-label="Clause pages" className="mt-5 flex items-center justify-center gap-1.5 sm:gap-2">
      <button type="button" className={arrow} disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {pageNumbers(page, pageCount).map((n, i) =>
        n === "…" ? (
          <span key={`gap-${i}`} className="w-6 text-center text-mute">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Page ${n}`}
            aria-current={n === page ? "page" : undefined}
            className={cn(
              "grid size-10 cursor-pointer place-items-center rounded-full text-sm font-semibold transition-all duration-200",
              n === page ? "scale-105 bg-brand-dark text-white shadow-soft" : "text-brand-dark hover:bg-brand-soft",
            )}
          >
            {n}
          </button>
        ),
      )}

      <button type="button" className={arrow} disabled={page === pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
        <span className="hidden sm:inline">Next</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

function ClauseCard({
  clause,
  index,
  open,
  onToggle,
}: {
  clause: Clause;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const style = STATUS[clause.status];
  return (
    <li
      className="animate-pop-in"
      style={{ animationDelay: `${Math.min(index, 10) * 50}ms`, animationFillMode: "both" }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`clause-panel-${clause.id}`}
        className={cn(
          "group relative flex h-full w-full cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border bg-white p-4 pl-5 text-left shadow-soft transition-all duration-300",
          open ? "-translate-y-0.5 border-brand ring-2 ring-brand/15" : "border-line hover:-translate-y-0.5 hover:border-brand",
        )}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1.5", style.solid)} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
              Page {clause.page}
            </span>
            <span className="text-xs font-medium text-mute">Clause {clause.number}</span>
            {clause.reviewed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok">
                <Check size={12} />
                Reviewed
              </span>
            )}
          </span>
          <span className="mt-2 block font-semibold text-ink">{clause.title}</span>
          <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-mute">{clause.explanation}</span>
        </span>
        <PlusMinus open={open} />
        <span className="sr-only">{open ? "Close this clause" : "Read this clause"}</span>
      </button>
    </li>
  );
}

function PlusMinus({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        "relative grid size-8 shrink-0 place-items-center rounded-full border transition-all duration-300",
        open
          ? "rotate-180 border-brand bg-brand text-white"
          : "border-line bg-white text-brand-dark group-hover:border-brand group-hover:bg-brand-soft",
      )}
    >
      <span className="absolute h-0.5 w-3.5 rounded-full bg-current" />
      <span
        className={cn(
          "absolute h-3.5 w-0.5 rounded-full bg-current transition-transform duration-300",
          open ? "scale-y-0" : "scale-y-100",
        )}
      />
    </span>
  );
}

export function DetailsPanel({
  clause,
  allClauses,
  open,
  arrowLeft,
  onClose,
  onClosed,
  onOpenInLease,
  onAsk,
}: {
  clause: Clause;
  allClauses: Clause[];
  open: boolean;
  arrowLeft?: string;
  onClose: () => void;
  onClosed?: () => void;
  onOpenInLease: () => void;
  onAsk: () => void;
}) {
  const style = STATUS[clause.status];
  const ref = useRef<HTMLLIElement>(null);
  const [shown, setShown] = useState(false);
  const [fullText, setFullText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shownClauseId, setShownClauseId] = useState(clause.id);
  if (shownClauseId !== clause.id) {
    setShownClauseId(clause.id);
    setFullText(false);
    setCopied(false);
  }
  const at = allClauses.findIndex((c) => c.id === clause.id);
  const before = at > 0 ? allClauses[at - 1] : null;
  const after = at >= 0 && at < allClauses.length - 1 ? allClauses[at + 1] : null;

  const windowRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const box = windowRef.current;
    const current = currentRef.current;
    if (!box || !current) return;
    const observer = new ResizeObserver(() => {
      const tooTall = current.offsetHeight > box.clientHeight - 24;
      box.scrollTop = tooTall
        ? current.offsetTop - 12
        : current.offsetTop + current.offsetHeight / 2 - box.clientHeight / 2;
      setOverflows(tooTall);
    });
    observer.observe(box);
    observer.observe(current);
    return () => observer.disconnect();
  }, [clause.id, fullText]);
  const reference = `Clause ${clause.number}, page ${clause.page} – ${clause.title}`;

  async function copyReference() {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  }
  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(open));
    const timer = setTimeout(() => {
      if (open) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      else onClosedRef.current?.();
    }, ANIMATION);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [open]);

  const step = (n: number) => ({ transitionDelay: shown ? `${120 + n * 70}ms` : "0ms" });
  const fade = cn(
    "transition-all duration-300 ease-out motion-reduce:transition-none",
    shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
  );

  return (
    <li ref={ref} className="relative scroll-my-4 md:col-span-2">
      <span
        className={cn(
          "absolute -top-1.5 z-10 size-3.5 -translate-x-1/2 rotate-45 rounded-[3px] border-l border-t border-brand bg-white transition-all duration-300 motion-reduce:transition-none",
          shown ? "opacity-100" : "opacity-0",
        )}
        style={{ left: arrowLeft }}
      />

      <div
        className="grid transition-[grid-template-rows] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{ gridTemplateRows: shown ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <section
            id={`clause-panel-${clause.id}`}
            aria-label={`Clause ${clause.number}, ${clause.title}`}
            className={cn(
              "rounded-2xl border bg-white shadow-soft transition-colors duration-300",
              shown ? "border-brand" : "border-transparent",
            )}
          >
            <div key={clause.id} className="relative grid gap-4 p-4 pl-5 md:grid-cols-2 md:gap-6 md:p-5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                title="Close"
                className="absolute right-3 top-3 z-10 grid size-8 cursor-pointer place-items-center rounded-full text-mute transition-colors hover:bg-surface hover:text-ink"
              >
                <X size={17} />
              </button>

              <div className="flex flex-col gap-3 md:pr-2">
                <div className={fade} style={step(0)}>
                  <p className={cn("flex items-center gap-1.5 text-sm font-semibold", style.text)}>
                    <style.Icon size={15} />
                    {style.label}
                  </p>
                  <h4 className="mt-0.5 pr-10 font-display text-lg font-semibold text-brand-dark">
                    {clause.number}. {clause.title}
                  </h4>
                </div>

                <div className={fade} style={step(1)}>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-mute">What it means</h5>
                  <p className="mt-1 leading-relaxed text-ink">{clause.explanation}</p>
                </div>

                {clause.reason && (
                  <div className={cn(fade, "rounded-xl p-3", style.soft)} style={step(2)}>
                    <h5 className={cn("text-xs font-semibold uppercase tracking-wide", style.text)}>
                      {clause.status === "red" || clause.status === "amber" ? "Why it was flagged" : "Why it has this rating"}
                    </h5>
                    <p className="mt-1 text-sm leading-relaxed text-ink">{clause.reason}</p>
                  </div>
                )}

                {clause.nextSteps.length > 0 && (
                  <div className={fade} style={step(3)}>
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-mute">What you can do</h5>
                    <ul className="mt-1.5 space-y-1.5">
                      {clause.nextSteps.map((item) => (
                        <li key={item} className="flex gap-2 rounded-xl bg-surface px-3 py-2 text-sm leading-relaxed text-ink">
                          <CircleCheck size={16} className="mt-0.5 shrink-0 text-brand" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={cn(fade, "mt-auto flex flex-wrap gap-2 border-t border-line pt-4")} style={step(4)}>
                  <button
                    type="button"
                    onClick={onOpenInLease}
                    className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
                  >
                    See it on page {clause.page} of the full lease
                    <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={onAsk}
                    aria-label={`Ask ClauseGuard about clause ${clause.number}`}
                    title="Ask ClauseGuard about this clause"
                    className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-line bg-white text-brand-dark transition-colors hover:border-brand hover:bg-brand-soft"
                  >
                    <MessageCircleQuestion size={18} />
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  "flex min-w-0 flex-col transition-all duration-500 ease-out motion-reduce:transition-none md:pt-9",
                  !fullText && "md:h-0 md:min-h-full",
                  shown ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
                )}
                style={step(2)}
              >
                <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mute">
                  <FileText size={13} />
                  From your lease, page {clause.page}
                </h5>
                <div className="mt-1.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_20px_-10px_rgb(10_59_67/0.25)]">
                  <div className="relative min-h-0 flex-1">
                    <div
                      ref={windowRef}
                      className={cn(
                        "relative overflow-hidden px-4 font-serif leading-relaxed text-[#1d2a30]",
                        fullText ? "py-4" : "h-64 md:h-full",
                      )}
                    >
                      {!fullText && before && (
                        <div className="select-none pt-4 text-sm text-mute/70" aria-hidden>
                          <p className="mb-1 font-bold">
                            {before.number}. {before.title}
                          </p>
                          <p>{before.text}</p>
                        </div>
                      )}

                      <div ref={currentRef} className={cn("relative", !fullText && "py-4")}>
                        <span aria-hidden className={cn("absolute -left-4 bottom-4 top-4 w-1 rounded-r-full", style.solid)} />
                        <p className="mb-1 font-bold">
                          {clause.number}. {clause.title}
                        </p>
                        <p>
                          <span className={cn("box-decoration-clone px-0.5", style.mark)}>{clause.text}</span>
                        </p>
                      </div>

                      {!fullText && after && (
                        <div className="select-none pb-4 text-sm text-mute/70" aria-hidden>
                          <p className="mb-1 font-bold">
                            {after.number}. {after.title}
                          </p>
                          <p>{after.text}</p>
                        </div>
                      )}
                    </div>

                    {!fullText && (
                      <>
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
                      </>
                    )}
                  </div>
                  {(overflows || fullText) && (
                    <button
                      type="button"
                      onClick={() => setFullText(!fullText)}
                      aria-expanded={fullText}
                      className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-1 border-t border-line bg-surface/60 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
                    >
                      {fullText ? "Show less" : "Show full clause"}
                      <ChevronDown size={15} className={cn("transition-transform duration-300", fullText && "rotate-180")} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </li>
  );
}

function useIsTwoColumns() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(min-width: 768px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false,
  );
}