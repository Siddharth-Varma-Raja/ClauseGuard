import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import type { AnalysisSummary } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { cn } from "@/lib/cn";

function formatCreated(iso: string) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

export default function AnalysisCard({ analysis }: { analysis: AnalysisSummary }) {
    const { counts } = analysis;
    const total = counts.red + counts.amber + counts.green + counts.grey;

    return (
        <li className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft sm:flex-nowrap sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <FileText size={22} aria-hidden />
            </span>

            <div className="min-w-0 flex-1">
                <Link
                    href={`/lease/${analysis.id}`}
                    title="Open the annotated review"
                    className="block truncate font-semibold text-ink hover:text-brand hover:underline"
                >
                    {analysis.fileName}
                </Link>
                <p className="truncate text-sm text-mute">
                    {[analysis.propertyAddress, formatCreated(analysis.createdAt)].filter(Boolean).join(" · ")}
                </p>

                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label={`${total} clauses checked`}>
                    {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
                        <li key={s} className="flex items-center gap-1.5">
                            <span className={cn("size-2 rounded-full", STATUS[s].solid)} aria-hidden />
                            <span className="font-semibold">{counts[s]}</span>
                            <span className="text-mute">{STATUS[s].label.toLowerCase()}</span>
                        </li>
                    ))}
                    {total === 0 && <li className="text-mute">No clauses found</li>}
                </ul>
            </div>

            <Link
                href={`/lease/${analysis.id}/report`}
                aria-label={`View report for ${analysis.fileName}`}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
                View report
                <ArrowRight size={16} aria-hidden />
            </Link>
        </li>
    );
}