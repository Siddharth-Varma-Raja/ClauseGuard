import { STATUS_ORDER, STATUS } from "@/lib/notice-status";
import { Status, StatusCounts } from "@/lib/notice-types";
import { cn } from "@/lib/cn";
import { ReactNode } from "react";

const MEANING: Record<Status, string> = {
    red: "Goes against Irish tenancy law. Don't sign until it's fixed",
    amber: "Allowed but unclear or unfair to you. Check with your landlord.",
    green: "A fair term found in most of the leases",
    grey: "General wording, like definitions. Nothing to do."
}

const TEXT: Record<Status, string> = {
    red: "text-bad",
    amber: "text-warn",
    green: "text-ok",
    grey: "text-neu"
};

const BOX = {
    red: "border-bad-line bg-bad-bg",
    amber: "border-warn-line bg-warn-bg",
    green: "border-ok-line bg-ok-bg"
};

const LIGHTS = [
    ["red", "bg-bad-solid"],
    ["amber", "bg-warn-solid"],
    ["green", "bg-ok-solid"]
] as const;

function plural(count: number, one: string, many: string) {
    return count === 1 ? one : many;
}

export function ShortAnswer({ counts, total }: { counts: StatusCounts; total: number }) {
    const level = counts.red > 0 ? "red" : counts.amber > 0 ? "amber" : "green";
    let headline: ReactNode;
    let detail: string;

    if (level === "red") {
        headline = (
            <>
                <strong className="text-bad">Don&apos;t sign yet.</strong> {counts.red} {plural(counts.red, "clause goes", "clauses go")} against Irish
                tenancy law
                {counts.amber > 0 ? ` and ${counts.amber} more ${plural(counts.amber, "is", "are")} worth asking about.` : "."}
            </>
        );
        detail = `We read all ${total} clauses. Start with the High Risk ones.`;
    } else if (level === "amber") {
        headline = (
            <>
                This lease looks mostly fine. There {plural(counts.amber, "is", "are")}{" "}
                <strong className="text-warn">
                    {counts.amber} {plural(counts.amber, "thing", "things")} to ask your landlord about
                </strong>{" "}
                before you sign.
            </>
        );
        detail = `We read all ${total} clauses. Nothing in it goes against Irish tenancy law.`;
    } else {
        headline = "This lease looks fine. We didn't find anything to ask your landlord about.";
        detail = `We read all ${total} clauses.`;
    }

    return (
        <section className={cn("mt-6 flex break-inside-avoid items-center gap-5 rounded-3xl border p-5 sm:p-7", BOX[level])}>
            <div className="flex shrink-0 flex-col gap-1.5 rounded-xl bg-ink p-2" aria-hidden>
                {LIGHTS.map(([key, colour]) => (
                    <span key={key} className={cn("size-6 rounded-full", colour, level !== key && "opacity-25")} />
                ))}
            </div>
            <div>
                <p className={cn("text-sm font-bold", TEXT[level])}>The short answer</p>
                <p className="mt-1 font-display text-xl font-semibold leading-snug text-brand-dark sm:text-2xl">{headline}</p>
                <p className="mt-2 text-ink">{detail}</p>
            </div>
        </section>
    );
}

export function CountBoxes({ counts }: { counts: StatusCounts }) {
    return (
        <div className="mt-3 grid break-inside-avoid grid-cols-2 gap-3 lg:grid-cols-4">
            {STATUS_ORDER.map((s) => {
                const { Icon, label } = STATUS[s];
                const flagged = (s === "red" || s === "amber") && counts[s] > 0;
                return (
                    <div
                        key={s}
                        className={cn(
                            "rounded-2xl bg-white p-4",
                            flagged ? (s === "red" ? "border-2 border-bad-solid" : "border-2 border-warn-solid") : "border border-line",
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Icon size={22} className={TEXT[s]} aria-hidden />
                            <span className={cn("font-display text-3xl font-semibold leading-none", TEXT[s])}>{counts[s]}</span>
                        </div>
                        <p className="mt-2 font-bold text-ink">{label}</p>
                        <p className="mt-1 text-sm leading-snug text-mute">{MEANING[s]}</p>
                    </div>
                );
            })}
        </div>
    );
}

export function LeaseDetails({ rows, missing }: { rows: [string, string | null][]; missing: string[] }) {
    return (
        <section className="mt-10 break-inside-avoid">
            <h2 className="font-display text-2xl font-semibold text-brand-dark">About this lease</h2>
            <div className="mt-3 rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
                <dl className="grid sm:grid-cols-2 sm:gap-x-8">
                    {rows.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 border-b border-line py-3">
                            <dt className="shrink-0 text-mute">{label}</dt>
                            <dd className={cn("min-w-0 break-words text-right", value ? "font-semibold text-ink" : "italic text-mute")}>
                                {value ?? "Not written in your lease"}
                            </dd>
                        </div>
                    ))}
                </dl>
                {missing.length > 0 && (
                    <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-ink">
                        This lease doesn&apos;t say the {missing.join(", ")}. Ask your landlord to add {missing.length === 1 ? "it" : "them"} before you sign.
                    </p>
                )}
            </div>
        </section>
    );
}

