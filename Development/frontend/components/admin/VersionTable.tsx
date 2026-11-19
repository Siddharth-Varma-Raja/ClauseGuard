import type { ModelVersion } from "@/lib/notice-types";
import { cn } from "@/lib/cn";
import { day, score } from "./shared";

const RESULT: Record<ModelVersion["result"], { label: string; chip: string }> = {
  live: { label: "Live", chip: "bg-ok-bg text-ok ring-ok-line" },
  running: { label: "Testing", chip: "bg-brand-soft text-brand-dark ring-brand/20" },
  kept: { label: "Not put live, lower score", chip: "bg-neu-bg text-neu ring-neu-line" },
  replaced: { label: "Replaced", chip: "bg-neu-bg text-neu ring-neu-line" },
  failed: { label: "Failed", chip: "bg-bad-bg text-bad ring-bad-line" },
};

export default function VersionTable({ versions }: { versions: ModelVersion[] }) {
  const rows = [...versions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section aria-labelledby="history-title" className="min-w-0 rounded-3xl border border-[#d5e3e4] bg-white p-5 shadow-soft">
      <h2 id="history-title" className="font-display text-[21px] font-semibold text-brand-dark">
        History
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-bold uppercase tracking-wide text-mute">
              <th scope="col" className="px-2 py-2.5">
                Version
              </th>
              <th scope="col" className="px-2 py-2.5">
                Date
              </th>
              <th scope="col" className="px-2 py-2.5">
                Corrections used
              </th>
              <th scope="col" className="px-2 py-2.5">
                macro-F1
              </th>
              <th scope="col" className="px-2 py-2.5">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v, i) => (
              <tr key={v.version} className="border-b border-line">
                <td className="px-2 py-3 font-semibold text-ink">{v.version}</td>
                <td className="whitespace-nowrap px-2 py-3 tabular-nums text-ink">{day(v.createdAt)}</td>
                <td className="px-2 py-3 tabular-nums text-ink">{i === rows.length - 1 ? "Starting set" : `+${v.correctionsAdded}`}</td>
                <td className={cn("px-2 py-3 tabular-nums", v.macroF1 == null ? "text-mute" : "text-ink")}>{v.result === "running" ? "Testing…" : score(v.macroF1)}</td>
                <td className="px-2 py-3">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", RESULT[v.result].chip)}>
                    {v.result === "live" && <span className="size-1.5 rounded-full bg-ok-solid" />}
                    {RESULT[v.result].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
