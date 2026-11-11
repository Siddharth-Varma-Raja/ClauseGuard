"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Clause, Status } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/notice-status";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { CARD, LABEL } from "./shared";

const PER_PAGE = 8;

const CHIP: Record<Status, string> = {
    red: "bg-bad-bg text-bad",
    amber: "bg-warn-bg text-warn",
    green: "bg-ok-bg text-ok",
    grey: "bg-neu-bg text-neu",
};

export default function AllTab({ clauses, risk, onRisk, onOpen }: { clauses: Clause[]; risk: Status | null; onRisk: (s: Status | null) => void; onOpen: (c: Clause) => void }) {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const words = query.trim().toLowerCase();
    const found = clauses.filter((c) => (!risk || c.status === risk) && (!words || `${c.number} ${c.title} ${c.text}`.toLowerCase().includes(words)));
    const pages = Math.max(1, Math.ceil(found.length / PER_PAGE));
    const current = Math.min(page, pages - 1);
    const shown = found.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

    function pick(s: Status | null) {
        onRisk(s);
        setPage(0);
    }

    return (
        <section className={cn(CARD, "overflow-hidden")}>
            <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:px-6 lg:flex-row lg:items-center">
                <div role="group" aria-label="Show by risk" className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => pick(null)}
                        aria-pressed={!risk}
                        className={cn("min-h-9 cursor-pointer rounded-full border px-3.5 text-sm font-semibold", !risk ? "border-brand-dark bg-brand-dark text-white" : "border-line bg-white text-ink hover:border-brand")}
                    >
                        All <span className="opacity-70">{clauses.length}</span>
                    </button>
                    {STATUS_ORDER.map((s) => {
                        const n = clauses.filter((c) => c.status === s).length;
                        const on = risk === s;
                        const Icon = STATUS[s].Icon;
                        return (
                            <button
                                key={s}
                                type="button"
                                onClick={() => pick(on ? null : s)}
                                aria-pressed={on}
                                disabled={n === 0}
                                className={cn(
                                    "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold disabled:opacity-40",
                                    on ? cn(STATUS[s].solid, "border-transparent text-white") : STATUS[s].badge,
                                )}
                            >
                                <Icon size={15} />
                                {LABEL[s]} <span className="opacity-70">{n}</span>
                            </button>
                        );
                    })}
                </div>
                <label className="flex flex-1 items-center gap-2 rounded-full border border-line px-4 py-2 focus-within:border-brand lg:max-w-xs lg:ml-auto">
                    <Search size={17} className="text-mute" />
                    <input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(0);
                        }}
                        placeholder='Search, for example "deposit"'
                        aria-label="Search clauses"
                        className="w-full bg-transparent text-sm outline-none"
                    />
                </label>
            </div>

            {found.length === 0 ? (
                <p className="px-6 py-10 text-center text-mute">No clauses match.</p>
            ) : (
                <ul key={`${risk}-${words}-${current}`} className="animate-fade-up space-y-2 p-3 sm:p-4">
                    {shown.map((c) => (
                        <li key={c.id}>
                            <button
                                type="button"
                                onClick={() => onOpen(c)}
                                className="grid w-full cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-2xl border border-line bg-white px-3.5 py-3 text-left transition hover:border-brand/40 hover:bg-surface/60 sm:grid-cols-[2.75rem_minmax(0,1fr)_5rem_10rem_1.5rem]"
                            >
                                <span className={cn("grid size-11 place-items-center rounded-full font-display text-lg font-semibold", CHIP[c.status])}>{c.number}</span>
                                <span className="min-w-0">
                                    <span className="block font-semibold text-ink">{c.title}</span>
                                    <span className="block truncate text-sm text-mute">{c.explanation}</span>
                                </span>
                                <span className="hidden text-sm text-mute sm:block">Page {c.page}</span>
                                <span className="col-start-2 sm:col-start-auto">
                                    <StatusBadge status={c.status} label={LABEL[c.status]} size="sm" />
                                </span>
                                <ChevronRight size={18} className="row-span-2 row-start-1 text-mute sm:row-span-1 sm:row-start-auto" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {pages > 1 && (
                <div className="flex items-center justify-between border-t border-line px-5 py-3.5 sm:px-6">
                    <span className="text-sm text-mute">
                        {current * PER_PAGE + 1}–{current * PER_PAGE + shown.length} of {found.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage(current - 1)}
                            disabled={current === 0}
                            aria-label="Previous page"
                            className="grid size-10 cursor-pointer place-items-center rounded-full border-[1.5px] border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white disabled:cursor-default disabled:border-line disabled:text-mute/50 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        {Array.from({ length: pages }).map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setPage(i)}
                                aria-label={`Page ${i + 1}`}
                                aria-current={i === current}
                                className={cn("grid size-10 cursor-pointer place-items-center rounded-full text-sm font-semibold", i === current ? "bg-brand-dark text-white" : "text-ink hover:bg-surface")}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setPage(current + 1)}
                            disabled={current === pages - 1}
                            aria-label="Next page"
                            className="grid size-10 cursor-pointer place-items-center rounded-full border-[1.5px] border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white disabled:cursor-default disabled:border-line disabled:text-mute/50 disabled:hover:bg-transparent"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}