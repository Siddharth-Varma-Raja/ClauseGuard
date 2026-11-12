import { Calendar, List } from "lucide-react";
import { cn } from "@/lib/cn";

export type TimelineView = "agenda" | "month";

const OPTIONS = [
  { value: "agenda" as const, label: "Agenda", Icon: List },
  { value: "month" as const, label: "Month", Icon: Calendar },
];

export default function ViewToggle({ view, onChange }: { view: TimelineView; onChange: (view: TimelineView) => void }) {
  return (
    <div role="group" aria-label="Timeline view" className="inline-flex shrink-0 rounded-lg bg-[#eaf1f2] p-0.5 text-[13px] font-semibold">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={view === value}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors",
            view === value ? "bg-white text-brand-dark shadow-sm" : "text-mute hover:text-ink",
          )}
        >
          <Icon size={15} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
