"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleCheck, Download, X } from "lucide-react";
import type { TimelineEvent } from "@/lib/notice-types";
import { fmtDate } from "@/lib/format";
import { GOOGLE_IMPORT_URL, OUTLOOK_IMPORT_URL, REMINDER_OPTIONS, downloadIcs, googleLink, outlookLink } from "@/lib/calendarExport";
import { KIND_STYLE } from "@/lib/timeline";
import { cn } from "@/lib/cn";

type Scope = "all" | "deadlines" | "choose";
type Target = "google" | "apple" | "outlook" | "file";

const TARGETS: { value: Target; name: string; detail: string; badge: string; color: string }[] = [
  { value: "google", name: "Google", detail: "Google Calendar", badge: "G", color: "#1a73e8" },
  { value: "apple", name: "Apple", detail: "iPhone, iPad, Mac", badge: "A", color: "#14232a" },
  { value: "outlook", name: "Outlook", detail: "Outlook.com or app", badge: "O", color: "#0f6cbd" },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "border-brand bg-brand text-white" : "border-line bg-white text-mute hover:border-brand/40 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p className="mt-5 text-xs font-bold uppercase tracking-wider text-mute">
      {n} · {children}
    </p>
  );
}

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
  const [scope, setScope] = useState<Scope>(initialIds ? "choose" : "all");
  const [chosen, setChosen] = useState<Set<string>>(new Set(initialIds ?? events.map((e) => e.id)));
  const [reminders, setReminders] = useState<Set<number>>(new Set([1, 7]));
  const [done, setDone] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const deadlines = events.filter((e) => e.kind === "deadline");
  const selected = scope === "all" ? events : scope === "deadlines" ? deadlines : events.filter((e) => chosen.has(e.id));
  const reminderDays = [...reminders].sort((a, b) => b - a);

  function toggle<T>(set: Set<T>, value: T) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function send(target: Target) {
    if (selected.length === 0) return;
    const single = selected.length === 1 ? selected[0] : null;
    if (target === "google" && single) {
      window.open(googleLink(single), "_blank", "noopener");
      setDone("Google Calendar opened in a new tab. Check the details and press Save. Google uses your usual reminder for it.");
      return;
    }
    if (target === "outlook" && single) {
      window.open(outlookLink(single), "_blank", "noopener");
      setDone("Outlook opened in a new tab. Check the details and press Save.");
      return;
    }
    downloadIcs(selected, reminderDays);
    if (target === "google") {
      window.open(GOOGLE_IMPORT_URL, "_blank", "noopener");
      setDone("We saved a calendar file to your downloads. In the Google tab that opened, choose Import and pick that file.");
    } else if (target === "outlook") {
      window.open(OUTLOOK_IMPORT_URL, "_blank", "noopener");
      setDone("We saved a calendar file to your downloads. In the Outlook tab that opened, choose Upload from file and pick that file.");
    } else if (target === "apple") {
      setDone("We saved a calendar file. Open it and your Calendar app will add the dates with your reminders.");
    } else {
      setDone("We saved a calendar file. Open it in any calendar app to add the dates with your reminders.");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="export-title"
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-xl animate-pop-in overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl backdrop:bg-ink/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="export-title" className="font-display text-2xl font-semibold text-brand-dark">
            Add to your calendar
          </h2>
          <p className="mt-1 text-sm text-mute">Your calendar app will remind you. ClauseGuard doesn&apos;t send reminders itself.</p>
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
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setDone("")} className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-surface">
              Add more
            </button>
            <button type="button" onClick={onClose} className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
              Done
            </button>
          </div>
        </div>
      ) : (
        <>
          <StepLabel n={1}>Which dates</StepLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip active={scope === "all"} onClick={() => setScope("all")}>
              All upcoming ({events.length})
            </Chip>
            <Chip active={scope === "deadlines"} onClick={() => setScope("deadlines")}>
              Deadlines only ({deadlines.length})
            </Chip>
            <Chip active={scope === "choose"} onClick={() => setScope("choose")}>
              Choose
            </Chip>
          </div>
          <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
            {(scope === "choose" ? events : selected).map((event) => {
              const on = scope !== "choose" || chosen.has(event.id);
              const kind = KIND_STYLE[event.kind];
              const content = (
                <>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-md", on ? "bg-brand text-white" : "border-2 border-neu-line")}>
                    {on && <Check size={13} aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{event.title}</span>
                    <span className="block text-xs text-mute">{fmtDate(event.date)}</span>
                  </span>
                  <span className={cn("rounded-full border px-2 py-px text-[11px] font-bold", kind.pill)}>{kind.label}</span>
                </>
              );
              const rowClass = cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left",
                on ? "border-brand/30 bg-white" : "border-line bg-surface/60",
              );
              return (
                <li key={event.id}>
                  {scope === "choose" ? (
                    <button type="button" aria-pressed={on} onClick={() => setChosen((s) => toggle(s, event.id))} className={cn(rowClass, "cursor-pointer")}>
                      {content}
                    </button>
                  ) : (
                    <div className={rowClass}>{content}</div>
                  )}
                </li>
              );
            })}
            {selected.length === 0 && scope !== "choose" && <li className="py-2 text-center text-sm text-mute">No dates to add.</li>}
          </ul>

          <StepLabel n={2}>Remind me</StepLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map((o) => (
              <Chip key={o.days} active={reminders.has(o.days)} onClick={() => setReminders((s) => toggle(s, o.days))}>
                {o.label}
              </Chip>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-mute">
            {reminders.size === 0 ? "No reminders will be added." : "Reminders go off at 9am. Pick more than one if you like."}
          </p>

          <StepLabel n={3}>Where</StepLabel>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {TARGETS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => send(t.value)}
                disabled={selected.length === 0}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3 text-left transition-colors hover:border-brand/40 hover:bg-brand-soft/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: t.color }}>
                  {t.badge}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{t.name}</span>
                  <span className="block text-xs text-mute">{t.detail}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => send("file")}
              disabled={selected.length === 0}
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} aria-hidden />
              Download .ics file instead
            </button>
            <span className="text-xs text-mute">
              {selected.length} date{selected.length === 1 ? "" : "s"} selected · works with any calendar app
            </span>
          </div>
        </>
      )}
    </dialog>
  );
}
