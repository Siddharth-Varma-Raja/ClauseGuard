"use client";

import { useState } from "react";
import { ArrowRight, ChevronRight, CircleCheck, House } from "lucide-react";
import type { Analysis, Clause, Status } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { plural, verdictOf } from "@/components/report/shared";
import { cn } from "@/lib/cn";
import ClauseSheet from "./ClauseSheet";
import CountUp from "@/components/dashboard/CountUp";

const TILE: Record<Status, { on: string; ring: string }> = {
    red: { on: "border-bad-solid bg-bad-bg", ring: "focus-visible:ring-bad-solid" },
    amber: { on: "border-warn-solid bg-warn-bg", ring: "focus-visible:ring-warn-solid" },
    green: { on: "border-ok-solid bg-ok-bg", ring: "focus-visible:ring-ok-solid" },
    grey: { on: "border-neu-solid bg-neu-bg", ring: "focus-visible:ring-neu-solid" },
};

export default function MobileSummary({
    analysis,
    clauses,
    onOpenClause,
    onAskClause,
    emailIds = [],
    onToggleEmail,
    onToggleReviewed,
}: {
    analysis: Analysis;
    clauses: Clause[];
    onOpenClause: (clause: Clause) => void;
    onAskClause: (clause: Clause) => void;
    emailIds?: string[];
    onToggleEmail?: (clause: Clause) => void;
    onToggleReviewed?: (clause: Clause) => void;
}) {
    const [openId, setOpenId] = useState<string | null>(null);

    const red = clauses.filter((c) => c.status === "red");
    const amber = clauses.filter((c) => c.status === "amber");
    const issues = [...red, ...amber];
    const done = issues.filter((c) => c.reviewed).length;
    const nextIndex = Math.max(0, issues.findIndex((c) => !c.reviewed));
    const counts = { red: red.length, amber: amber.length, green: clauses.filter((c) => c.status === "green").length, grey: clauses.filter((c) => c.status === "grey").length };
    const { level, verdict } = verdictOf(counts, clauses.length);
    const [group, setGroup] = useState<Status>(STATUS_ORDER.find((key) => counts[key] > 0) ?? "green");

    const open = clauses.find((c) => c.id === openId) ?? null;
    const at = open ? issues.findIndex((c) => c.id === open.id) : -1;
    const isIssue = at >= 0;
    const list = clauses.filter((c) => c.status === group);
    const LevelIcon = STATUS[level].Icon;

    const line =
        red.length > 0
            ? `${red.length} ${plural(red.length, "clause", "clauses")} may be unfair or unlawful. Fix ${plural(red.length, "it", "them")} before you sign.`
            : amber.length > 0
                ? `Ask your landlord about ${amber.length} ${plural(amber.length, "clause", "clauses")} before you sign.`
                : `We checked all ${clauses.length} clauses. Nothing to raise.`;

    return (
        <section aria-label="Summary of your lease" className="mt-4 grid gap-4 md:hidden">
            <div data-tour="rating-tiles" className={cn("animate-fade-up rounded-3xl border border-t-4 border-line bg-white p-5 shadow-soft", STATUS[level].border)}>
                <span className={cn("inline-flex animate-pop-in items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold [animation-delay:200ms]", STATUS[level].soft, STATUS[level].text)}>
                    <LevelIcon size={14} aria-hidden />
                    {STATUS[level].label} overall
                </span>
                <p className="mt-3 text-sm text-mute">Should you sign?</p>
                <p className="mt-0.5 font-display text-[26px] font-semibold leading-tight text-brand-dark">{verdict}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">{line}</p>

                {issues.length > 0 && (
                    <>
                        <p className="mt-5 flex justify-between text-sm text-mute">
                            Issues checked
                            <span>
                                <b className="font-semibold text-ink">{done}</b> of {issues.length}
                            </span>
                        </p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" aria-hidden>
                            <div className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${(done / issues.length) * 100}%` }} />
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpenId(issues[done === issues.length ? 0 : nextIndex].id)}
                            className="group mt-4 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-dark font-semibold text-white transition-transform hover:bg-brand active:scale-[0.97] motion-reduce:transition-none"
                        >
                            {done === 0 ? `Check issue 1 of ${issues.length}` : done === issues.length ? "Look at them again" : `Continue with issue ${nextIndex + 1}`}
                            <ArrowRight size={18} aria-hidden className="transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-1" />
                        </button>
                    </>
                )}
            </div>

            <div data-tour="clause-cards" className="animate-fade-up rounded-3xl border border-line bg-white p-4 shadow-soft [animation-delay:120ms]">
                <h2 className="px-1 font-semibold text-ink">Clauses by risk</h2>
                <p className="px-1 text-sm text-mute">Tap a colour to see its clauses.</p>
                <div role="tablist" aria-label="Clauses by risk" className="mt-3 grid grid-cols-2 gap-2.5">
                    {STATUS_ORDER.map((key, index) => {
                        const Icon = STATUS[key].Icon;
                        const selected = group === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                aria-controls="risk-panel"
                                disabled={counts[key] === 0}
                                onClick={() => setGroup(key)}
                                style={{ animationDelay: `${200 + index * 70}ms` }}
                                className={cn(
                                    "flex min-h-[92px] animate-fade-up cursor-pointer flex-col rounded-2xl border-2 p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.96] disabled:cursor-default disabled:opacity-45 motion-reduce:transition-none",
                                    TILE[key].ring,
                                    selected ? cn(TILE[key].on, "shadow-soft") : "border-line bg-white",
                                )}
                            >
                                <span className="flex items-center justify-between">
                                    <Icon size={20} className={STATUS[key].text} aria-hidden />
                                    <span className="font-display text-[26px] font-semibold tabular-nums leading-none text-ink"><CountUp value={counts[key]} duration={800} /></span>
                                </span>
                                <span className={cn("mt-auto pt-2 text-sm font-semibold", STATUS[key].text)}>{STATUS[key].label}</span>
                            </button>
                        );
                    })}
                </div>

                <div id="risk-panel" role="tabpanel" key={group} className="mt-4 animate-fade-up">
                    {group !== "grey" && (
                        <p className="px-1 text-sm text-mute">
                            <b className={cn("font-semibold", STATUS[group].text)}>
                                {list.length} {STATUS[group].label} {plural(list.length, "clause", "clauses")}
                            </b>{" "}
                            – {STATUS[group].hint}
                        </p>
                    )}
                    {group === "grey" ? (
                        <GeneralClauses clauses={list} onSeeInLease={() => list[0] && onOpenClause(list[0])} />
                    ) : (
                        <Rows clauses={list} emailIds={emailIds} onOpen={setOpenId} />
                    )}
                </div>
            </div>

            <div className="animate-fade-up rounded-3xl border border-line bg-white p-4 shadow-soft [animation-delay:200ms]">
                <h2 className="flex items-center gap-2 px-1 font-semibold text-ink">
                    <House size={18} className="text-brand" aria-hidden />
                    Key lease details
                </h2>
                <KeyFacts analysis={analysis} />
            </div>

            <ClauseSheet
                clause={open}
                onClose={() => setOpenId(null)}
                position={
                    isIssue
                        ? {
                            index: at,
                            total: issues.length,
                            onPrev: at > 0 ? () => setOpenId(issues[at - 1].id) : undefined,
                            onNext: at < issues.length - 1 ? () => setOpenId(issues[at + 1].id) : undefined,
                        }
                        : undefined
                }
                reviewed={open && isIssue && onToggleReviewed ? { value: open.reviewed, onToggle: () => onToggleReviewed(open) } : undefined}
                email={open && isIssue && onToggleEmail ? { added: emailIds.includes(open.id), onToggle: () => onToggleEmail(open) } : undefined}
                onSeeInLease={
                    open
                        ? () => {
                            setOpenId(null);
                            onOpenClause(open);
                        }
                        : undefined
                }
                onAsk={
                    open
                        ? () => {
                            setOpenId(null);
                            onAskClause(open);
                        }
                        : undefined
                }
            />
        </section>
    );
}

function GeneralClauses({ clauses, onSeeInLease }: { clauses: Clause[]; onSeeInLease: () => void }) {
    const titles = clauses.reduce<Record<string, number>>((all, clause) => {
        all[clause.title] = (all[clause.title] ?? 0) + 1;
        return all;
    }, {});

    return (
        <div className="rounded-2xl border border-line p-4">
            <p className="flex items-start gap-2 text-[15px] leading-relaxed text-ink">
                <CircleCheck size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                These {clauses.length} {plural(clauses.length, "clause is", "clauses are")} standard wording. You don’t need to do anything.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
                {Object.entries(titles).map(([title, count], index) => (
                    <li key={title} style={{ animationDelay: `${index * 60}ms` }} className="animate-pop-in rounded-full bg-surface px-3 py-1 text-sm text-ink">
                        {title}
                        {count > 1 && <span className="ml-1 font-semibold text-mute">× {count}</span>}
                    </li>
                ))}
            </ul>
            <button type="button" onClick={onSeeInLease} className="group mt-4 inline-flex min-h-[45px] cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-dark underline underline-offset-4">
                See them in the lease
                <ArrowRight size={16} aria-hidden className="transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-1" />
            </button>
        </div>
    );
}

function Rows({ clauses, emailIds, onOpen }: { clauses: Clause[]; emailIds: string[]; onOpen: (id: string) => void }) {
    return (
        <ul className="row-in mt-3 overflow-hidden rounded-2xl border border-line">
            {clauses.map((clause) => {
                const notes = [clause.reviewed && "Checked", emailIds.includes(clause.id) && "In email"].filter(Boolean);
                return (
                    <li key={clause.id} className="border-t border-line first:border-t-0">
                        <button type="button" onClick={() => onOpen(clause.id)} className="group flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface">
                            <span className="min-w-0 flex-1">
                                {clause.number && clause.number !== "0" && <span className="block text-xs font-medium text-mute">Clause {clause.number}</span>}
                                <span className="block font-semibold text-ink">{clause.title}</span>
                                <span className="mt-0.5 line-clamp-2 block text-sm leading-relaxed text-mute">{clause.explanation}</span>
                                {notes.length > 0 && <span className="mt-1 block text-sm font-medium text-brand">{notes.join(", ")}</span>}
                            </span>
                            {clause.reviewed ? <CircleCheck size={22} className="shrink-0 animate-pop-in text-brand" aria-hidden /> : <ChevronRight size={20} className="shrink-0 text-mute transition-transform duration-200 group-active:translate-x-1" aria-hidden />}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

function KeyFacts({ analysis }: { analysis: Analysis }) {
    const { monthlyRentCents: rent, depositCents: deposit, tenancyStart, termMonths } = analysis;
    const start = parseDate(tenancyStart);
    const end = start && termMonths ? endDate(start, termMonths) : null;
    const tooHigh = rent != null && deposit != null && deposit > rent;

    const facts = [
        { label: "Monthly rent", value: money(rent) },
        { label: "Deposit", value: money(deposit), note: tooHigh ? `More than one month's rent. Ask your landlord to reduce it to ${money(rent)}.` : undefined },
        { label: "Start date", value: start ? formatDate(start) : null },
        { label: "Length", value: termMonths ? `${termMonths} months` : null, sub: end ? `Ends ${formatDate(end)}` : undefined },
    ];

    return (
        <div className="mt-3 rounded-2xl border border-line px-4 py-1">
            {analysis.propertyAddress && <p className="border-b border-line py-3 text-sm text-ink">{analysis.propertyAddress}</p>}
            <dl>
                {facts.map(({ label, value, note, sub }) => (
                    <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-line py-3 first:border-t-0">
                        <dt className="text-sm text-mute">{label}</dt>
                        <dd className={cn("text-right", value ? "font-semibold text-ink" : "text-sm italic text-mute")}>{value ?? "Not found"}</dd>
                        {value && sub && <dd className="w-full text-right text-sm text-mute">{sub}</dd>}
                        {note && <dd className="mt-1 flex w-full items-start gap-1.5 text-sm font-medium text-warn"><STATUS.amber.Icon size={16} className="mt-0.5 shrink-0" aria-hidden />{note}</dd>}
                    </div>
                ))}
            </dl>
        </div>
    );
}

function money(cents: number | null) {
    if (cents == null) return null;
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

function parseDate(value: string | null) {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function endDate(start: Date, months: number) {
    const end = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
    end.setDate(end.getDate() - 1);
    return end;
}

function formatDate(date: Date) {
    return date.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}