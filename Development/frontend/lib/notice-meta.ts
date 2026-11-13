import { Banknote, CircleCheck, CircleX, DoorOpen, FileQuestion, Gavel, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { NoticeCheck, NoticeType, NoticeVerdict } from "./notice-types";

export type NoticeTypeInfo = {
  value: NoticeType;
  title: string;
  description: string;
  checks: string[];
  Icon: LucideIcon;
};

export const NOTICE_TYPES: NoticeTypeInfo[] = [
  {
    value: "termination",
    title: "Notice to end the tenancy",
    description: "Your landlord says you have to move out.",
    checks: ["Notice period", "Signature", "Reason", "Copy to the RTB"],
    Icon: Gavel,
  },
  {
    value: "rent",
    title: "Rent increase",
    description: "Your landlord wants to raise the rent.",
    checks: ["Increase limit", "Notice period", "Last change"],
    Icon: Banknote,
  },
  {
    value: "entry",
    title: "Visit or inspection",
    description: "Your landlord or a worker wants to come in.",
    checks: ["Notice given", "Agreed time", "Emergency"],
    Icon: DoorOpen,
  },
  {
    value: "other",
    title: "Other notice",
    description: "Any other notice about your home.",
    checks: ["What it means for you"],
    Icon: FileQuestion,
  },
];

export function noticeType(type: NoticeType) {
  return NOTICE_TYPES.find((item) => item.value === type) ?? NOTICE_TYPES[3];
}

type Tone = { label: string; Icon: LucideIcon; text: string; bg: string; ring: string; solid: string };

export const VERDICTS: Record<NoticeVerdict, Tone> = {
  invalid: { label: "Likely not valid", Icon: CircleX, text: "text-bad", bg: "bg-bad-bg", ring: "ring-bad-line", solid: "bg-bad-solid" },
  attention: { label: "Needs review", Icon: TriangleAlert, text: "text-warn", bg: "bg-warn-bg", ring: "ring-warn-line", solid: "bg-warn-solid" },
  valid: { label: "Looks valid", Icon: CircleCheck, text: "text-ok", bg: "bg-ok-bg", ring: "ring-ok-line", solid: "bg-ok-solid" },
  info: { label: "For information", Icon: Info, text: "text-neu", bg: "bg-neu-bg", ring: "ring-neu-line", solid: "bg-neu-solid" },
};

export const CHECKS: Record<NoticeCheck["status"], Tone> = {
  fail: { ...VERDICTS.invalid, label: "Problem" },
  warn: { ...VERDICTS.attention, label: "Check this" },
  pass: { ...VERDICTS.valid, label: "Fine" },
  info: { ...VERDICTS.info, label: "Good to know" },
};

const CHECK_ORDER: NoticeCheck["status"][] = ["fail", "warn", "info", "pass"];

export function sortChecks(checks: NoticeCheck[]) {
  return [...checks].sort((a, b) => CHECK_ORDER.indexOf(a.status) - CHECK_ORDER.indexOf(b.status));
}

export function dateKind(label: string): "deadline" | "rent" | "event" {
  const lower = label.toLowerCase();
  if (["deadline", "dispute", "end", "vacate", "last day", "move out"].some((word) => lower.includes(word))) return "deadline";
  if (lower.includes("rent")) return "rent";
  return "event";
}

export const DATE_KINDS = {
  deadline: { label: "Deadline", dot: "bg-warn-solid" },
  rent: { label: "Rent", dot: "bg-ok-solid" },
  event: { label: "Other date", dot: "bg-brand" },
};
