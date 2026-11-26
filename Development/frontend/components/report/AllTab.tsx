"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { ReactNode } from "react";
import type { Clause, Status } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/notice-status";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { CARD, LABEL } from "./shared";
import Tooltip from "../ui/Tooltip";

const PER_PAGE = 8;

const TEXT: Record<Status, string> = { red: "text-bad", amber: "text-warn", green: "text-ok", grey: "text-neu" };

const CHIP: Record<Status, string> = {
    red: "bg-bad-bg text-bad",
    amber: "bg-warn-bg text-warn",
    green: "bg-ok-bg text-ok",
    grey: "bg-neu-bg text-neu",
};

function Row({ c, onOpen, grouped = false }: { c: Clause; onOpen: (c: Clause) => void; grouped?: boolean }) {
    return (
        <li>
            <button
                type="button"
                onClick={() => onOpen(c)}
                className="group flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left transition active:bg-surface sm:grid sm:grid-cols-[2.75rem_minmax(0,1fr)_5rem_10rem_1.5rem] sm:gap-x-4 sm:rounded-2xl sm:border sm:border-line sm:bg-white sm:px-3.5 sm:py-3 sm:hover:border-brand/40 sm:hover:bg-surface/60"
            >
                <Tooltip text={`Clause ${c.number}: ${LABEL[c.status]}`} side="right">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full font-display text-base font-semibold sm:size-11 sm:text-lg", CHIP[c.status])}>{c.number}</span>
                </Tooltip>
                <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug text-ink">{c.title}</span>
                    <span className="mt-0.5 line-clamp-2 text-sm text-mute sm:line-clamp-1">{c.explanation}</span>
                    <span className="mt-1.5 flex items-center gap-2 text-xs text-mute sm:hidden">
                        {!grouped && (
                            <>
                                <span className={cn("size-2 rounded-full", STATUS[c.status].solid)} aria-hidden />
                                <span className="font-semibold text-ink/80">{LABEL[c.status]}</span>
                                <span aria-hidden>·</span>
                            </>
                        )}
                        Page {c.page}
                    </span>
                </span>
                <span className="hidden text-sm text-mute sm:block">Page {c.page}</span>
                <span className="hidden sm:block">
                    <StatusBadge status={c.status} label={LABEL[c.status]} size="sm" />
                </span>
                <ChevronRight size={18} className="shrink-0 text-mute transition-transform group-active:translate-x-0.5" />
            </button>
        </li>
    );
}

function Group({ status, list, onOpen, children }: { status: Status; list: Clause[]; onOpen: (c: Clause) => void; children?: ReactNode }) {
    return (
        <div>
            <h3 className={cn("sticky top-[8.5rem] z-10 flex items-center gap-2 border-b border-line bg-[#f7fbfb]/95 px-4 py-2.5 text-sm font-semibold backdrop-blur", TEXT[status])}>
                <span className={cn("size-2.5 rounded-full", STATUS[status].solid)} aria-hidden />
                {LABEL[status]}
                <span className="font-normal text-mute">· {list.length}</span>
            </h3>
            {children ?? (
                <ul className="row-in divide-y divide-line">
                    {list.map((c) => (
                        <Row key={c.id} c={c} onOpen={onOpen} grouped />
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function AllTab({ clauses, risk, onRisk, onOpen }: { clauses: Clause[]; risk: Status | null; onRisk: (s: Status | null) => void; onOpen: (c: Clause) => void }) {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const [infoShown, setInfoShown] = useState(0);
    const topRef = useRef<HTMLElement>(null);
    const words = query.trim().toLowerCase();
    const found = clauses.filter((c) => (!risk || c.status === risk) && (!words || `${c.number} ${c.title} ${c.text}`.toLowerCase().includes(words)));
    const pages = Math.max(1, Math.ceil(found.length / PER_PAGE));
    const current = Math.min(page, pages - 1);
    const shown = found.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

    const numbers = Array.from({ length: pages }, (_, i) => i).filter((i) => i === 0 || i === pages - 1 || Math.abs(i - current) <= 1);

    function go(next: number) {
        setPage(next);
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function pick(s: Status | null) {
        onRisk(s);
        setPage(0);
    }

    return (
        <section ref={topRef} className={cn(CARD, "scroll-mt-40 overflow-clip")}>
            <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:px-6 lg:flex-row lg:items-center">
                <div role="group" aria-label="Show by risk" className="hidden flex-wrap gap-2 sm:flex">
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
                <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-line bg-surface/60 px-4 focus-within:border-brand focus-within:bg-white lg:ml-auto lg:min-h-0 lg:max-w-xs lg:py-2">
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

            {!words && (
                <div className="sm:hidden">
                    {STATUS_ORDER.filter((st) => (!risk || st === risk) && clauses.some((c) => c.status === st)).map((st) => {
                        const list = clauses.filter((c) => c.status === st);
                        if (st !== "grey") return <Group key={st} status={st} list={list} onOpen={onOpen} />;
                        return (
                            <Group key={st} status={st} list={list} onOpen={onOpen}>
                                <div className="px-4 py-4">
                                    <p className="text-sm text-mute">Standard wording with nothing to do. Tap one to read it in the lease.</p>
                                    <ul className="mt-3 flex flex-wrap gap-2">
                                        {Object.entries(list.reduce<Record<string, number>>((all, c) => ({ ...all, [c.title]: (all[c.title] ?? 0) + 1 }), {})).map(([title, count]) => (
                                            <li key={title} className="rounded-full bg-surface px-3 py-1 text-sm text-ink">
                                                {title}
                                                {count > 1 && <span className="ml-1 font-semibold text-mute">× {count}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                    {infoShown > 0 && (
                                        <ul className="row-in -mx-4 mt-3 divide-y divide-line border-y border-line">
                                            {list.slice(0, infoShown).map((c) => (
                                                <li key={c.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpen(c)}
                                                        className="group flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition active:bg-surface"
                                                    >
                                                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-neu-bg font-display text-sm font-semibold text-neu">{c.number}</span>
                                                        <span className="min-w-0 flex-1 truncate font-medium text-ink">{c.title}</span>
                                                        <span className="shrink-0 text-xs text-mute">Page {c.page}</span>
                                                        <ChevronRight size={17} className="shrink-0 text-mute transition-transform group-active:translate-x-0.5" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {infoShown < list.length && (
                                        <button
                                            type="button"
                                            onClick={() => setInfoShown(Math.min(list.length, infoShown + 20))}
                                            className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line text-sm font-semibold text-brand-dark transition-transform active:scale-95"
                                        >
                                            {infoShown === 0 ? `Show the ${list.length} clauses` : `Show ${Math.min(20, list.length - infoShown)} more`}
                                            <ChevronDown size={16} aria-hidden />
                                        </button>
                                    )}
                                </div>
                            </Group>
                        );
                    })}
                    {risk && (
                        <button type="button" onClick={() => pick(null)} className="flex min-h-12 w-full cursor-pointer items-center justify-center border-t border-line text-sm font-semibold text-brand-dark">
                            Show all {clauses.length} clauses
                        </button>
                    )}
                </div>
            )}

            <div className={cn(!words && "max-sm:hidden")}>
                {found.length === 0 ? (
                    <p className="px-6 py-10 text-center text-mute">No clauses match.</p>
                ) : (
                    <ul key={`${risk}-${words}-${current}`} className="row-in divide-y divide-line sm:space-y-2 sm:divide-y-0 sm:p-4">
                        {shown.map((c) => (
                            <Row key={c.id} c={c} onOpen={onOpen} />
                        ))}
                    </ul>
                )}

                {pages > 1 && (
                    <nav aria-label="Clause pages" className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-6">
                        <span className="text-sm text-mute max-sm:hidden">
                            {current * PER_PAGE + 1}–{current * PER_PAGE + shown.length} of {found.length}
                        </span>
                        <button
                            type="button"
                            onClick={() => go(current - 1)}
                            disabled={current === 0}
                            aria-label="Previous page"
                            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line text-brand-dark transition-transform active:scale-90 disabled:cursor-default disabled:opacity-35 sm:hidden"
                        >
                            <ChevronLeft size={19} />
                        </button>
                        <span key={current} className="animate-fade-in text-center text-sm text-mute sm:hidden">
                            Page <b className="font-semibold text-ink">{current + 1}</b> of {pages}
                            <span className="block text-xs">
                                {current * PER_PAGE + 1}–{current * PER_PAGE + shown.length} of {found.length} clauses
                            </span>
                        </span>
                        <button
                            type="button"
                            onClick={() => go(current + 1)}
                            disabled={current === pages - 1}
                            aria-label="Next page"
                            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-brand-dark text-white transition-transform active:scale-90 disabled:cursor-default disabled:opacity-35 sm:hidden"
                        >
                            <ChevronRight size={19} />
                        </button>
                        <div className="hidden items-center gap-1.5 sm:flex">
                            <Tooltip text="Previous clauses">
                                <button
                                    type="button"
                                    onClick={() => go(current - 1)}
                                    disabled={current === 0}
                                    aria-label="Previous page"
                                    className="grid size-10 cursor-pointer place-items-center rounded-full border-[1.5px] border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white disabled:cursor-default disabled:border-line disabled:text-mute/50 disabled:hover:bg-transparent"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            </Tooltip>
                            {numbers.map((i, index) => (
                                <span key={i} className="flex items-center gap-1.5">
                                    {index > 0 && i - numbers[index - 1] > 1 && <span className="w-4 text-center text-mute" aria-hidden>…</span>}
                                    <button
                                        type="button"
                                        onClick={() => go(i)}
                                        aria-label={`Page ${i + 1}`}
                                        aria-current={i === current ? "page" : undefined}
                                        className={cn("grid size-10 cursor-pointer place-items-center rounded-full text-sm font-semibold transition-colors", i === current ? "bg-brand-dark text-white" : "text-ink hover:bg-surface")}
                                    >
                                        {i + 1}
                                    </button>
                                </span>
                            ))}
                            <Tooltip text="Next clauses">
                                <button
                                    type="button"
                                    onClick={() => go(current + 1)}
                                    disabled={current === pages - 1}
                                    aria-label="Next page"
                                    className="grid size-10 cursor-pointer place-items-center rounded-full border-[1.5px] border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white disabled:cursor-default disabled:border-line disabled:text-mute/50 disabled:hover:bg-transparent"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </Tooltip>
                        </div>
                    </nav>
                )}
            </div>
        </section>
    );
}