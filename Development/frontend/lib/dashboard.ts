import { daysUntil, fmtDate, todayIso } from "./format";
import type { Analysis, AnalysisSummary, NoticeSummary, TimelineEvent } from "./notice-types";

export type ItemKind = "deadline" | "review" | "notice" | "deposit" | "milestone" | "date" | "setup" | "clear";

export type DashboardItem = {
  key: string;
  kind: ItemKind;
  priority: number;
  tone: "bad" | "warn" | "brand" | "ok";
  label: string;
  title: string;
  text: string;
  href: string;
  action: string;
  days?: number;
  done?: number;
  total?: number;
  rent?: number;
  deposit?: number;
  start?: string;
  end?: string;
};

export function leaseName(fileName: string) {
  return fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").trim() || "Your lease";
}

export function addMonths(iso: string, months: number) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1 + months, day - 1);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function flaggedClauses(analysis: Analysis) {
  return analysis.clauses.filter((c) => c.status === "red" || c.status === "amber");
}

export function upcomingEvents(events: TimelineEvent[]) {
  const today = todayIso();
  return events.filter((e) => !e.done && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function deadlineItems(events: TimelineEvent[]): DashboardItem[] {
  const upcoming = upcomingEvents(events);
  return upcoming.slice(0, 1).map((event) => {
    const days = daysUntil(event.date);
    const soon = days <= 7;
    const after = upcoming[1];
    return {
      key: `event-${event.id}`,
      kind: soon ? "deadline" : "date",
      priority: soon ? 1 : 7,
      tone: soon ? "warn" : "brand",
      label: soon ? "Next deadline" : "Coming up",
      title: event.title,
      text: after
        ? `${fmtDate(event.date)} · After that: ${after.title} on ${fmtDate(after.date)}`
        : `${fmtDate(event.date)}${event.note ? ` · ${event.note}` : ""}`,
      href: "/timeline",
      action: "Open timeline",
      days,
    };
  });
}

function reviewItems(details: Analysis[]): DashboardItem[] {
  return details.flatMap((analysis) => {
    const flagged = flaggedClauses(analysis);
    const left = flagged.filter((c) => !c.reviewed);
    if (left.length === 0) return [];
    const done = flagged.length - left.length;
    const redLeft = left.filter((c) => c.status === "red").length;
    const next = left[0];
    return [
      {
        key: `review-${analysis.id}`,
        kind: "review",
        priority: redLeft > 0 ? 2 : 4,
        tone: redLeft > 0 ? "bad" : "warn",
        label: done > 0 ? "Your review" : "Needs action",
        title: done > 0 ? "Pick up where you left off" : redLeft > 0 ? `${plural(redLeft, "high-risk clause")} to review` : `${plural(left.length, "clause")} to check`,
        text: `${leaseName(analysis.fileName)} · Next up: Clause ${next.number}, ${next.title}`,
        href: `/lease/${analysis.id}`,
        action: done > 0 ? "Continue review" : "Review now",
        done,
        total: flagged.length,
      },
    ];
  });
}

function noticeItems(notices: NoticeSummary[]): DashboardItem[] {
  return notices
    .filter((n) => n.verdict === "invalid" || n.verdict === "attention")
    .slice(0, 2)
    .map((notice) => ({
      key: `notice-${notice.id}`,
      kind: "notice",
      priority: notice.verdict === "invalid" ? 3 : 5,
      tone: notice.verdict === "invalid" ? "bad" : "warn",
      label: "Notice check",
      title: notice.verdict === "invalid" ? "A notice you checked may not be valid" : "A notice you checked needs attention",
      text: notice.summary,
      href: `/notices/${notice.id}`,
      action: "See the result",
    }));
}

function depositItems(details: Analysis[]): DashboardItem[] {
  return details.flatMap((analysis) => {
    const rent = analysis.monthlyRentCents;
    const deposit = analysis.depositCents;
    if (rent == null || deposit == null || deposit <= rent) return [];
    return [
      {
        key: `deposit-${analysis.id}`,
        kind: "deposit",
        priority: 4,
        tone: "warn",
        label: "Worth knowing",
        title: "Your deposit may be over the limit",
        text: `${leaseName(analysis.fileName)} · A deposit can't be more than one month's rent.`,
        href: `/lease/${analysis.id}`,
        action: "See the lease",
        rent: rent / 100,
        deposit: deposit / 100,
      },
    ];
  });
}

function milestoneItems(details: Analysis[], events: TimelineEvent[]): DashboardItem[] {
  const latest = details[0];
  if (!latest?.tenancyStart || events.some((e) => e.source === "lease")) return [];
  const start = latest.tenancyStart.slice(0, 10);
  const end = latest.termMonths ? addMonths(start, latest.termMonths) : undefined;
  const today = todayIso();
  let title = `Your tenancy started on ${fmtDate(start)}`;
  if (start > today) title = `Your tenancy starts on ${fmtDate(start)}`;
  else if (end && end < today) title = `Your lease ended on ${fmtDate(end)}`;
  else if (end) title = `Your lease has ${plural(Math.max(1, Math.round(daysUntil(end) / 30)), "month")} left`;
  return [
    {
      key: `milestone-${latest.id}`,
      kind: "milestone",
      priority: 6,
      tone: "brand",
      label: "Your tenancy",
      title,
      text: "We found these dates in your lease. Add them to your timeline to get reminders.",
      href: "/timeline",
      action: "Add them to my timeline",
      start,
      end,
    },
  ];
}

function setupItems(events: TimelineEvent[]): DashboardItem[] {
  if (events.length > 0) return [];
  return [
    {
      key: "setup-dates",
      kind: "setup",
      priority: 8,
      tone: "brand",
      label: "Get reminders",
      title: "Add your rent day",
      text: "Add rent day or a notice period and ClauseGuard will remind you before it's due.",
      href: "/timeline",
      action: "Add a date",
    },
  ];
}

export function buildItems(details: Analysis[], events: TimelineEvent[], notices: NoticeSummary[]) {
  return [
    ...deadlineItems(events),
    ...reviewItems(details),
    ...noticeItems(notices),
    ...depositItems(details),
    ...milestoneItems(details, events),
    ...setupItems(events),
  ].sort((a, b) => a.priority - b.priority);
}

export function allClearItem(leases: AnalysisSummary[]): DashboardItem {
  const total = leases.reduce((sum, l) => sum + l.counts.red + l.counts.amber + l.counts.green + l.counts.grey, 0);
  return {
    key: "clear",
    kind: "clear",
    priority: 99,
    tone: "ok",
    label: "All clear",
    title: "Your lease is checked and up to date",
    text: `${plural(total, "clause")} checked · nothing needs your action right now.`,
    href: "/lease",
    action: "View my leases",
  };
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}