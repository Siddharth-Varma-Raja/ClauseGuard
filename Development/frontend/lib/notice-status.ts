import { CircleCheck, Info, ShieldAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Status, StatusCounts } from "./notice-types";

type StatusStyle = {
  label: string;
  risk: string;
  Icon: LucideIcon;
  badge: string;
  solid: string;
  highlight: string;
  colour: string;
};

export const STATUS: Record<Status, StatusStyle> = {
  red: {
    label: "High Risk",
    risk: "High",
    Icon: ShieldAlert,
    badge: "border-bad-line bg-bad-bg text-bad",
    solid: "bg-bad-solid",
    highlight: "border-bad-solid bg-bad-bg",
    colour: "#d92d20",
  },
  amber: {
    label: "Medium Risk",
    risk: "Medium",
    Icon: TriangleAlert,
    badge: "border-warn-line bg-warn-bg text-warn",
    solid: "bg-warn-solid",
    highlight: "border-warn-solid bg-warn-bg",
    colour: "#e5a100",
  },
  green: {
    label: "Low Risk",
    risk: "Low",
    Icon: CircleCheck,
    badge: "border-ok-line bg-ok-bg text-ok",
    solid: "bg-ok-solid",
    highlight: "border-ok-solid bg-ok-bg",
    colour: "#1f9d55",
  },
  grey: {
    label: "informational",
    risk: "Not assessed",
    Icon: Info,
    badge: "border-neu-line bg-neu-bg text-neu",
    solid: "bg-neu-solid",
    highlight: "border-neu-solid bg-neu-bg",
    colour: "#7a8794",
  },
};

export const STATUS_ORDER: Status[] = ["red", "amber", "green", "grey"];

export function overallStatus(counts: StatusCounts): { status: Status; label: string } {
  if (counts.red > 0) return { status: "red", label: "High attention required" };
  if (counts.amber > 0) return { status: "amber", label: "Review suggested" };
  return { status: "green", label: "No issues found" };
}

export function countStatuses(statuses: Status[]): StatusCounts {
  const counts: StatusCounts = { red: 0, amber: 0, green: 0, grey: 0 };
  statuses.forEach((status) => counts[status]++);
  return counts;
}