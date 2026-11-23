"use client"

import Link from "next/link";
import { ArrowRight, FileText, History, CircleAlert, CircleCheck, CircleHelp, Ellipsis, House, Trash2 } from "lucide-react";
import type { AnalysisSummary } from "@/lib/notice-types";
import { useState, useRef, useEffect } from "react";
//import { STATUS, STATUS_ORDER } from "@/lib/status";
//import { cn } from "@/lib/cn";

function formatCreated(iso: string) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

export function leaseVerdict(counts: AnalysisSummary["counts"]) {
    if (counts.red > 0) return { label: "Don't sign yet", tone: "bg-bad-bg text-bad", Icon: CircleAlert, attention: true };
    if (counts.amber > 0) return { label: "Ask questions", tone: "bg-warn-bg text-warn", Icon: CircleHelp, attention: true };
    return {
        label: "Looks good",
        tone: "bg-ok-bg text-ok",
        Icon: CircleCheck,
        attention: false,
    };
}

export default function AnalysisCard({ analysis, onDelete }: { analysis: AnalysisSummary; onDelete: (lease: AnalysisSummary) => void }) {
    const { counts } = analysis;
    const result = leaseVerdict(counts);
    const title = analysis.propertyAddress || analysis.fileName;

    return (
        <li className="grid grid-cols-[minmax(0,1fr)_9rem_auto] items-center gap-x-4 px-6 py-4 lg:grid-cols-[minmax(0,1fr)_14rem_9rem_auto]">
            <div className="flex min-w-0 items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                    <FileText size={20} aria-hidden />
                </span>
                <div className="min-w-0">
                    <Link href={`/lease/${analysis.id}`} className="block font-semibold leading-snug text-ink hover:text-brand hover:underline">
                        {title}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-mute">
                        Uploaded {formatCreated(analysis.createdAt)}
                        {analysis.propertyAddress && ` · ${analysis.fileName}`}
                    </p>
                    {(analysis.versionCount ?? 1) > 1 && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                            <History size={12} aria-hidden />
                            Version {analysis.version} of {analysis.versionCount}
                        </p>
                    )}
                </div>
            </div>

            <p className="hidden text-sm text-mute lg:block">
                <b className="font-semibold text-bad">{counts.red}</b> to fix · <b className="font-semibold text-warn">{counts.amber}</b> to ask · <b className="font-semibold text-ok">{counts.green}</b> fine
            </p>

            <span>
                <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${result.tone}`}>{result.label}</span>
            </span>

            <div className="flex items-center gap-2">
                <Link
                    href={`/lease/${analysis.id}`}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white transition hover:bg-brand active:scale-[0.98]"
                >
                    Open
                    <ArrowRight size={15} aria-hidden />
                </Link>
                <button
                    type="button"
                    onClick={() => onDelete(analysis)}
                    aria-label={`Delete ${title}`}
                    title="Delete lease"
                    className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-line bg-white text-mute transition hover:border-bad-line hover:bg-bad-bg hover:text-bad active:scale-95"
                >
                    <Trash2 size={18} aria-hidden />
                </button>
            </div>
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
        <li className={`relative flex items-start gap-3.5 px-4 py-4 transition-colors active:bg-[#f7fbfb] ${menuOpen ? "z-20" : ""}`}>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
                <FileText size={22} />
            </span>

            <div className="min-w-0 flex-1">
                <Link href={`/lease/${analysis.id}`} className="block font-semibold leading-snug text-ink after:absolute after:inset-0">
                    {title}
                </Link>
                <p className="mt-0.5 text-sm text-mute">Uploaded {formatCreated(analysis.createdAt)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-mute">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${result.tone}`}>
                        <result.Icon size={13} />
                        {result.label}
                    </span>
                    <span>
                        <b className="font-semibold text-bad">{counts.red}</b> fix · <b className="font-semibold text-warn">{counts.amber}</b> ask · <b className="font-semibold text-ok">{counts.green}</b> fine
                    </span>
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
                    <>
                        <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-48 animate-pop-in rounded-2xl border border-line bg-white p-1.5 shadow-xl">
                            <Link href={`/lease/${analysis.id}`} role="menuitem" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink hover:bg-surface">
                                <FileText size={17} aria-hidden />
                                Open lease
                            </Link>
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
                    </>
                )}
            </div>
        </li>
    );
}