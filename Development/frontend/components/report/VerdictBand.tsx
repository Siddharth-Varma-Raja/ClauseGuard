import type { StatusCounts } from "@/lib/notice-types";
import { cn } from "@/lib/cn";
import { BRIGHT, verdictOf } from "./shared";
import Tooltip from "../ui/Tooltip";

const LIGHTS = [
    { key: "red", label: "Don't sign yet", color: BRIGHT.red },
    { key: "amber", label: "Ask before signing", color: BRIGHT.amber },
    { key: "green", label: "Fine to sign", color: BRIGHT.green },
] as const;


export default function VerdictBand({ counts, total, children }: { counts: StatusCounts; total: number; children?: React.ReactNode }) {
    const { level, verdict, reason } = verdictOf(counts, total);

    return (
        <section className="flex animate-fade-up flex-col gap-4 rounded-[28px] bg-[radial-gradient(130%_130%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-5 text-white shadow-[0_14px_36px_-18px_rgb(10_59_67/0.7)] sm:flex-row sm:items-center sm:gap-8 sm:rounded-[32px] sm:p-8">
            <div className="flex items-center gap-4 max-sm:hidden">
                <div className="flex gap-2 rounded-full bg-[#062227] p-2 ring-1 ring-white/10 sm:flex-col">
                    {LIGHTS.map((l) => (
                        <Tooltip key={l.key} text={l.key === level ? `${l.label}: this is the result for your lease` : l.label}>
                            <span
                                className={cn("size-7 rounded-full sm:size-8", l.key !== level && "opacity-20")}
                                style={{ background: l.color, boxShadow: l.key === level ? `0 0 18px ${l.color}` : undefined }}
                            />
                        </Tooltip>
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

            <div className="min-w-0 flex-1 sm:border-l sm:border-white/10 sm:pl-8">
                <p className="flex items-center gap-2 text-sm font-semibold text-white/70">
                    <span className="size-2.5 rounded-full sm:hidden" style={{ background: BRIGHT[level], boxShadow: `0 0 10px ${BRIGHT[level]}` }} aria-hidden />
                    Should you sign this lease?
                </p>
                <p className="mt-1 animate-pop-in font-display text-3xl font-semibold [animation-delay:150ms]" style={{ color: BRIGHT[level] }}>
                    {verdict}
                </p>
                <p className="mt-2 max-w-2xl leading-relaxed text-white/85 sm:text-lg">{reason}</p>
                {children}
            </div>
        </section>
    );
}