"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import FormField from "./FormField";
import { addEvent, errorMessage, updateEvent } from "@/lib/api";
import type { EventKind, NewTimelineEvent, TimelineEvent } from "@/lib/notice-types";

const MAX_TITLE = 200;

const inputClass = (error?: string) =>
  `w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] ${error ? "border-bad-line" : "border-line"}`;

export default function AddEventForm({
  initialDate,
  editing,
  onSaved,
  onCancel,
}: {
  initialDate?: string;
  editing?: TimelineEvent | null;
  onSaved: (event: TimelineEvent, replaced?: TimelineEvent) => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<NewTimelineEvent>({
    title: editing?.title ?? "",
    date: editing?.date ?? initialDate ?? "",
    kind: editing?.kind ?? "event",
    note: editing?.note ?? "",
  });
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function update(field: keyof NewTimelineEvent, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = "Give the date a title.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) next.date = "Pick a date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveError("");
    const input = { ...form, title: form.title.trim(), note: form.note.trim() };
    try {
      if (editing) onSaved(await updateEvent(editing, input), editing);
      else onSaved(await addEvent(input));
    } catch (error) {
      setSaveError(errorMessage(error, editing ? "The changes didn't save. Try again." : "The date didn't save. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) onCancel();
      }}
      aria-labelledby="event-form-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg animate-pop-in rounded-3xl bg-white p-6 shadow-2xl backdrop:bg-ink/40"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex items-center justify-between">
          <h2 id="event-form-title" className="font-display text-xl font-semibold text-brand-dark">
            {editing ? "Edit date" : "Add a date"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            disabled={saving}
            className="grid size-9 cursor-pointer place-items-center rounded-full text-mute hover:bg-surface"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Title" error={errors.title} className="sm:col-span-2">
            <input
              value={form.title}
              maxLength={MAX_TITLE}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Landlord inspection"
              className={inputClass(errors.title)}
              autoFocus
            />
          </FormField>
          <FormField label="Date" error={errors.date}>
            <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} className={inputClass(errors.date)} />
          </FormField>
          <FormField label="Type">
            <select value={form.kind} onChange={(e) => update("kind", e.target.value as EventKind)} className={inputClass()}>
              <option value="event">Event</option>
              <option value="deadline">Deadline</option>
              <option value="rent">Rent</option>
            </select>
          </FormField>
          <FormField label="Note (optional)" className="sm:col-span-2">
            <input value={form.note} onChange={(e) => update("note", e.target.value)} className={inputClass()} />
          </FormField>
        </div>

        {saveError && (
          <p role="alert" className="mt-4 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">
            {saveError}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editing ? "Save changes" : "Save date"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
