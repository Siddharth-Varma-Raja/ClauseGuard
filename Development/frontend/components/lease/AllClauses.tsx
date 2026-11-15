"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { Clause } from "@/lib/notice-types";

const PAGE_SIZE = 10;

function ClauseLine({ analysisId, clause, linked }: { analysisId: string; clause: Clause; linked: boolean }) {
    const flagged = clause.status === "red" || clause.status === "amber";
    const content = (
        <>
            <span className="w-8 shrink-0 text-mute">{clause.number && clause.number !== "0" ? clause.number : "–"}</span>
            <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{clause.title}</span>
                <span className="block truncate text-sm text-mute">{clause.text}</span>
            </span>
            <StatusBadge status={clause.status} size="sm" />
            <span className="hidden w-24 shrink-0 text-right text-sm text-mute sm:block"><span className="print:hidden">Page</span><span className="hidden print:inline">Lease page</span> {clause.page}</span>
            {linked && <ChevronRight size={16} className="shrink-0 text-mute print:hidden" />}
        </>
    );
    const rowClass = cn("flex items-center gap-4 border-b border-line px-5 py-3 last:border-b-0", flagged && "bg-warn-bg/40");

    return (
        <li className="break-inside-avoid">
            {linked ? (
                <Link href={`/lease/${analysisId}?clause=${encodeURIComponent(clause.id)}`} className={cn(rowClass, "hover:bg-surface")}>
                    {content}
                </Link>
            ) : (
                <div className={rowClass}>{content}</div>
            )}
        </li>
    );
}

export default function AllClauses({ analysisId, clauses, printing }: { analysisId: string; clauses: Clause[]; printing: boolean }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(PAGE_SIZE);

    const others = clauses.filter((c) => c.status === "green" || c.status === "grey").length;
    const words = query.trim().toLowerCase();
    const found = words ? clauses.filter((c) => `${c.number} ${c.title} ${c.text}`.toLowerCase().includes(words)) : clauses;
    const shown = found.slice(0, limit);

    return (
        <section className="mt-10">
            <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft print:hidden">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    className="flex w-full cursor-pointer items-center gap-4 px-5 py-5 text-left sm:px-6"
                >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-neu">
                        <Search size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-lg font-bold text-ink">
                            {open ? "All" : "See all"} {clauses.length} clauses we checked
                        </span>
                        <span className="block text-mute">
                            {others > 0 ? `${others} of them are fair or general wording. You don't need to read them.` : "Every clause in your lease, in order."}
                        </span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-dark">
                        {open ? "Hide" : "Show"}
                        <ChevronDown size={18} className={cn("transition-transform", open && "rotate-180")} />
                    </span>
                </button>

                {open && (
                    <div className="border-t border-line">
                        <div className="px-5 py-4 sm:px-6">
                            <label className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 focus-within:border-brand">
                                <Search size={18} className="text-mute" />
                                <input
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setLimit(PAGE_SIZE);
                                    }}
                                    placeholder='Search, for example "deposit"'
                                    className="w-full bg-transparent outline-none"
                                />
                            </label>
                        </div>
                        {found.length === 0 ? (
                            <p className="px-6 pb-6 text-mute">No clauses match &quot;{query}&quot;.</p>
                        ) : (
                            <ul className="border-t border-line">
                                {shown.map((clause) => (
                                    <ClauseLine key={clause.id} analysisId={analysisId} clause={clause} linked />
                                ))}
                            </ul>
                        )}
                        {found.length > limit && (
                            <button
                                type="button"
                                onClick={() => setLimit(limit + PAGE_SIZE)}
                                className="w-full cursor-pointer border-t border-line py-3 text-center font-semibold text-brand-dark hover:bg-surface"
                            >
                                Show more ({shown.length} of {found.length})
                            </button>
                        )}
                    </div>
                )}
            </div>

            {printing && (
                <div className="hidden break-before-page print:block">
                    <p className="text-sm font-semibold text-mute">For your records</p>
                    <h2 className="font-display text-2xl font-semibold text-brand-dark">Every clause we checked</h2>
                    <p className="mt-1 text-mute">You don't need to read these pages. They list every clause so you have a full record.</p>
                    <ul className="mt-3 rounded-2xl border border-line">
                        {clauses.map((clause) => (
                            <ClauseLine key={clause.id} analysisId={analysisId} clause={clause} linked={false} />
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}