import type { Clause } from "./notice-types";

export const TOPICS = [
  { value: "deposit", label: "Deposit" },
  { value: "rent_review", label: "Rent review" },
  { value: "fees", label: "Fees and charges" },
  { value: "repairs", label: "Repairs" },
  { value: "access", label: "Landlord access" },
  { value: "notice_period", label: "Notice period" },
  { value: "termination", label: "Termination" },
  { value: "waiver", label: "Waiver" },
  { value: "other", label: "General clause" },
];

export function topicLabel(value: string | null | undefined) {
  if (!value) return "";
  return TOPICS.find((t) => t.value === value)?.label ?? value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function clauseTopic(clause: Clause) {
  if (clause.topic) return clause.topic;
  return TOPICS.find((t) => t.label.toLowerCase() === clause.title.trim().toLowerCase())?.value ?? null;
}
