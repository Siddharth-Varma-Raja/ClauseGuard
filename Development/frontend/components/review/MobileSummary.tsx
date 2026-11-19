"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, CircleCheck, House, type LucideIcon } from "lucide-react";
import type { Analysis, Clause, Status } from "@/lib/notice-types";
import { STATUS } from "@/lib/status";
import { plural, verdictOf } from "@/components/report/shared";
import { cn } from "@/lib/cn";
import ClauseSheet from "./ClauseSheet";

type Group = "red" | "amber" | "green" | "grey" | "details";

const GROUPS: { status: Status; text: string }[] = [
    { status: "red", text: "May be unfair or unlawful" },
    { status: "amber", text: "Worth asking about" },
    { status: "green", text: "No obvious issue found" },
    { status: "grey", text: "General information" },
];

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
    const [group, setGroup] = useState<Group | null>(null);

    const red = clauses.filter((c) => c.status === "red");
    const amber = clauses.filter((c) => c.status === "amber");
    const issues = [...red, ...amber];
    const done = issues.filter((c) => c.reviewed).length;
    const nextIndex = Math.max(0, issues.findIndex((c) => !c.reviewed));
    const counts = { red: red.length, amber: amber.length, green: clauses.filter((c) => c.status === "green").length, grey: clauses.filter((c) => c.status === "grey").length };
    const { verdict } = verdictOf(counts, clauses.length);

    const open = clauses.find((c) => c.id === openId) ?? null;
    const at = open ? issues.findIndex((c) => c.id === open.id) : -1;
    const isIssue = at >= 0;

    const line =
        red.length > 0
            ? `${red.length} ${plural(red.length, "clause", "clauses")} may be unfair or unlawful. Fix ${plural(red.length, "it", "them")} before you sign.`
            : amber.length > 0
                ? `Ask your landlord about ${amber.length} ${plural(amber.length, "clause", "clauses")} before you sign.`
                : `We checked all ${clauses.length} clauses. Nothing to raise.`;

    function toggle(next: Group) {
        setGroup(group === next ? null : next);
    }

    return (
        <section aria-label="Summary of your lease" className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-start md:hidden">
            <div data-tour="rating-tiles" className="animate-fade-up rounded-3xl border border-line bg-white p-5 shadow-soft">
                <p className="text-sm text-mute">Should you sign?</p>
                <p className="mt-0.5 font-display text-[30px] font-semibold leading-tight text-brand-dark">{verdict}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">{line}</p>

                {issues.length > 0 && (
                    <>
                        <p className="mt-5 text-sm text-mute">
                            <b className="font-semibold text-ink">{done}</b> of {issues.length} issues checked
                        </p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" aria-hidden>
                            <div className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${(done / issues.length) * 100}%` }} />
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpenId(issues[done === issues.length ? 0 : nextIndex].id)}
                            className="mt-4 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-dark font-semibold text-white transition-transform hover:bg-brand active:scale-[0.97] motion-reduce:transition-none"
                        >
                            {done === 0 ? `Check issue 1 of ${issues.length}` : done === issues.length ? "Look at them again" : `Continue with issue ${nextIndex + 1}`}
                            <ArrowRight size={18} aria-hidden />
                        </button>
                    </>
                )}
            </div>

            <div data-tour="clause-cards" className="animate-fade-up overflow-hidden rounded-3xl border border-line bg-white shadow-soft [animation-delay:120ms]">
                <h2 className="px-5 pb-1 pt-4 text-sm text-mute">Tap a group to see its clauses</h2>
                {GROUPS.map(({ status, text }) => {
                    const list = clauses.filter((c) => c.status === status);
                    if (list.length === 0) return null;
                    return (
                        <Fold key={status} id={`g-${status}`} title={`${STATUS[status].label} (${list.length})`} text={text} Icon={STATUS[status].Icon} tone={STATUS[status].text} open={group === status} onToggle={() => toggle(status)}>
                            <Rows clauses={list} emailIds={emailIds} onOpen={setOpenId} />
                        </Fold>
                    );
                })}
                <Fold id="g-details" title="Key lease details" text="Rent, deposit and dates" Icon={House} tone="text-brand" open={group === "details"} onToggle={() => toggle("details")}>
                    <KeyFacts analysis={analysis} />
                </Fold>
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

function Fold({
    id,
    title,
    text,
    Icon,
    tone,
    open,
    onToggle,
    children,
}: {
    id: string;
    title: string;
    text: string;
    Icon: LucideIcon;
    tone: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="border-t border-line first-of-type:border-t-0">
            <h3>
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    aria-controls={id}
                    className={cn("flex min-h-16 w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors active:bg-surface", open && "bg-surface/60")}
                >
                    <Icon size={22} className={cn("shrink-0", tone)} aria-hidden />
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{title}</span>
                        <span className="block truncate text-sm text-mute">{text}</span>
                    </span>
                    <ChevronDown size={20} className={cn("shrink-0 text-brand-dark transition-transform duration-300", open && "rotate-180")} aria-hidden />
                </button>
            </h3>
            <div id={id} inert={!open} className={cn("grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className={cn("overflow-hidden transition-opacity duration-300 motion-reduce:transition-none", open ? "opacity-100" : "opacity-0")}>
                    <div className="pb-3">{children}</div>
                </div>
            </div>
        </div>
    );
}

function Rows({ clauses, emailIds, onOpen }: { clauses: Clause[]; emailIds: string[]; onOpen: (id: string) => void }) {
    return (
        <ul className="mx-3 overflow-hidden rounded-2xl border border-line">
            {clauses.map((clause) => {
                const notes = [clause.reviewed && "Checked", emailIds.includes(clause.id) && "In email"].filter(Boolean);
                return (
                    <li key={clause.id} className="border-t border-line first:border-t-0">
                        <button type="button" onClick={() => onOpen(clause.id)} className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface">
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-ink">{clause.title}</span>
                                <span className="mt-0.5 line-clamp-2 block text-sm leading-relaxed text-mute">{clause.explanation}</span>
                                {notes.length > 0 && <span className="mt-1 block text-sm font-medium text-brand">{notes.join(", ")}</span>}
                            </span>
                            {clause.reviewed ? <CircleCheck size={22} className="shrink-0 animate-pop-in text-brand" aria-hidden /> : <ChevronRight size={20} className="shrink-0 text-mute" aria-hidden />}
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
        <div className="mx-3 rounded-2xl border border-line px-4 py-1">
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
