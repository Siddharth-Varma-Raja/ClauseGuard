import type { LucideIcon } from "lucide-react";

export function score(value: number | null | undefined) {
  return value == null ? "–" : value.toFixed(2);
}

export function day(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

export function dayTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${day(iso)} at ${date.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" })}`;
}

export function daysAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (Number.isNaN(days) || days <= 0) return "today";
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function StatCard({ Icon, label, value, note }: { Icon: LucideIcon; label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl border border-[#d5e3e4] bg-white p-5 shadow-soft">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-mute">
        <Icon size={14} aria-hidden className="text-brand" />
        {label}
      </p>
      <p className="mt-2 font-display text-[28px] font-semibold leading-none tabular-nums text-brand-dark">{value}</p>
      <p className="mt-2 text-[13px] text-mute">{note}</p>
    </div>
  );
}

export function TopicChip({ label, strong = false }: { label: string; strong?: boolean }) {
  return (
    <span
      className={
        strong
          ? "inline-flex whitespace-nowrap rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand-dark ring-1 ring-brand/20"
          : "inline-flex whitespace-nowrap rounded-full bg-neu-bg px-2.5 py-1 text-[13px] font-medium text-neu ring-1 ring-neu-line"
      }
    >
      {label}
    </span>
  );
}
