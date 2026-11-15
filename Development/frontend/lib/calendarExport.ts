import type { TimelineEvent } from "./notice-types";
import { toDate, toIso } from "./timeline";

export const REMINDER_OPTIONS = [
  { days: 0, label: "On the day" },
  { days: 1, label: "1 day before" },
  { days: 3, label: "3 days before" },
  { days: 7, label: "1 week before" },
];

const REMINDER_HOUR = 9;

function compact(iso: string) {
  return iso.replaceAll("-", "");
}

function dayAfter(iso: string) {
  const date = toDate(iso);
  return toIso(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
}

function escapeText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function fold(line: string) {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 60) {
    parts.push(rest.slice(0, 60));
    rest = " " + rest.slice(60);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function trigger(daysBefore: number) {
  const hours = REMINDER_HOUR - daysBefore * 24;
  return hours >= 0 ? `PT${hours}H` : `-PT${-hours}H`;
}

function description(event: TimelineEvent) {
  return [event.note, "Added from your ClauseGuard tenancy timeline."].filter(Boolean).join("\n\n");
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(events: TimelineEvent[], reminderDays: number[]) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ClauseGuard//Tenancy timeline//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  const now = stamp();
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@clauseguard`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${compact(event.date)}`,
      `DTEND;VALUE=DATE:${compact(dayAfter(event.date))}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(description(event))}`,
      "TRANSP:TRANSPARENT",
    );
    for (const days of reminderDays) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(event.title)}`, `TRIGGER:${trigger(days)}`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(events: TimelineEvent[], reminderDays: number[]) {
  const blob = new Blob([buildIcs(events, reminderDays)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = events.length === 1 ? `${slug(events[0].title)}.ics` : "clauseguard-dates.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "clauseguard-date";
}

export function googleLink(event: TimelineEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compact(event.date)}/${compact(dayAfter(event.date))}`,
    details: description(event),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookLink(event: TimelineEvent) {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.date,
    enddt: dayAfter(event.date),
    allday: "true",
    body: description(event),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export const GOOGLE_IMPORT_URL = "https://calendar.google.com/calendar/r/settings/export";
export const OUTLOOK_IMPORT_URL = "https://outlook.live.com/calendar/0/addcalendar";
