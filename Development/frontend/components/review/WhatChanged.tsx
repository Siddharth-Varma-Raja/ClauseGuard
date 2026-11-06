"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, CircleCheck, GitCompare, Mail, Minus, Plus } from "lucide-react";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { errorMessage, getAnalysis } from "@/lib/api";
import { compareLeases, diffWords, type ChangeKind, type ClauseChange, type DiffPart } from "@/lib/compareLeases";
import { fmtDate } from "@/lib/format";
import type { Analysis, AnalysisVersion, Clause } from "@/lib/notice-types";
import { loadRaised } from "@/lib/raisedClauses";
import { STATUS } from "@/lib/status";
import { cn } from "@/lib/cn";

const KIND: Record<ChangeKind, { Icon: typeof Plus; chip: string; title: string; solid: string }> = {
  fixed: { Icon: CircleCheck, chip: "bg-ok-bg text-ok", title: "text-ok", solid: "bg-ok-solid" },
  better: { Icon: CircleCheck, chip: "bg-brand-soft text-brand-dark", title: "text-brand", solid: "bg-brand" },
  open: { Icon: Minus, chip: "bg-warn-bg text-warn", title: "text-warn", solid: "bg-warn-solid" },
  new: { Icon: Plus, chip: "bg-bad-bg text-bad", title: "text-bad", solid: "bg-bad-solid" },
  worse: { Icon: Plus, chip: "bg-bad-bg text-bad", title: "text-bad", solid: "bg-bad-solid" },
  changed: { Icon: Minus, chip: "bg-neu-bg text-neu", title: "text-neu", solid: "bg-neu-solid" },
};

type State =
  | { kind: "loading" }
  | { kind: "ready"; previous: Analysis }
  | { kind: "error"; message: string };

export default function WhatChanged({
  analysis,
  previousVersion,
  onOpenClause,
  onEmail,
}: {
  analysis: Analysis;
  previousVersion: AnalysisVersion;
  onOpenClause: (clause: Clause) => void;
  onEmail: (clauseIds: string[]) => void;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAnalysis(previousVersion.id)
      .then((previous) => {
        if (cancelled) return;
        setState(previous ? { kind: "ready", previous } : { kind: "error", message: "We couldn't find the earlier version." });
      })
      .catch((err) => !cancelled && setState({ kind: "error", message: errorMessage(err, "We couldn't load the earlier version.") }));
    return () => {
      cancelled = true;
    };
  }, [previousVersion.id, reloadKey]);

  if (state.kind === "loading") return <LoadingState label="Comparing your versions…" />;

  if (state.kind === "error") {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => {
          setState({ kind: "loading" });
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  const { previous } = state;
  const raised = loadRaised(previous.id);
  const { changes, unchanged } = compareLeases(previous, analysis, raised);
  const raisedChanges = changes.filter((c) => c.raised);
  const otherChanges = changes.filter((c) => !c.raised);
  const count = (...kinds: ChangeKind[]) => changes.filter((c) => kinds.includes(c.kind)).length;
  const fixedRaised = raisedChanges.filter((c) => c.kind === "fixed").length;

  const leftToRaise = changes
    .filter((c) => c.after && (c.after.status === "red" || c.after.status === "amber"))
    .map((c) => (c.after as Clause).id);

  const tiles: { label: string; hint: string; kind: ChangeKind; value: number }[] = [
    { label: "Fixed", hint: "Now within the rules, or removed", kind: "fixed", value: count("fixed") },
    { label: "Improved", hint: "Better, but worth another look", kind: "better", value: count("better") },
    { label: "No change", hint: "You raised it, nothing changed", kind: "open", value: count("open") },
    { label: "New or worse", hint: "New clauses, or riskier wording", kind: "new", value: count("new", "worse") },
  ];

  const heading = raisedChanges.length
    ? `${fixedRaised} of the ${raisedChanges.length} clauses you raised ${fixedRaised === 1 ? "was" : "were"} fixed`
    : changes.length
      ? `${changes.length} ${changes.length === 1 ? "clause" : "clauses"} changed`
      : "Nothing changed in this version";

  function list(items: ClauseChange[]) {
    return (
      <ul className="mt-3 space-y-3">
        {items.map((change) => (
          <ChangeRow
            key={change.key}
            change={change}
            previousVersion={previousVersion.version}
            currentVersion={analysis.version ?? previousVersion.version + 1}
            open={openKey === change.key}
            onToggle={() => setOpenKey(openKey === change.key ? null : change.key)}
            onOpenClause={onOpenClause}
          />
        ))}
      </ul>
    );
  }

  return (
    <section aria-label="What changed" className="mt-4 space-y-5">
      <div className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mute">
              <GitCompare size={14} className="shrink-0" aria-hidden />
              Version {previousVersion.version} ({fmtDate(previous.createdAt.slice(0, 10))}) to Version {analysis.version} ({fmtDate(analysis.createdAt.slice(0, 10))})
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-brand-dark">{heading}</h2>
            <p className="mt-1 text-mute">
              High Risk went from <b className="text-ink">{previous.counts.red}</b> to <b className="text-ink">{analysis.counts.red}</b>, and Medium Risk from{" "}
              <b className="text-ink">{previous.counts.amber}</b> to <b className="text-ink">{analysis.counts.amber}</b>.
            </p>
          </div>
          {leftToRaise.length > 0 && (
            <button
              type="button"
              onClick={() => onEmail(leftToRaise)}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <Mail size={16} aria-hidden />
              Email about what's left ({leftToRaise.length})
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const style = KIND[tile.kind];
            return (
              <div key={tile.label} className="rounded-2xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <span className={cn("grid size-9 place-items-center rounded-xl text-white", style.solid)}>
                    <style.Icon size={18} aria-hidden />
                  </span>
                  <span className="font-display text-3xl font-semibold text-ink">{tile.value}</span>
                </div>
                <p className={cn("mt-3 font-semibold", style.title)}>{tile.label}</p>
                <p className="mt-0.5 text-xs text-mute">{tile.hint}</p>
              </div>
            );
          })}
        </div>
      </div>

      {raisedChanges.length > 0 && (
        <div>
          <h3 className="px-1 font-semibold text-brand-dark">What you raised with your landlord ({raisedChanges.length})</h3>
          {list(raisedChanges)}
        </div>
      )}

      {otherChanges.length > 0 && (
        <div>
          <h3 className="px-1 font-semibold text-brand-dark">
            {raisedChanges.length > 0 ? "Other changes" : "Changes"} ({otherChanges.length})
          </h3>
          {list(otherChanges)}
        </div>
      )}

      <p className="flex items-center justify-center gap-2 text-center text-sm text-mute">
        <CircleCheck size={16} className="shrink-0 text-ok-solid" aria-hidden />
        {unchanged} other {unchanged === 1 ? "clause is" : "clauses are"} word for word the same.
      </p>
    </section>
  );
}

function RatingChip({ clause }: { clause: Clause | null }) {
  if (!clause) return <span className="rounded-full bg-neu-bg px-2 py-0.5 text-xs font-semibold text-neu">Not in lease</span>;
  const style = STATUS[clause.status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", style.soft, style.text)}>
      <style.Icon size={12} aria-hidden />
      {style.label}
    </span>
  );
}

function DiffText({ parts, tone }: { parts: DiffPart[]; tone: "removed" | "added" }) {
  return (
    <>
      {parts.map((part, i) =>
        !part.changed ? (
          <span key={i}>{part.text}</span>
        ) : tone === "removed" ? (
          <del key={i} className="rounded-sm bg-bad-bg text-bad">{part.text}</del>
        ) : (
          <ins key={i} className="rounded-sm bg-ok-bg text-ok no-underline">{part.text}</ins>
        ),
      )}
    </>
  );
}

function ChangeRow({
  change,
  previousVersion,
  currentVersion,
  open,
  onToggle,
  onOpenClause,
}: {
  change: ClauseChange;
  previousVersion: number;
  currentVersion: number;
  open: boolean;
  onToggle: () => void;
  onOpenClause: (clause: Clause) => void;
}) {
  const style = KIND[change.kind];
  const clause = change.after ?? change.before;
  const { before, after } = change;
  const diff = before && after ? diffWords(before.text, after.text) : null;
  if (!clause) return null;

  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 p-4 pl-5 text-left hover:bg-surface/50"
      >
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", style.chip)}>
          <style.Icon size={13} aria-hidden />
          {change.label}
        </span>
        <span className="min-w-40 flex-1 font-semibold text-ink">
          Clause {clause.number}. {clause.title}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <RatingChip clause={before} />
          <ArrowRight size={14} className="text-mute" aria-label="changed to" />
          <RatingChip clause={after} />
        </span>
        <ChevronDown size={18} className={cn("text-mute transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="animate-fade-up border-t border-line p-4 pl-5">
          <p className="leading-relaxed text-ink">{after ? after.explanation : "This clause isn't in the new version any more."}</p>
          {after?.reason && <p className="mt-1 text-sm leading-relaxed text-mute">{after.reason}</p>}

          {change.kind === "open" ? (
            <p className="mt-3 rounded-xl bg-warn-bg p-3 text-sm text-ink">You raised this clause, but the wording hasn't changed.</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-line p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-mute">Version {previousVersion}</p>
                <p className="mt-1.5 font-serif text-sm leading-relaxed text-[#1d2a30]">
                  {diff ? (
                    <DiffText parts={diff.before} tone="removed" />
                  ) : before ? (
                    <del className="rounded-sm bg-bad-bg text-bad">{before.text}</del>
                  ) : (
                    <span className="font-sans italic text-mute">Not in this version.</span>
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-mute">Version {currentVersion}</p>
                <p className="mt-1.5 font-serif text-sm leading-relaxed text-[#1d2a30]">
                  {diff ? (
                    <DiffText parts={diff.after} tone="added" />
                  ) : after ? (
                    <ins className="rounded-sm bg-ok-bg text-ok no-underline">{after.text}</ins>
                  ) : (
                    <span className="font-sans italic text-mute">Removed from this version.</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {after && (
            <button
              type="button"
              onClick={() => onOpenClause(after)}
              className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-line px-3.5 text-sm font-semibold text-brand-dark hover:border-brand hover:bg-brand-soft"
            >
              See it on page {after.page}
              <ArrowRight size={15} aria-hidden />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
