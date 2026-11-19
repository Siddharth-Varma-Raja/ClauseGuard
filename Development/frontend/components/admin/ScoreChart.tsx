import type { ModelVersion } from "@/lib/notice-types";
import { cn } from "@/lib/cn";
import { score } from "./shared";

const KEY = [
  { result: "live", label: "Live", swatch: "bg-brand" },
  { result: "replaced", label: "Older", swatch: "bg-[#9fc7cb]" },
  { result: "kept", label: "Not put live", swatch: "border border-dashed border-neu-line bg-neu-bg" },
  { result: "running", label: "Testing now", swatch: "border border-dashed border-brand bg-brand-soft" },
];

const BAR: Record<ModelVersion["result"], string> = {
  live: "bg-brand",
  replaced: "bg-[#9fc7cb]",
  kept: "border border-b-0 border-dashed border-neu-line bg-neu-bg",
  failed: "border border-b-0 border-dashed border-bad-line bg-bad-bg",
  running: "border-2 border-b-0 border-dashed border-brand bg-[repeating-linear-gradient(45deg,#fff_0_6px,var(--color-brand-soft)_6px_12px)]",
};

export default function ScoreChart({ versions }: { versions: ModelVersion[] }) {
  const shown = [...versions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-8);
  const live = shown.find((v) => v.result === "live")?.macroF1 ?? null;
  const used = KEY.filter((k) => shown.some((v) => v.result === k.result));
  const values = shown.map((v) => v.macroF1).filter((v): v is number => v != null);
  const low = values.length ? Math.max(0, Math.floor((Math.min(...values) - 0.05) * 10) / 10) : 0;
  const high = values.length ? Math.min(1, Math.ceil((Math.max(...values) + 0.05) * 10) / 10) : 1;
  const at = (value: number) => Math.min(100, Math.max(3, ((value - low) / (high - low || 1)) * 100));

  return (
    <section aria-labelledby="chart-title" className="rounded-3xl border border-[#d5e3e4] bg-white p-5 shadow-soft">
      <h2 id="chart-title" className="font-display text-[21px] font-semibold text-brand-dark">
        macro-F1 by version
      </h2>
      <p className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-mute">
        {used.map((k) => (
          <span key={k.result} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", k.swatch)} />
            {k.label}
          </span>
        ))}
        {live != null && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-brand" />
            Score to beat
          </span>
        )}
      </p>

      <div className="mt-9 flex gap-2">
        <div aria-hidden className="flex h-44 flex-col justify-between text-right text-[11px] tabular-nums text-mute">
          <span className="-mt-2">{high.toFixed(1)}</span>
          <span className="-mb-2">{low.toFixed(1)}</span>
        </div>
      <div className="relative h-44 flex-1 border-b border-l border-line" role="img" aria-label={shown.map((v) => `${v.version}: ${score(v.macroF1)}`).join(", ")}>
        {live != null && <span aria-hidden className="absolute inset-x-0 border-t-2 border-dashed border-brand/50" style={{ bottom: `${at(live)}%` }} />}
        <div className="absolute inset-0 flex items-end justify-around gap-3 px-2">
          {shown.map((v) => (
            <div key={v.version} className={cn("relative w-full max-w-16 rounded-t-xl", BAR[v.result])} style={{ height: `${at(v.macroF1 ?? live ?? low)}%` }}>
              <span className={cn("absolute -top-7 left-1/2 z-10 w-max -translate-x-1/2 rounded-md bg-white px-1.5 py-0.5 text-[13px] font-bold tabular-nums", v.result === "live" ? "text-brand-dark" : "text-mute")}>
                {v.result === "running" ? "…" : score(v.macroF1)}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>
      <div aria-hidden className="ml-7 flex justify-around gap-3 px-2 pt-2 text-center text-xs text-mute">
        {shown.map((v) => (
          <span key={v.version} className="w-full max-w-16">
            {v.version}
          </span>
        ))}
      </div>
    </section>
  );
}
