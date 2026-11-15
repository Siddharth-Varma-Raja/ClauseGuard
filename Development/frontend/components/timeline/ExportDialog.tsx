"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, CalendarDays, Check, ChevronDown, CircleCheck, X } from "lucide-react";
import type { TimelineEvent } from "@/lib/notice-types";
import { fmtDate } from "@/lib/format";
import { GOOGLE_IMPORT_URL, OUTLOOK_IMPORT_URL, REMINDER_OPTIONS, downloadIcs, googleLink, outlookLink } from "@/lib/calendarExport";
import { KIND_STYLE } from "@/lib/timeline";
import { cn } from "@/lib/cn";
import { GoogleCalendarLogo, OutlookLogo } from "./CalendarLogos";

type Target = "device" | "google" | "outlook";

export default function ExportDialog({
  events,
  initialIds,
  onClose,
}: {
  events: TimelineEvent[];
  initialIds: string[] | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const single = initialIds?.length === 1 ? events.find((e) => e.id === initialIds[0]) ?? null : null;
  const [chosen, setChosen] = useState<Set<string>>(new Set(initialIds ?? events.map((e) => e.id)));
  const [reminder, setReminder] = useState(1);
  const [picking, setPicking] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const selected = single ? [single] : events.filter((e) => chosen.has(e.id));
  const count = selected.length;

  function toggle(id: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function send(target: Target) {
    if (count === 0) return;
    if (target === "google" && count === 1) {
      window.open(googleLink(selected[0]), "_blank", "noopener");
      setDone("Google Calendar opened in a new tab. Press Save there. Google will use your usual reminder time.");
      return;
    }
    if (target === "outlook" && count === 1) {
      window.open(outlookLink(selected[0]), "_blank", "noopener");
      setDone("Outlook opened in a new tab. Press Save there.");
      return;
    }
    downloadIcs(selected, [reminder]);
    if (target === "google") {
      window.open(GOOGLE_IMPORT_URL, "_blank", "noopener");
      setDone(`We downloaded a file with your ${count} dates. In the Google Calendar tab, choose Import and select that file.`);
    } else if (target === "outlook") {
      window.open(OUTLOOK_IMPORT_URL, "_blank", "noopener");
      setDone(`We downloaded a file with your ${count} dates. In the Outlook tab, choose Upload from file and select that file.`);
    } else {
      setDone("Open the downloaded file and your calendar app will add the dates with your reminder.");
    }
  }

  const title = single ? `Remind me about “${single.title}”` : `Get reminders for ${count} date${count === 1 ? "" : "s"}`;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="export-title"
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md animate-pop-in overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl backdrop:bg-ink/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <BellRing size={20} aria-hidden />
          </span>
          <div>
            <h2 id="export-title" className="font-display text-xl font-semibold leading-snug text-brand-dark">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-mute">
              {single ? fmtDate(single.date) : "Add to a calendar to set a reminder."}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-mute hover:bg-surface">
          <X size={20} />
        </button>
      </div>

      {done ? (
        <div className="mt-5">
          <div className="flex items-start gap-3 rounded-2xl border border-ok-line bg-ok-bg p-4 text-sm text-ok">
            <CircleCheck size={20} className="mt-0.5 shrink-0" aria-hidden />
            <p>{done}</p>
          </div>
          <button type="button" onClick={onClose} className="mt-5 h-11 w-full cursor-pointer rounded-xl bg-brand text-sm font-semibold text-white">
            Done
          </button>
        </div>
      ) : (
        <>
          <label className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-[#f2f7f7] px-4 py-3">
            <span className="text-sm font-semibold text-ink">Remind me</span>
            <select
              value={reminder}
              onChange={(e) => setReminder(Number(e.target.value))}
              className="cursor-pointer rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-brand-dark"
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => send("device")}
            disabled={count === 0}
            autoFocus
            className="mt-3 flex w-full cursor-pointer items-center gap-3.5 rounded-2xl bg-brand p-4 text-left text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
              <CalendarDays size={21} aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">Add to my calendar app</span>
              <span className="block text-[13px] text-white/75">Opens in the calendar on your device</span>
            </span>
          </button>

          <div className="my-4 flex items-center gap-3 text-xs text-mute">
            <span className="h-px flex-1 bg-line" />
            or use an online calendar
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => send("google")}
              disabled={count === 0}
              className="flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-line bg-white px-3 py-3 text-sm font-semibold text-ink transition hover:border-brand/40 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GoogleCalendarLogo />
              Google Calendar
            </button>
            <button
              type="button"
              onClick={() => send("outlook")}
              disabled={count === 0}
              className="flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-line bg-white px-3 py-3 text-sm font-semibold text-ink transition hover:border-brand/40 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <OutlookLogo />
              Outlook.com
            </button>
          </div>

          {!single && (
            <div className="mt-4 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => setPicking((v) => !v)}
                aria-expanded={picking}
                className="flex w-full cursor-pointer items-center justify-between text-sm"
              >
                <span className="text-mute">
                  {count === events.length ? `All ${count} upcoming dates` : `${count} of ${events.length} dates`}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-brand">
                  Choose dates
                  <ChevronDown size={16} className={cn("transition-transform", picking && "rotate-180")} aria-hidden />
                </span>
              </button>
              {picking && (
                <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                  {events.map((event) => {
                    const on = chosen.has(event.id);
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggle(event.id)}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface"
                        >
                          <span className={cn("grid size-5 shrink-0 place-items-center rounded-md", on ? "bg-brand text-white" : "border-2 border-neu-line")}>
                            {on && <Check size={13} aria-hidden />}
                          </span>
                          <span className={cn("size-2 shrink-0 rounded-full", KIND_STYLE[event.kind].dot)} />
                          <span className="min-w-0 flex-1 truncate text-sm">{event.title}</span>
                          <span className="shrink-0 text-xs text-mute">{fmtDate(event.date)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <p className="mt-4 text-center text-xs text-mute">Your calendar sends the reminder. ClauseGuard doesn&apos;t send reminders itself.</p>
        </>
      )}
    </dialog>
  );
}
