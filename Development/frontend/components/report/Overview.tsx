import { ArrowRight, ChevronRight, Mail, Phone } from "lucide-react";
import type { Clause, Status, StatusCounts } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/notice-status";
import { cn } from "@/lib/cn";
import VerdictBand from "./VerdictBand";
import { CARD, LABEL, MEANING } from "./shared";
import Tooltip from "../ui/Tooltip";
import CountUp from "@/components/dashboard/CountUp";

const TILE: Record<Status, string> = {
    red: "border-bad-line bg-[linear-gradient(160deg,#fde3df_0%,#fff6f4_70%)]",
    amber: "border-warn-line bg-[linear-gradient(160deg,#fde9b3_0%,#fff9e8_70%)]",
    green: "border-ok-line bg-[linear-gradient(160deg,#d3efdd_0%,#f2fbf5_70%)]",
    grey: "border-neu-line bg-[linear-gradient(160deg,#e3e7ec_0%,#f6f7f9_70%)]",
};

const INK: Record<Status, string> = { red: "text-bad", amber: "text-warn", green: "text-ok", grey: "text-neu" };

const SHORT: Record<Status, string> = { red: "High", amber: "Medium", green: "Low", grey: "Info" };

function SectionTitle({ step, title, text }: { step: number; title: string; text: string }) {
    return (
        <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-dark text-sm font-bold text-white">{step}</span>
            <div>
                <h2 className="font-display text-xl font-semibold text-brand-dark sm:text-2xl">{title}</h2>
                <p className="mt-0.5 text-sm text-mute sm:text-base">{text}</p>
            </div>
        </div>
    );
}

function plural(n: number, one: string, many: string) {
    return n === 1 ? one : many;
}

export default function Overview({
    clauses,
    counts,
    left,
    onPick,
    onOpen,
    onIssues,
    onEmail,
}: {
    clauses: Clause[];
    counts: StatusCounts;
    left: number;
    onPick: (s: Status) => void;
    onOpen: (c: Clause) => void;
    onIssues: () => void;
    onEmail: () => void;
}) {
    const total = clauses.length;
    const serious = clauses.filter((c) => c.status === "red");
    const toRaise = counts.red + counts.amber;

    return (
        <div className="space-y-8 sm:space-y-10">
            <VerdictBand counts={counts} total={total}>
                {toRaise > 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                        <button
                            type="button"
                            onClick={onIssues}
                            className="group inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-5 font-semibold text-brand-dark transition-transform hover:bg-brand-soft active:scale-[0.97] max-sm:w-full"
                        >
                            {left > 0 ? `Check the ${toRaise} ${plural(toRaise, "issue", "issues")}` : "Look at them again"}
                            <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5" />
                        </button>
                        <span className="flex min-w-40 flex-1 items-center gap-3 text-sm text-white/70 sm:max-w-64">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15" aria-hidden>
                                <span className="block h-full rounded-full bg-[#7fd4cf] transition-[width] duration-700 ease-out" style={{ width: `${((toRaise - left) / toRaise) * 100}%` }} />
                            </span>
                            {toRaise - left} of {toRaise} reviewed
                        </span>
                    </div>
                )}
            </VerdictBand>

            <section className="space-y-4">
                <SectionTitle step={1} title="What to do next" text="Follow these in order." />
                <ol className="stagger grid overflow-hidden max-sm:divide-y max-sm:divide-line max-sm:rounded-[24px] max-sm:border max-sm:border-[#cfe1e2] max-sm:bg-white max-sm:shadow-soft sm:gap-4 sm:overflow-visible md:grid-cols-3">
                    <li className={cn(CARD, "flex flex-col p-5 max-sm:rounded-none max-sm:border-0 max-sm:shadow-none sm:p-6")}>
                        <p className="flex items-center gap-2 text-sm font-semibold text-mute">
                            <span className={cn("grid size-6 place-items-center rounded-full text-xs font-bold", left === 0 && toRaise > 0 ? "bg-ok-solid text-white" : "bg-brand-soft text-brand-dark")}>{left === 0 && toRaise > 0 ? "✓" : 1}</span>
                            First
                        </p>
                        <p className="mt-1 text-lg font-bold text-ink">Check the {toRaise} {plural(toRaise, "issue", "issues")} in your lease</p>
                        <p className="mt-1.5 text-ink/80 max-sm:text-[15px]">Lease viewer shows each one in your lease, why it matters and what to ask. Mark each one as reviewed.</p>
                        <div className="mt-3 flex items-center gap-3 text-sm text-mute">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden>
                                <span className="block h-full rounded-full bg-brand transition-[width] duration-700 ease-out" style={{ width: `${toRaise ? ((toRaise - left) / toRaise) * 100 : 0}%` }} />
                            </span>
                            {toRaise - left} of {toRaise} reviewed
                        </div>
                        <div className="mt-auto pt-5">
                            <button type="button" onClick={onIssues} className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full bg-brand-dark px-5 font-semibold text-white transition-transform hover:bg-brand active:scale-95">
                                {left > 0 ? "Open Lease viewer" : "Look at them again"}
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </li>
                    <li className={cn(CARD, "flex flex-col p-5 max-sm:rounded-none max-sm:border-0 max-sm:shadow-none sm:p-6")}>
                        <p className="flex items-center gap-2 text-sm font-semibold text-mute">
                            <span className={cn("grid size-6 place-items-center rounded-full text-xs font-bold", "bg-brand-soft text-brand-dark")}>2</span>
                            Then
                        </p>
                        <p className="mt-1 text-lg font-bold text-ink">Email your landlord</p>
                        <p className="mt-1.5 text-ink/80">We write a polite email asking for the changes. You check it and send it yourself.</p>
                        <div className="mt-auto pt-5">
                            <button type="button" onClick={onEmail} className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-brand-dark px-5 font-semibold text-brand-dark transition-transform hover:bg-brand-soft active:scale-95">
                                <Mail size={16} />
                                Write the email
                            </button>
                        </div>
                    </li>
                    <li className={cn(CARD, "flex flex-col p-5 max-sm:rounded-none max-sm:border-0 max-sm:shadow-none sm:p-6")}>
                        <p className="flex items-center gap-2 text-sm font-semibold text-mute">
                            <span className={cn("grid size-6 place-items-center rounded-full text-xs font-bold", "bg-brand-soft text-brand-dark")}>3</span>
                            If you're unsure
                        </p>
                        <p className="mt-1 text-lg font-bold text-ink">Get free advice</p>
                        <p className="mt-1.5 text-ink/80">Threshold and the Residential Tenancies Board (RTB) help renters for free.</p>
                        <div className="mt-auto flex flex-wrap gap-2 pt-5">
                            <a href="https://www.threshold.ie" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-brand-dark px-5 font-semibold text-brand-dark hover:bg-brand-soft">
                                <Phone size={16} />
                                Threshold
                            </a>
                            <a href="https://www.rtb.ie" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-brand-dark px-5 font-semibold text-brand-dark hover:bg-brand-soft">
                                RTB
                            </a>
                        </div>
                    </li>
                </ol>
            </section>
            <section className="space-y-4">
                <SectionTitle step={2} title={`What we found in ${total} clauses`} text="Every clause gets one of four labels. Select a label to see its clauses." />
                <div className="grid grid-cols-4 gap-2 max-sm:overflow-x-clip sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                    {STATUS_ORDER.map((s, index) => {
                        const { Icon, solid } = STATUS[s];
                        return (
                            <button
                                key={s}
                                type="button"
                                onClick={() => onPick(s)}
                                disabled={counts[s] === 0}
                                style={{ animationDelay: `${index * 70}ms` }}
                                className={cn("group flex animate-fade-up flex-col rounded-2xl border p-2.5 text-left transition enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:shadow-soft enabled:active:scale-95 disabled:opacity-50 max-sm:items-center max-sm:text-center sm:rounded-[28px] sm:p-5", TILE[s])}
                            >
                                <div className="flex items-center gap-3 max-sm:flex-col max-sm:gap-1.5">
                                    <Tooltip text={`${LABEL[s]}: ${MEANING[s]}`}>
                                        <span className={cn("grid size-8 place-items-center rounded-full text-white sm:size-11", solid)}>
                                            <Icon size={18} aria-hidden />
                                        </span>
                                    </Tooltip>
                                    <span className={cn("font-display text-2xl font-semibold leading-none tabular-nums sm:text-4xl", INK[s])}>
                                        <CountUp value={counts[s]} duration={800} />
                                    </span>
                                </div>
                                <p className="mt-1.5 text-xs font-bold text-ink sm:hidden">{SHORT[s]}</p>
                                <p className="mt-4 text-lg font-bold text-ink max-sm:hidden">{LABEL[s]}</p>
                                <p className="mt-1 text-[15px] leading-snug text-ink/80 max-sm:hidden">{MEANING[s]}</p>
                                {counts[s] > 0 && (
                                    <span className={cn("mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold max-sm:hidden", INK[s])}>
                                        Show {plural(counts[s], "it", `these ${counts[s]}`)}
                                        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <p className="text-sm text-mute sm:hidden">Tap a colour to see its clauses.</p>
            </section>

            {serious.length > 0 && (
                <section className="space-y-4">
                    <SectionTitle step={3} title={`The ${serious.length} High Risk ${plural(serious.length, "clause", "clauses")} in plain English`} text="Select one to see why it matters and what to ask your landlord in Lease viewer." />
                    <ul className="stagger grid overflow-hidden max-sm:divide-y max-sm:divide-line max-sm:rounded-[24px] max-sm:border max-sm:border-[#cfe1e2] max-sm:bg-white max-sm:shadow-soft sm:gap-4 sm:overflow-visible md:grid-cols-2">
                        {serious.map((c) => (
                            <li key={c.id}>
                                <button type="button" onClick={() => onOpen(c)} className={cn(CARD, "group flex h-full w-full cursor-pointer items-start gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:border-bad-line max-sm:items-center max-sm:rounded-none max-sm:border-0 max-sm:shadow-none max-sm:active:bg-surface sm:p-5")}>
                                    <Tooltip text={`Clause ${c.number} in your lease`} side="right" className="shrink-0">
                                        <span className="grid size-11 place-items-center rounded-full bg-bad-bg text-bad">
                                            <span className="font-display text-lg font-semibold">{c.number}</span>
                                        </span>
                                    </Tooltip>
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-bold text-ink sm:text-lg">{c.title}</span>
                                        <span className="mt-1 leading-relaxed text-ink/80 max-sm:line-clamp-2 max-sm:text-[15px] sm:block">{c.explanation}</span>
                                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-bad max-sm:hidden">
                                            Open in Lease viewer
                                            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                    </span>
                                    <ChevronRight size={20} className="shrink-0 text-mute transition-transform group-active:translate-x-0.5 sm:hidden" aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

        </div>
    );
}