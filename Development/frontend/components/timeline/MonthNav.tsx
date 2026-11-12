import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthLabel, monthStart } from "@/lib/timeline";

export default function MonthNav({
  month,
  today,
  onChange,
}: {
  month: string;
  today: string;
  onChange: (month: string) => void;
}) {
  const isThisMonth = month === monthStart(today);
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(addMonths(month, -1))}
        aria-label="Previous month"
        className="grid size-7 cursor-pointer place-items-center rounded-md text-mute hover:bg-white hover:text-ink"
      >
        <ChevronLeft size={16} />
      </button>
      <p className="w-32 text-center text-sm font-semibold text-brand-dark" aria-live="polite">
        {monthLabel(month)}
      </p>
      <button
        type="button"
        onClick={() => onChange(addMonths(month, 1))}
        aria-label="Next month"
        className="grid size-7 cursor-pointer place-items-center rounded-md text-mute hover:bg-white hover:text-ink"
      >
        <ChevronRight size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange(monthStart(today))}
        disabled={isThisMonth}
        className="ml-1 cursor-pointer rounded-md px-2 py-0.5 text-xs font-semibold text-brand hover:bg-white disabled:cursor-default disabled:text-mute/60 disabled:hover:bg-transparent"
      >
        Today
      </button>
    </div>
  );
}
