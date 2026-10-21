import Card from "@/components/ui/Card";
import type { TimelineEvent, TimelineResponse } from "@/lib/types";
import { daysUntil, euro, fmtDate, relativeDays } from "@/lib/format";

type SummaryProps = {
    events: TimelineEvent[];
    rent: TimelineResponse["rent"] | undefined;
    today: string;
};

export default function Summary({ events, rent, today }: SummaryProps) {
    const upcoming = events.filter((e) => e.date >= today && !e.done);
    const next = upcoming[0];
    const deadlines = upcoming.filter((e) => e.kind === "deadline");

    return (
        <div data-tour="summary" className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
                <p className="text-sm text-mute">Next date</p>
                <p className="mt-1 font-display text-2xl font-semibold text-brand-dark">
                    {next ? fmtDate(next.date) : "—"}
                </p>
                <p className="truncate text-sm text-mute">
                    {next
                        ? `${next.title}, ${relativeDays(daysUntil(next.date))}`
                        : "Nothing coming up"}
                </p>
            </Card>

            <Card className="p-5">
                <p className="text-sm text-mute">Open deadlines</p>
                <p className="mt-1 font-display text-2xl font-semibold text-warn">
                    {deadlines.length}
                </p>
                <p className="truncate text-sm text-mute">
                    {deadlines[0] ? `Next: ${deadlines[0].title}` : "None open"}
                </p>
            </Card>

            <Card className="p-5">
                <p className="text-sm text-mute">Monthly rent</p>
                <p className="mt-1 font-display text-2xl font-semibold text-brand-dark">
                    {rent ? euro(rent.amount) : "—"}
                </p>
                <p className="truncate text-sm text-mute">
                    {rent ? `From ${fmtDate(rent.from)}` : "Analyse your lease to see it here"}
                </p>
            </Card>
        </div>
    );
}