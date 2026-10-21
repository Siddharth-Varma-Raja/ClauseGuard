import { STATUS } from "@/lib/notice-status";
import { cn } from "@/lib/cn";
import type { Status } from "@/lib/notice-types";

type StatusBadgeProps = {
  status: Status;
  label?: string;
  size?: "sm" | "md";
};

export default function StatusBadge({ status, label, size = "md" }: StatusBadgeProps) {
  const { Icon, badge } = STATUS[status];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold",
        badge,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <Icon size={size === "sm" ? 13 : 15} aria-hidden />
      {label ?? STATUS[status].label}
    </span>
  );
}
