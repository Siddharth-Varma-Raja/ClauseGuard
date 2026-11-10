import { ArrowRight, Mail, Phone } from "lucide-react";
import type { Clause, Status, StatusCounts } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/notice-status";
import { cn } from "@/lib/cn";
import VerdictBand from "./VerdictBand";
import { CARD, LABEL, MEANING } from "./shared";

const TILE: Record<Status, string> = {
    red: "border-bad-line bg-[linear-gradient(160deg,#fde3df_0%,#fff6f4_70%)]",
    amber: "border-warn-line bg-[linear-gradient(160deg,#fde9b3_0%,#fff9e8_70%)]",
    green: "border-ok-line bg-[linear-gradient(160deg,#d3efdd_0%,#f2fbf5_70%)]",
    grey: "border-neu-line bg-[linear-gradient(160deg,#e3e7ec_0%,#f6f7f9_70%)]",
};

const INK: Record<Status, string> = { red: "text-bad", amber: "text-warn", green: "text-ok", grey: "text-neu" };

function SectionTitle({ step, title, text }: { step: number; title: string; text: string }) {
    return (
        <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-dark text-sm font-bold text-white">{step}</span>
            <div>
                <h2 className="font-display text-2xl font-semibold text-brand-dark">{title}</h2>
                <p className="mt-0.5 text-mute">{text}</p>
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
        <div className="space-y-10">
            <VerdictBand counts={counts} total={total} />

            <section className="space-y-4">
                <SectionTitle step={1} title={`What we found in ${total} clauses`} text="Every clause gets one of four labels. Select a label to see its clauses." />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {STATUS_ORDER.map((s) => {
                        const { Icon, solid } = STATUS[s];
                        return (
                            <button
                                key={s}
                                type="button"
                                onClick={() => onPick(s)}
                                disabled={counts[s] === 0}
                                className={cn("group flex flex-col rounded-[28px] border p-5 text-left transition enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:shadow-soft", TILE[s])}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={cn("grid size-11 place-items-center rounded-full text-white", solid)}>
                                        <Icon size={21} />
                                    </span>
                                    <span className={cn("font-display text-4xl font-semibold leading-none", INK[s])}>{counts[s]}</span>
                                </div>
                                <p className="mt-4 text-lg font-bold text-ink">{LABEL[s]}</p>
                                <p className="mt-1 text-[15px] leading-snug text-ink/80">{MEANING[s]}</p>
                                {counts[s] > 0 && (
                                    <span className={cn("mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold", INK[s])}>
                                        Show {plural(counts[s], "it", `these ${counts[s]}`)}
                                        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            {serious.length > 0 && (
                <section className="space-y-4">
                    <SectionTitle step={2} title={`The ${serious.length} High Risk ${plural(serious.length, "clause", "clauses")} in plain English`} text="Select one to see why it matters and what to ask your landlord in Lease viewer." />
                    <ul className="grid gap-4 md:grid-cols-2">
                        {serious.map((c) => (
                            <li key={c.id}>
                                <button type="button" onClick={() => onOpen(c)} className={cn(CARD, "group flex h-full w-full cursor-pointer items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:border-bad-line")}>
                                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-bad-bg text-bad">
                                        <span className="font-display text-lg font-semibold">{c.number}</span>
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-lg font-bold text-ink">{c.title}</span>
                                        <span className="mt-1 block leading-relaxed text-ink/80">{c.explanation}</span>
                                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-bad">
                                            Open in Lease viewer
                                            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="space-y-4">
                <SectionTitle step={serious.length > 0 ? 3 : 2} title="What to do next" text="Follow these in order." />
                <ol className="grid gap-4 md:grid-cols-3">
                    <li className={cn(CARD, "flex flex-col p-6")}>
                        <p className="text-sm font-semibold text-mute">First</p>
                        <p className="mt-1 text-lg font-bold text-ink">Check the {toRaise} {plural(toRaise, "issue", "issues")} in your lease</p>
                        <p className="mt-1.5 text-ink/80">Lease viewer shows each one in your lease, why it matters and what to ask. Mark each one as reviewed.</p>
                        <p className="mt-3 text-sm text-mute">
                            You've reviewed {toRaise - left} of {toRaise}.
                        </p>
                        <div className="mt-auto pt-5">
                            <button type="button" onClick={onIssues} className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full bg-brand-dark px-5 font-semibold text-white hover:bg-brand">
                                {left > 0 ? "Open Lease viewer" : "Look at them again"}
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </li>
                    <li className={cn(CARD, "flex flex-col p-6")}>
                        <p className="text-sm font-semibold text-mute">Then</p>
                        <p className="mt-1 text-lg font-bold text-ink">Email your landlord</p>
                        <p className="mt-1.5 text-ink/80">We write a polite email asking for the changes. You check it and send it yourself.</p>
                        <div className="mt-auto pt-5">
                            <button type="button" onClick={onEmail} className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-brand-dark px-5 font-semibold text-brand-dark hover:bg-brand-soft">
                                <Mail size={16} />
                                Write the email
                            </button>
                        </div>
                    </li>
                    <li className={cn(CARD, "flex flex-col p-6")}>
                        <p className="text-sm font-semibold text-mute">If you're unsure</p>
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
        </div>
    );
}