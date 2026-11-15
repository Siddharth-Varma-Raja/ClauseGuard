"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Check, ChevronDown, CircleCheck, FileSearch, Loader2, Mail } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { STATUS } from "@/lib/notice-status";
import { errorMessage, setClauseReviewed } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Clause } from "@/lib/notice-types";
import type { RaisedClauses } from "@/lib/raisedClauses";

const GROUPS = ["red", "amber"] as const;

const TEXT = {
    red: "text-bad",
    amber: "text-warn",
};

const OPEN_BORDER = {
    red: "border-2 border-bad-line",
    amber: "border-2 border-warn-line",
};

function clauseHeading(clause: Clause) {
    return clause.number && clause.number !== "0" ? `Clause ${clause.number}: ${clause.title}` : clause.title;
}

function FlaggedClause({
    analysisId,
    clause,
    open,
    reviewed,
    busy,
    printing,
    onToggle,
    onReview,
}: {
    analysisId: string;
    clause: Clause;
    printing: boolean;
    open: boolean;
    reviewed: boolean;
    busy: boolean;
    onToggle: () => void;
    onReview: () => void;
}) {
    const level = clause.status === "red" ? "red" : "amber";
    const Icon = STATUS[clause.status].Icon;

    return (
        <li className={cn("overflow-hidden rounded-2xl bg-white", open ? OPEN_BORDER[level] : "border border-line")}>
            <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left">
                <Icon size={24} className={cn("shrink-0", TEXT[level])} aria-hidden />
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-bold text-ink">
                        {clauseHeading(clause)}
                        {reviewed && <Check size={16} className="shrink-0 text-ok" aria-label="Reviewed" />}
                    </span>
                    <span className="mt-0.5 block text-mute">{clause.explanation}</span>
                </span>
                <span className="hidden shrink-0 print:block">
                    <StatusBadge status={clause.status} size="sm" />
                </span>
                <span className="hidden shrink-0 text-sm text-mute sm:block"><span className="print:hidden">Page</span><span className="hidden print:inline">Lease page</span> {clause.page}</span>
                <ChevronDown size={18} className={cn("shrink-0 text-mute transition-transform print:hidden", open && "rotate-180")} />
            </button>

            {open && (
                <div className="border-t border-line px-5 pb-5 sm:pl-[3.75rem]">
                    {clause.reason && (
                        <>
                            <h3 className="mt-4 font-bold text-brand-dark">Why it matters</h3>
                            <p className="mt-1 leading-relaxed text-ink">{clause.reason}</p>
                        </>
                    )}

                    {clause.nextSteps.length > 0 && (
                        <>
                            <h3 className="mt-4 font-bold text-brand-dark">What to ask for</h3>
                            <ul className="mt-2 space-y-2">
                                {clause.nextSteps.map((step) => (
                                    <li key={step} className="flex gap-2.5 leading-relaxed text-ink">
                                        <CircleCheck size={18} className="mt-0.5 shrink-0 text-brand" />
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    <details open={printing} className="group mt-4">
                        <summary className="cursor-pointer font-semibold text-brand hover:underline print:hidden">Show the exact wording</summary>
                        <blockquote className={cn("mt-2 border-l-4 pl-4 font-display italic leading-relaxed text-ink", level === "red" ? "border-bad-solid" : "border-warn-solid")}>
                            “{clause.text}”
                        </blockquote>
                        {clause.sources.length > 0 && (
                            <p className="mt-3 flex items-start gap-2 text-sm text-mute">
                                <BookOpen size={16} className="mt-0.5 shrink-0" />
                                Based on {clause.sources.map((source) => source.title).join(", ")}
                            </p>
                        )}
                    </details>

                    <div className="mt-5 flex flex-wrap gap-3 print:hidden">
                        <Link
                            href={`/lease/${analysisId}?clause=${encodeURIComponent(clause.id)}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-soft px-4 font-semibold text-brand-dark hover:bg-brand hover:text-white"
                        >
                            <FileSearch size={17} /> See it in my lease
                        </Link>
                        <button
                            type="button"
                            onClick={onReview}
                            disabled={busy}
                            className={cn(
                                "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 font-semibold disabled:opacity-60",
                                reviewed ? "border-ok-line bg-ok-bg text-ok" : "border-line bg-white text-brand-dark hover:border-brand",
                            )}
                        >
                            {busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                            {reviewed ? "Reviewed" : "Mark as reviewed"}
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
}

export default function FlaggedClauses({
    analysisId,
    clauses,
    printing,
    raised,
    onEmail,
}: {
    analysisId: string;
    clauses: Clause[];
    printing: boolean;
    raised: RaisedClauses | null;
    onEmail: () => void;
}) {
    const flagged = GROUPS.flatMap((status) => clauses.filter((c) => c.status === status).sort((a, b) => a.page - b.page));

    const [openId, setOpenId] = useState<string | null>(null);
    const [reviewed, setReviewed] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(flagged.map((c) => [c.id, c.reviewed])),
    );
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState("");

    if (flagged.length === 0) return null;

    const done = flagged.filter((c) => reviewed[c.id]).length;

    async function toggleReviewed(clause: Clause) {
        const next = !reviewed[clause.id];
        setReviewed((prev) => ({ ...prev, [clause.id]: next }));
        setBusyId(clause.id);
        setError("");
        try {
            await setClauseReviewed(analysisId, clause.id, next);
        } catch (err) {
            setReviewed((prev) => ({ ...prev, [clause.id]: !next }));
            setError(errorMessage(err, "We couldn't save that. Try again."));
        } finally {
            setBusyId(null);
        }
    }

    return (
        <section id="clauses" className="mt-10 scroll-mt-24">
            <h2 className="font-display text-2xl font-semibold text-brand-dark">What to ask your landlord about</h2>
            <p className="mt-1 text-mute print:hidden">
                Tap a clause to see why it matters and what to ask for.{done > 0 && ` You've reviewed ${done} of ${flagged.length}.`}
            </p>

            {error && <p className="mt-3 text-sm font-semibold text-bad print:hidden">{error}</p>}

            {GROUPS.map((status) => {
                const group = flagged.filter((c) => c.status === status);
                if (group.length === 0) return null;
                const Icon = STATUS[status].Icon;
                return (
                    <div key={status} className="mt-5">
                        <p className="flex items-center gap-2 text-sm font-bold text-mute">
                            <Icon size={16} className={TEXT[status]} aria-hidden />
                            {STATUS[status].label} · {group.length}
                        </p>
                        <ul className="mt-2 space-y-3">
                            {group.map((clause) => (
                                <FlaggedClause
                                    key={clause.id}
                                    analysisId={analysisId}
                                    clause={clause}
                                    open={printing || openId === clause.id}
                                    reviewed={reviewed[clause.id]}
                                    busy={busyId === clause.id}
                                    printing={printing}
                                    onToggle={() => setOpenId(openId === clause.id ? null : clause.id)}
                                    onReview={() => toggleReviewed(clause)}
                                />
                            ))}
                        </ul>
                    </div>
                );
            })}

            <button
                type="button"
                onClick={onEmail}
                className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-brand hover:underline print:hidden"
            >
                <Mail size={17} /> {raised ? "Write another email to your landlord" : "Write an email to your landlord about these"}
            </button>
        </section>
    );
}