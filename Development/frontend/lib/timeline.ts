import type { EventKind, TimelineEvent } from "./notice-types";

export const KIND_STYLE: Record<EventKind, { label: string; plural: string; pill: string; dot: string; soft: string }> = {
  deadline: {
    label: "Deadline",
    plural: "Deadlines",
    pill: "border-warn-line bg-warn-bg text-warn",
    dot: "bg-warn-solid",
    soft: "bg-warn-bg/70 text-warn",
  },
  rent: {
    label: "Rent",
    plural: "Rent",
    pill: "border-ok-line bg-ok-bg text-ok",
    dot: "bg-ok-solid",
    soft: "bg-ok-bg text-ok",
  },
  event: {
    label: "Event",
    plural: "Events",
    pill: "border-brand/20 bg-brand-soft text-brand-dark",
    dot: "bg-brand",
    soft: "bg-brand-soft text-brand-dark",
  },
};

export const KINDS: EventKind[] = ["deadline", "rent", "event"];

export type LeaseInfo = {
  id: string;
  name: string;
  start: string;
  termMonths: number;
  monthlyRent: number | null;
};

export type AgendaItem = {
  event: TimelineEvent;
  moreDates: number;
};

export type AgendaGroup = {
  label: string;
  items: AgendaItem[];
};

export type Suggestion = {
  title: string;
  date: string;
  kind: EventKind;
  note: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function addMonths(iso: string, months: number) {
  const date = toDate(iso);
  return toIso(new Date(date.getFullYear(), date.getMonth() + months, date.getDate()));
}

export function daysBetween(from: string, to: string) {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);
}

export function monthsBetween(from: string, to: string) {
  const a = toDate(from);
  const b = toDate(to);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return months;
}

export function countdown(date: string, today: string) {
  const days = daysBetween(today, date);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${-days} days ago`;
  if (days < 45) return `in ${days} days`;
  const months = Math.round(days / 30.4);
  return `in ${months} month${months === 1 ? "" : "s"}`;
}

export function weekday(date: string, style: "short" | "long" = "short") {
  return toDate(date).toLocaleDateString("en-IE", { weekday: style });
}

export function monthLabel(date: string, withYear = true) {
  return toDate(date).toLocaleDateString("en-IE", withYear ? { month: "long", year: "numeric" } : { month: "long" });
}

export function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export function monthCells(month: string) {
  const first = toDate(month);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const date = toIso(new Date(first.getFullYear(), first.getMonth(), i - offset + 1));
    return { date, inMonth: date.slice(0, 7) === month.slice(0, 7) };
  });
}

export function eventsByDate(events: TimelineEvent[]) {
  const map = new Map<string, TimelineEvent[]>();
  for (const event of events) map.set(event.date, [...(map.get(event.date) ?? []), event]);
  return map;
}

export function isUpcoming(event: TimelineEvent, today: string) {
  return event.date >= today && !event.done;
}

export function nextEvent(events: TimelineEvent[], today: string) {
  return events.filter((e) => isUpcoming(e, today)).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

export function collapseRepeats(events: TimelineEvent[]): AgendaItem[] {
  const items: AgendaItem[] = [];
  const firstByTitle = new Map<string, AgendaItem>();
  for (const event of events) {
    const key = `${event.kind}:${event.title.trim().toLowerCase()}`;
    const first = firstByTitle.get(key);
    if (event.kind === "rent" && first) {
      first.moreDates += 1;
      continue;
    }
    const item = { event, moreDates: 0 };
    items.push(item);
    if (event.kind === "rent") firstByTitle.set(key, item);
  }
  return items;
}

export function groupAgenda(items: AgendaItem[], today: string): AgendaGroup[] {
  const groups: AgendaGroup[] = [];
  for (const item of items) {
    const label = groupLabel(item.event.date, today);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

function groupLabel(date: string, today: string) {
  const days = daysBetween(today, date);
  if (days < 0) return "Earlier";
  if (days <= 7) return "Next 7 days";
  if (date.slice(0, 7) === today.slice(0, 7)) return `Later in ${monthLabel(date, false)}`;
  if (date.slice(0, 4) === today.slice(0, 4)) return monthLabel(date, false);
  if (days < 92) return monthLabel(date);
  return date.slice(0, 4);
}

export function leaseSuggestions(lease: LeaseInfo | null, events: TimelineEvent[], today: string): Suggestion[] {
  if (!lease) return [];
  const proposed: (Suggestion & { oldTitle: string })[] = [
    {
      title: "Secure tenancy begins",
      oldTitle: "Part 4 Security of Tenure",
      date: addMonths(lease.start, 6),
      kind: "deadline",
      note: "From now your landlord needs a legal reason to end your tenancy (Part 4).",
    },
    {
      title: "Earliest rent review",
      oldTitle: "Earliest Statutory Rent Review",
      date: addMonths(lease.start, 12),
      kind: "rent",
      note: "Rent can only be reviewed once every 12 months.",
    },
    {
      title: "Fixed-term lease ends",
      oldTitle: "Fixed-Term Lease Expiry",
      date: addMonths(lease.start, lease.termMonths),
      kind: "deadline",
      note: `End of your ${lease.termMonths}-month fixed term.`,
    },
  ];
  const titles = new Set(events.map((e) => e.title.trim().toLowerCase()));
  return proposed
    .filter((p) => p.date >= today && !titles.has(p.title.toLowerCase()) && !titles.has(p.oldTitle.toLowerCase()))
    .map(({ title, date, kind, note }) => ({ title, date, kind, note }));
}
