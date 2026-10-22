import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
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
        <li>
            <Link
                href={`/lease/${analysis.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft transition-colors hover:border-brand sm:p-5"
            >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <FileText size={22} aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{analysis.fileName}</p>
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

                <ChevronRight size={20} className="shrink-0 text-mute group-hover:text-brand" aria-hidden />
            </Link>
        </li>
    );
}