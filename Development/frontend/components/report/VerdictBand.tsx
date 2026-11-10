import type { StatusCounts } from "@/lib/notice-types";
import { cn } from "@/lib/cn";
import { BRIGHT, verdictOf } from "./shared";

const LIGHTS = [
    { key: "red", label: "Don't sign yet", color: BRIGHT.red },
    { key: "amber", label: "Ask before signing", color: BRIGHT.amber },
    { key: "green", label: "Fine to sign", color: BRIGHT.green },
] as const;


export default function VerdictBand({ counts, total }: { counts: StatusCounts; total: number }) {
    const { level, verdict, reason } = verdictOf(counts, total);

    return (
        <section className="flex flex-col gap-6 rounded-[32px] bg-[radial-gradient(130%_130%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-6 text-white shadow-[0_14px_36px_-18px_rgb(10_59_67/0.7)] sm:flex-row sm:items-center sm:gap-8 sm:p-8">
            <div className="flex items-center gap-4">
                <div className="flex gap-2 rounded-full bg-[#062227] p-2 ring-1 ring-white/10 sm:flex-col" aria-hidden>
                    {LIGHTS.map((l) => (
                        <span
                            key={l.key}
                            className={cn("size-7 rounded-full sm:size-8", l.key !== level && "opacity-20")}
                            style={{ background: l.color, boxShadow: l.key === level ? `0 0 18px ${l.color}` : undefined }}
                        />
                    ))}
                </div>
                <ul className="hidden space-y-2 text-sm sm:block" aria-label="What the light means">
                    {LIGHTS.map((l) => (
                        <li key={l.key} className={cn("flex h-8 items-center", l.key === level ? "font-semibold text-white" : "text-white/45")}>
                            {l.label}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="min-w-0 sm:border-l sm:border-white/10 sm:pl-8">
                <p className="text-sm font-semibold text-white/70">Should you sign this lease?</p>
                <p className="mt-1 font-display text-3xl font-semibold" style={{ color: BRIGHT[level] }}>
                    {verdict}
                </p>
                <p className="mt-2 max-w-2xl text-lg leading-relaxed text-white/85">{reason}</p>
            </div>
        </section>
    );
}