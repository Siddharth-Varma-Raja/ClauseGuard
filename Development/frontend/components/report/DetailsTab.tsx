import { CalendarDays, CalendarPlus, Clock, Euro, FileText, Flag, KeyRound, Loader2, PiggyBank, TriangleAlert } from "lucide-react";
import type { Analysis } from "@/lib/notice-types";
import { cn } from "@/lib/cn";
import { CARD } from "./shared";

function fmt(iso: string) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

function euro(cents: number) {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
}

export default function DetailsTab({ analysis, end, busy, onAddDates }: { analysis: Analysis; end: string | null; busy: boolean; onAddDates: () => void }) {
    const rent = analysis.monthlyRentCents;
    const deposit = analysis.depositCents;
    const start = analysis.tenancyStart?.slice(0, 10) ?? null;
    const over = rent != null && deposit != null && deposit > rent;

    const facts = [
        { Icon: Euro, label: "Monthly rent", value: rent != null ? euro(rent) : null },
        { Icon: PiggyBank, label: "Deposit", value: deposit != null ? euro(deposit) : null, warn: over ? `${Math.round((deposit ?? 0) / (rent ?? 1))} months' rent. The limit is one month.` : null },
        { Icon: Clock, label: "Fixed term", value: analysis.termMonths ? `${analysis.termMonths} months` : null },
        { Icon: FileText, label: "Document", value: `${analysis.pageCount} pages, ${analysis.clauses.length} clauses` },
        { Icon: CalendarDays, label: "Checked on", value: fmt(analysis.createdAt.slice(0, 10)) },
    ];
    const missing = facts.filter((f) => !f.value).map((f) => f.label.toLowerCase());

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <section className={cn(CARD, "p-5 sm:p-6")}>
                <h2 className="font-display text-2xl font-semibold text-brand-dark">Key facts</h2>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {facts.map(({ Icon, label, value, warn }) => (
                        <div key={label} className={cn("rounded-3xl border p-4", warn ? "border-warn-line bg-warn-bg" : "border-line bg-surface/50")}>
                            <dt className="flex items-center gap-2 text-sm font-medium text-mute">
                                <Icon size={16} className={warn ? "text-warn" : "text-brand"} />
                                {label}
                            </dt>
                            <dd className={cn("mt-1 font-display text-xl font-semibold", value ? (warn ? "text-warn" : "text-ink") : "font-sans text-base font-normal italic text-mute")}>
                                {value ?? "Not written in your lease"}
                            </dd>
                            {warn && (
                                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-warn">
                                    <TriangleAlert size={14} />
                                    {warn}
                                </p>
                            )}
                        </div>
                    ))}
                </dl>
                {missing.length > 0 && <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-ink">This lease doesn't say the {missing.join(", ")}. Ask your landlord to add it before you sign.</p>}
            </section>

            {start && end && (
                <section className={cn(CARD, "flex flex-col p-5 sm:p-6")}>
                    <h2 className="font-display text-2xl font-semibold text-brand-dark">Key dates</h2>
                    <ol className="relative mt-5 space-y-6 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-0.5 before:bg-line">
                        {[
                            { Icon: KeyRound, label: "Move in", date: start, ring: "border-ok-solid text-ok" },
                            { Icon: Flag, label: "Fixed term ends", date: end, ring: "border-brand-dark text-brand-dark" },
                        ].map(({ Icon, label, date, ring }) => (
                            <li key={label} className="relative flex items-center gap-4">
                                <span className={cn("z-10 grid size-10 place-items-center rounded-full border-2 bg-white", ring)}>
                                    <Icon size={17} />
                                </span>
                                <div>
                                    <p className="font-semibold text-ink">{label}</p>
                                    <p className="text-mute">{fmt(date)}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <button
                        type="button"
                        onClick={onAddDates}
                        disabled={busy}
                        className="mt-auto inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border-[1.5px] border-brand-dark px-5 font-semibold text-brand-dark hover:bg-brand-soft disabled:opacity-60 lg:mt-8"
                    >
                        {busy ? <Loader2 size={17} className="animate-spin" /> : <CalendarPlus size={17} />}
                        Add these dates to my timeline
                    </button>
                </section>
            )}
        </div>
    );
}