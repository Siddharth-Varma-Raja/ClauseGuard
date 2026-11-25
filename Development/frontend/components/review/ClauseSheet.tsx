"use client";

import { useState } from "react";
import { BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, ListChecks, FileText, MessageCircleQuestion } from "lucide-react";
import type { Clause } from "@/lib/notice-types";
import { STATUS } from "@/lib/status";
import { cn } from "@/lib/cn";
import BottomSheet from "../ui/BottomSheet";
import AddToEmailButton from "./AddToEmailButton";

type Section = "todo" | "meaning" | "law";

type Props = {
    clause: Clause | null;
    onClose: () => void;
    label?: string;
    position?: { index: number; total: number; onPrev?: () => void; onNext?: () => void };
    reviewed?: { value: boolean; onToggle: () => void };
    email?: { added: boolean; onToggle: () => void };
    action?: { label: string; onClick: () => void };
    onSeeInLease?: () => void;
    onAsk?: () => void;
    className?: string;
};

export default function ClauseSheet(props: Props) {
    const { clause, onClose, className } = props;
    return (
        <BottomSheet open={Boolean(clause)} title={clause ? clause.title : ""} onClose={onClose} className={className}>
            {clause && <SheetBody key={clause.id} {...props} clause={clause} />}
        </BottomSheet>
    );
}

function SheetBody({ clause, label, position, reviewed, email, action, onSeeInLease, onAsk }: Props & { clause: Clause }) {
    const style = STATUS[clause.status];
    const flagged = clause.status === "red" || clause.status === "amber";
    const sections: { id: Section; label: string; Icon: typeof BookOpen; count?: number }[] = [
        ...(clause.nextSteps.length > 0 ? [{ id: "todo" as const, label: "What you can do", Icon: ListChecks, count: clause.nextSteps.length }] : []),
        { id: "meaning", label: "What it means", Icon: FileText },
        { id: "law", label: "Sources", Icon: BookOpen, count: clause.sources.length || undefined },
    ];
    const [openSection, setOpenSection] = useState<Section | null>(sections[0].id);
    const [showWording, setShowWording] = useState(false);

    return (
        <>
            <div className="shrink-0 animate-fade-in px-5 pb-3">
                <div className="flex items-center justify-between gap-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-sm font-semibold ring-1 ring-line", style.text)}>
                        <style.Icon size={15} />
                        {label ?? style.label}
                    </span>
                    {position && (
                        <span className="text-sm font-medium text-mute">
                            {position.index + 1} of {position.total}
                        </span>
                    )}
                </div>
                <h2 className="mt-2 font-display text-[22px] font-semibold leading-snug text-brand-dark">{clause.title}</h2>
                <p className="text-sm text-mute">
                    Clause {clause.number}, page {clause.page}
                </p>
            </div>

            <div className="min-h-0 flex-1 animate-fade-in overflow-y-auto px-5 pb-5">
                {clause.reason && (
                    <div className="mb-4 rounded-2xl bg-surface p-4">
                        <p className={cn("text-sm font-semibold", flagged ? style.text : "text-brand-dark")}>{flagged ? "Why it matters" : "In short"}</p>
                        <p className="mt-1 text-[15px] leading-relaxed text-ink">{clause.reason}</p>
                    </div>
                )}

                <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                    {sections.map((section) => {
                        const isOpen = openSection === section.id;
                        return (
                            <div key={section.id}>
                                <h3>
                                    <button
                                        type="button"
                                        id={`sheet-head-${section.id}`}
                                        aria-expanded={isOpen}
                                        aria-controls={`sheet-part-${section.id}`}
                                        onClick={() => setOpenSection(isOpen ? null : section.id)}
                                        className={cn("flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 text-left font-semibold text-ink", isOpen && "bg-surface")}
                                    >
                                        <section.Icon size={18} className="shrink-0 text-brand" aria-hidden />
                                        <span className="flex-1">{section.label}</span>
                                        {section.count !== undefined && <span className="text-sm font-medium text-mute">{section.count}</span>}
                                        <ChevronDown size={18} className={cn("shrink-0 text-mute transition-transform", isOpen && "rotate-180")} aria-hidden />
                                    </button>
                                </h3>
                                {isOpen && (
                                    <div id={`sheet-part-${section.id}`} role="region" aria-labelledby={`sheet-head-${section.id}`} className="animate-fade-in px-4 pb-4 pt-3">
                                        {section.id === "todo" && (
                                            <ol className="space-y-3">
                                                {clause.nextSteps.map((step, i) => (
                                                    <li key={step} className="flex gap-3 leading-relaxed text-ink">
                                                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-dark text-xs font-bold text-white">{i + 1}</span>
                                                        {step}
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                        {section.id === "meaning" && (
                                            <div>
                                                <p className="leading-relaxed text-ink">{clause.explanation}</p>
                                                {clause.text && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowWording(!showWording)}
                                                            aria-expanded={showWording}
                                                            className="mt-3 inline-flex min-h-[45px] cursor-pointer items-center gap-2 font-semibold text-brand"
                                                        >
                                                            <FileText size={16} aria-hidden />
                                                            {showWording ? "Hide the exact wording" : "Show the exact wording"}
                                                        </button>
                                                        {showWording && <blockquote className="mt-1 border-l-2 border-line pl-4 font-serif italic leading-relaxed text-mute">“{clause.text}”</blockquote>}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {section.id === "law" && (
                                            <div>
                                                {clause.sources.length > 0 ? (
                                                    <ul className="space-y-3">
                                                        {clause.sources.map((source, i) => (
                                                            <li key={`${source.title}-${i}`} className="flex gap-3">
                                                                <BookOpen size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                                                                <span className="min-w-0">
                                                                    {source.url ? (
                                                                        <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand underline-offset-2 hover:underline">
                                                                            {source.title}
                                                                            <ExternalLink size={14} className="shrink-0" aria-hidden />
                                                                            <span className="sr-only">(opens in a new tab)</span>
                                                                        </a>
                                                                    ) : (
                                                                        <span className="font-semibold text-ink">{source.title}</span>
                                                                    )}
                                                                    {source.note && <span className="mt-0.5 block text-sm leading-relaxed text-mute">{source.note}</span>}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-mute">ClauseGuard didn't link a specific law to this clause.</p>
                                                )}
                                                {clause.confidence !== "high" && (
                                                    <p className="mt-3 text-sm text-mute">ClauseGuard is {clause.confidence === "medium" ? "fairly" : "not very"} confident about this result, so double-check it.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {(onSeeInLease || onAsk) && (
                    <div className="mt-5 grid grid-cols-2 gap-2">
                        {onSeeInLease && (
                            <button
                                type="button"
                                onClick={onSeeInLease}
                                className="flex min-h-[45px] cursor-pointer items-center justify-center gap-2 rounded-full border border-line font-semibold text-brand-dark hover:bg-surface"
                            >
                                <FileText size={16} aria-hidden />
                                See in lease
                            </button>
                        )}
                        {onAsk && (
                            <button
                                type="button"
                                onClick={onAsk}
                                className={cn(
                                    "flex min-h-[45px] cursor-pointer items-center justify-center gap-2 rounded-full border border-line font-semibold text-brand-dark hover:bg-surface",
                                    !onSeeInLease && "col-span-2",
                                )}
                            >
                                <MessageCircleQuestion size={16} aria-hidden />
                                Ask about it
                            </button>
                        )}
                    </div>
                )}

                {reviewed && (
                    <button
                        type="button"
                        onClick={reviewed.onToggle}
                        aria-pressed={reviewed.value}
                        className={cn(
                            "mt-3 flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-2xl border px-4 text-left font-semibold transition-colors",
                            reviewed.value ? "border-ok-line bg-ok-bg text-ok" : "border-line text-ink hover:bg-surface",
                        )}
                    >
                        <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border-2", reviewed.value ? "border-ok-solid bg-ok-solid text-white" : "border-mute/50")}>
                            {reviewed.value && <Check size={15} aria-hidden />}
                        </span>
                        {reviewed.value ? "Reviewed" : "Mark as reviewed"}
                    </button>
                )}
            </div>

            {(position || email || action) && (
                <div className="flex shrink-0 items-center gap-2 border-t border-line bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                    {position && (
                        <button
                            type="button"
                            onClick={position.onPrev}
                            disabled={!position.onPrev}
                            aria-label="Previous"
                            className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full border border-line text-brand-dark disabled:cursor-default disabled:opacity-35"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="min-w-0 flex-1">
                        {email ? (
                            <AddToEmailButton added={email.added} onToggle={email.onToggle} fullWidth />
                        ) : action ? (
                            <button
                                type="button"
                                onClick={action.onClick}
                                className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-dark px-3 font-semibold text-white hover:bg-brand"
                            >
                                {action.label}
                            </button>
                        ) : null}
                    </div>
                    {position && (
                        <button
                            type="button"
                            onClick={position.onNext}
                            disabled={!position.onNext}
                            aria-label="Next"
                            className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-brand-dark text-white disabled:cursor-default disabled:bg-line disabled:text-mute"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
