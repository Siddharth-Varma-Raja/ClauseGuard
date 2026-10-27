"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
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
                      <style.Icon size={18} aria-hidden />
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

      <div data-tour="clause-cards">
        <h3 className={cn("flex items-center gap-2 px-1 font-semibold", STATUS[active].text)}>
          {(() => {
            const Icon = STATUS[active].Icon;
            return <Icon size={18} aria-hidden />;
          })()}
          {STATUS[active].label} ({shown.length})
        </h3>

        <ul key={active} className="mt-3 grid gap-3 md:grid-cols-2">
          {shown.map((clause, i) => {
            const style = STATUS[clause.status];
            return (
              <li key={clause.id} className="animate-pop-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
                <button
                  type="button"
                  onClick={() => onOpenClause(clause)}
                  className={cn(
                    "group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-white p-4 pl-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand",
                  )}
                >
                  <span className={cn("absolute inset-y-0 left-0 w-1.5", style.solid)} aria-hidden />
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                      Page {clause.page}
                    </span>
                    <span className="text-xs font-medium text-mute">Clause {clause.number}</span>
                    {clause.reviewed && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok">
                        <Check size={12} aria-hidden />
                        Reviewed
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block font-semibold text-ink">{clause.title}</span>
                  <span className="mt-1 line-clamp-3 block flex-1 text-sm leading-relaxed text-mute">
                    {clause.explanation}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
