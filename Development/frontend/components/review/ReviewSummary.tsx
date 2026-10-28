"use client";

import { Fragment, useState, useSyncExternalStore, useRef, useEffect } from "react";
import { ArrowRight, Check, FileText, X, CircleCheck } from "lucide-react";
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
}: {
  analysis: Analysis;
  clauses: Clause[];
  onOpenClause: (clause: Clause) => void;
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

      <ClauseList key={active} status={active} clauses={shown} onOpenClause={onOpenClause} />
    </section>
  );
}

const ANIMATION = 450;


function ClauseList({
  status, clauses, onOpenClause,
}: {
  status: Status;
  clauses: Clause[];
  onOpenClause: (clause: Clause) => void;
}) {
  const columns = useIsTwoColumns() ? 2 : 1;
  const [openId, setOpenId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

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
  for (let i = 0; i < clauses.length; i += columns) {
    rows.push(clauses.slice(i, i + columns));
  }
  const style = STATUS[status];
  return (
    <div data-tour="clause-cards">
      <h3 className={cn("flex items-center gap-2 px-1 font-semibold", style.text)}>
        <style.Icon size={18} />
        {style.label}({clauses.length})
      </h3>
      <p className="mt-1 px-1 text-sm text-mute">
        Select <span className="font-semibold text-brand-dark">+</span> on a clause to read it here, without leaving
        this page.
      </p>

      <ul className="mt-3 grid gap-3">
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
                  open={Boolean(openHere)}
                  arrowLeft={columns === 2 ? (column === 0 ? "25%" : "75%") : "2.75rem"}
                  onClose={() => toggle(panelClause.id)}
                  onClosed={() => setClosingId((id) => (id === panelClause.id ? null : id))}
                  onOpenInLease={() => onOpenClause(panelClause)}
                />
              )}
            </Fragment>
          );
        })}
      </ul>
    </div>
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
  open,
  arrowLeft,
  onClose,
  onClosed,
  onOpenInLease,
}: {
  clause: Clause;
  open: boolean;
  arrowLeft?: string;
  onClose: () => void;
  onClosed?: () => void;
  onOpenInLease: () => void;
}) {
  const style = STATUS[clause.status];
  const ref = useRef<HTMLLIElement>(null);
  const [shown, setShown] = useState(false);
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

              <div className="space-y-3 md:pr-2">
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
              </div>

              <div
                className={cn(
                  "flex min-w-0 flex-col transition-all duration-500 ease-out motion-reduce:transition-none md:pt-9",
                  shown ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
                )}
                style={step(2)}
              >
                <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mute">
                  <FileText size={13} />
                  From your lease, page {clause.page}
                </h5>
                <div className="mt-1.5 max-h-72 overflow-auto rounded-2xl border border-line bg-white p-4 font-serif leading-relaxed text-[#1d2a30] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_20px_-10px_rgb(10_59_67/0.25)]">
                  <p className="mb-1 font-bold">
                    {clause.number}. {clause.title}
                  </p>
                  <p>
                    <span className={cn("box-decoration-clone px-0.5", style.mark)}>{clause.text}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenInLease}
                  className="mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 self-start rounded-xl border border-brand px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
                >
                  See it on page {clause.page} of the full lease
                  <ArrowRight size={15} />
                </button>
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