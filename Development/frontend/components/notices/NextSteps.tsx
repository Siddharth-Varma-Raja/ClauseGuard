"use client";

import { useState } from "react";
import Pager from "@/components/timeline/Pager";
import { useShortScreen } from "@/lib/useShortScreen";

export default function NextSteps({ steps, className = "" }: { steps: string[]; className?: string }) {
  const [page, setPage] = useState(0);
  const pageSize = useShortScreen() ? 2 : 4;
  const pages = Math.max(1, Math.ceil(steps.length / pageSize));
  const current = Math.min(page, pages - 1);
  const start = current * pageSize;

  return (
    <section className={`rounded-2xl border border-[#d5e3e4] bg-white p-5 shadow-soft ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[17px] font-semibold text-brand-dark">What to do next</h2>
        <Pager page={current} pages={pages} label="Pages of next steps" onChange={setPage} />
      </div>
      <ol start={start + 1} className="mt-3 space-y-3">
        {steps.slice(start, start + pageSize).map((step, index) => (
          <li key={`${start + index}-${step}`} className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{start + index + 1}</span>
            <p className="text-[13.5px] leading-snug text-ink">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
