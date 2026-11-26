"use client"

import Link from "next/link";
import { ChevronDown, Ellipsis, FileText, History, Trash2 } from "lucide-react";
import type { AnalysisSummary, Status } from "@/lib/notice-types";
import { useState, useRef, useEffect } from "react";
import { STATUS, STATUS_ORDER } from "@/lib/status";

function formatCreated(iso: string) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

export function leaseVerdict(counts: AnalysisSummary["counts"]) {
    const level: Status = counts.red > 0 ? "red" : counts.amber > 0 ? "amber" : "green";
    const status = STATUS[level];
    return {
        level,
        label: status.label,
        tone: `${status.soft} ${status.text}`,
        Icon: status.Icon,
        attention: level !== "green",
    };
}

export function RiskCounts({ counts }: { counts: AnalysisSummary["counts"] }) {
    return (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {STATUS_ORDER.filter((key) => key !== "grey").map((key) => (
                <span key={key} className="inline-flex items-center gap-1.5" title={STATUS[key].label}>
                    <span className={`size-2 rounded-full ${STATUS[key].solid}`} aria-hidden />
                    <b className="font-semibold text-ink">{counts[key]}</b>
                    <span className="sr-only">{STATUS[key].label}</span>
                    <span aria-hidden>{STATUS[key].risk}</span>
                </span>
            ))}
        </span>
    );
}

export function RiskLegend() {
    return (
        <ul aria-label="What the colours mean" className="grid gap-x-6 gap-y-2 text-[13px] text-mute sm:grid-cols-2 lg:flex lg:flex-wrap">
            {STATUS_ORDER.map((key) => (
                <li key={key} className="flex items-start gap-2">
                    <span className={`mt-1 size-2.5 shrink-0 rounded-full ${STATUS[key].solid}`} aria-hidden />
                    <span>
                        <b className={`font-semibold ${STATUS[key].text}`}>{STATUS[key].label}</b> – {STATUS[key].hint}
                    </span>
                </li>
            ))}
        </ul>
    );
}

export function MobileRiskLegend() {
    return (
        <details className="group/legend">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-brand-dark [&::-webkit-details-marker]:hidden">
                <span className="flex -space-x-0.5" aria-hidden>
                    {STATUS_ORDER.map((key) => (
                        <span key={key} className={`size-2.5 rounded-full ring-2 ring-[#f7fbfb] ${STATUS[key].solid}`} />
                    ))}
                </span>
                What do the colours mean?
                <ChevronDown size={16} aria-hidden className="ml-auto transition-transform duration-200 group-open/legend:rotate-180" />
            </summary>
            <div className="pb-2 pt-1 animate-fade-up">
                <RiskLegend />
            </div>
        </details>
    );
}

export default function AnalysisCard({ analysis, onDelete }: { analysis: AnalysisSummary; onDelete: (lease: AnalysisSummary) => void }) {
    const { counts } = analysis;
    const result = leaseVerdict(counts);
    const title = analysis.propertyAddress || analysis.fileName;

    return (
        <li className="group relative grid h-[76px] grid-cols-[minmax(0,1fr)_9rem_2.5rem] items-center gap-x-4 px-6 transition-colors duration-200 hover:bg-brand-soft has-[a:focus-visible]:bg-brand-soft has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-brand lg:grid-cols-[minmax(0,1fr)_17rem_9rem_2.5rem]">
            <div className="flex min-w-0 items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark transition-colors duration-200 group-hover:bg-white">
                    <FileText size={20} aria-hidden />
                </span>
                <div className="min-w-0">
                    <Link
                        href={`/lease/${analysis.id}`}
                        title={title}
                        className="line-clamp-2 font-semibold leading-snug text-ink [overflow-wrap:anywhere] outline-none after:absolute after:inset-0 group-hover:text-brand-dark group-hover:underline"
                    >
                        {title}
                    </Link>
                    <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-mute">
                        <span className="truncate">Uploaded {formatCreated(analysis.createdAt)}</span>
                        {(analysis.versionCount ?? 1) > 1 && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand">
                                <History size={12} aria-hidden />
                                Version {analysis.version} of {analysis.versionCount}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            <p className="hidden text-sm text-mute lg:block">
                <RiskCounts counts={counts} />
            </p>

            <span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${result.tone}`}>
                    <result.Icon size={13} aria-hidden />
                    {result.label}
                </span>
            </span>

            <button
                type="button"
                onClick={() => onDelete(analysis)}
                aria-label={`Delete ${title}`}
                title="Delete lease"
                className="relative z-10 grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-line bg-white text-mute transition hover:border-bad-line hover:bg-bad-bg hover:text-bad active:scale-95"
            >
                <Trash2 size={18} aria-hidden />
            </button>
        </li>
    );
}

export function MobileLeaseRow({ analysis, onDelete }: { analysis: AnalysisSummary; onDelete: (lease: AnalysisSummary) => void }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function onOutside(event: PointerEvent) {
            if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
        }
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") setMenuOpen(false);
        }
        document.addEventListener("pointerdown", onOutside);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onOutside);
            document.removeEventListener("keydown", onKey);
        };
    }, [menuOpen]);
    const { counts } = analysis;
    const result = leaseVerdict(counts);
    const title = analysis.propertyAddress || analysis.fileName;

    return (
        <li className={`relative flex items-start gap-3.5 px-4 py-4 transition-colors active:bg-brand-soft ${menuOpen ? "z-20" : ""}`}>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
                <FileText size={22} />
            </span>

            <div className="min-w-0 flex-1">
                <Link href={`/lease/${analysis.id}`} className="block font-semibold leading-snug text-ink [overflow-wrap:anywhere] after:absolute after:inset-0">
                    {title}
                </Link>
                <p className="mt-0.5 text-sm text-mute">Uploaded {formatCreated(analysis.createdAt)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-mute">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${result.tone}`}>
                        <result.Icon size={13} />
                        {result.label}
                    </span>
                    <RiskCounts counts={counts} />
                </div>
                {(analysis.versionCount ?? 1) > 1 && (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                        <History size={12} />
                        Version {analysis.version} of {analysis.versionCount}
                    </p>
                )}
            </div>

            <div ref={menuRef} className="relative z-10 -mr-2 -mt-1.5">
                <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label={`More options for ${title}`}
                    aria-expanded={menuOpen}
                    className="grid size-11 cursor-pointer place-items-center rounded-full text-mute transition hover:bg-surface active:scale-90"
                >
                    <Ellipsis size={20} />
                </button>
                {menuOpen && (
                    <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-44 animate-pop-in rounded-2xl border border-line bg-white p-1.5 shadow-xl">
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setMenuOpen(false);
                                onDelete(analysis);
                            }}
                            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-bad hover:bg-bad-bg"
                        >
                            <Trash2 size={17} />
                            Delete lease
                        </button>
                    </div>
                )}
            </div>
        </li>
    );
}