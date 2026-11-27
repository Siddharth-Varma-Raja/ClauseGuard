"use client";

import { Check, Loader2, ShieldCheck } from "lucide-react";
import { useRemainingText } from "@/components/lease/useUploadProgress";
import { cn } from "@/lib/cn";

const LINE_WIDTHS = [92, 78, 86, 64, 90, 72, 84, 58, 88, 70];

export default function ProcessingCard({
    steps,
    current,
    durations = [],
    readyAt,
    title = "Reviewing your lease",
    subtitle = "This usually takes a few seconds. Scanned documents can take up to a minute. Keep this page open.",
}: {
    steps: string[];
    current: number;
    durations?: number[];
    readyAt?: number;
    title?: string;
    subtitle?: string;
}) {
    const running = current < steps.length;
    const remaining = useRemainingText(readyAt ?? 0, readyAt !== undefined && running);
    const progress = current / steps.length;
    const percent = Math.round(progress * 100);
    const linesRead = Math.round(progress * LINE_WIDTHS.length);

    return (
        <div data-processing className="mx-auto max-w-4xl px-1 py-2 sm:px-6 md:py-10">
            <div className="grid animate-fade-up overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_24px_60px_-30px_rgb(10_59_67/0.45)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="relative isolate flex items-center gap-5 overflow-hidden bg-[radial-gradient(130%_130%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-5 text-white md:flex-col md:justify-center md:gap-8 md:p-10">
                    <span className="pointer-events-none absolute -right-20 -top-20 -z-10 size-64 rounded-full bg-[radial-gradient(circle,rgb(127_212_220/0.22),transparent_65%)] animate-drift" aria-hidden />

                    <div className="relative w-28 shrink-0 -rotate-2 rounded-xl bg-white p-3 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.55)] animate-float sm:w-32 md:w-52 md:p-5" aria-hidden>
                        <div className="mb-3 h-2 w-1/2 rounded-full bg-brand-dark/80 md:mb-4 md:h-2.5" />
                        <div className="space-y-1.5 md:space-y-2.5">
                            {LINE_WIDTHS.map((width, i) => (
                                <div
                                    key={i}
                                    className={cn("h-1 rounded-full transition-colors duration-700 md:h-1.5", i < linesRead ? "bg-brand" : "bg-line")}
                                    style={{ width: `${width}%` }}
                                />
                            ))}
                        </div>
                        {running && (
                            <span className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-[#7fd4cf]/45 to-transparent animate-scan" />
                        )}
                        <span className="absolute -bottom-3 -right-3 grid size-9 place-items-center rounded-full bg-[#7fd4cf] text-brand-dark shadow-lg ring-4 ring-[#0a3b43] md:size-11">
                            <ShieldCheck size={18} />
                        </span>
                    </div>

                    <div className="min-w-0 flex-1 md:w-full md:flex-none md:text-center">
                        <p className="font-display text-5xl font-semibold leading-none tabular-nums md:text-6xl">
                            {percent}
                            <span className="text-2xl text-white/60 md:text-3xl">%</span>
                        </p>
                        {readyAt !== undefined && running && (
                            <p className="mt-2 text-sm font-semibold tabular-nums text-[#7fd4cf]" aria-live="off">
                                {remaining}
                            </p>
                        )}
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
                            <div
                                className="h-full rounded-full bg-[#7fd4cf] transition-[width] duration-700 ease-out"
                                style={{ width: `${Math.max(progress, 0.05) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-5 sm:p-8 md:p-10">
                    <h1 className="font-display text-2xl font-semibold text-brand-dark sm:text-3xl">{title}</h1>
                    <p className="mt-2 text-sm text-mute sm:text-base">{subtitle}</p>

                    <ol className="relative mt-6" aria-live="polite">
                        {steps.map((step, i) => {
                            const done = i < current;
                            const active = i === current;
                            const last = i === steps.length - 1;
                            return (
                                <li key={step} className="relative flex gap-3.5 pb-4 last:pb-0">
                                    {!last && (
                                        <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-line" aria-hidden>
                                            <span className={cn("block w-full bg-brand transition-[height] duration-700 ease-out", done ? "h-full" : "h-0")} />
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            "relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors duration-500",
                                            done ? "bg-brand text-white" : active ? "bg-brand-dark text-white ring-4 ring-brand-soft" : "border border-line bg-white text-mute",
                                        )}
                                    >
                                        {done ? <Check size={16} className="animate-pop-in" /> : active ? <Loader2 size={16} className="animate-spin" /> : i + 1}
                                    </span>
                                    <div
                                        className={cn(
                                            "flex min-h-8 flex-1 items-center gap-3 rounded-xl px-3 py-1.5 transition-colors duration-500",
                                            active ? "bg-brand-soft" : "",
                                        )}
                                    >
                                        <span className={cn("flex-1 leading-snug", done ? "text-ink" : active ? "font-semibold text-brand-dark" : "text-mute")}>{step}</span>
                                        {done && durations[i] !== undefined && (
                                            <span className="shrink-0 text-sm tabular-nums text-mute">{durations[i].toFixed(1)} s</span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>
        </div>
    );
}