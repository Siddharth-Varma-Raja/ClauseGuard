"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Card from "../ui/Card";
import FormField from "./FormField";
import { addEvent, errorMessage } from "@/lib/api";
import type { EventKind, NewTimelineEvent, TimelineEvent } from "@/lib/notice-types";

const MAX_TITLE = 200;

const inputClass = (error?: string) =>
  `w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] ${error ? "border-bad-line" : "border-line"}`;

export default function AddEventForm({
  initialDate,
  onSaved,
  onCancel,
}: {
  initialDate?: string;
  onSaved: (event: TimelineEvent) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<NewTimelineEvent>({
    title: "",
    date: initialDate ?? "",
    kind: "event",
    note: "",
  });
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function update(field: keyof NewTimelineEvent, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = "Give the event a title.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) next.date = "Pick a date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveError("");
    try {
      const saved = await addEvent({ ...form, title: form.title.trim(), note: form.note.trim() });
      onSaved(saved);
    } catch (error) {
      setSaveError(errorMessage(error, "Failed to add event."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-6 p-6">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-brand-dark">New event</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="cursor-pointer rounded-lg p-1.5 text-mute hover:bg-surface"
          >
            <X />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Title" error={errors.title}>
            <input
              value={form.title}
              maxLength={MAX_TITLE}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Landlord inspection"
              className={inputClass(errors.title)}
            />
          </FormField>
          <FormField label="Date" error={errors.date}>
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className={inputClass(errors.date)}
            />
          </FormField>
          <FormField label="Type">
            <select value={form.kind} onChange={(e) => update("kind", e.target.value as EventKind)} className={inputClass()}>
              <option value="event">Event</option>
              <option value="deadline">Deadline</option>
              <option value="rent">Rent</option>
            </select>
          </FormField>
          <FormField label="Note (optional)" className="sm:col-span-3">
            <input value={form.note} onChange={(e) => update("note", e.target.value)} className={inputClass()} />
          </FormField>
        </div>

        {saveError && (
          <p role="alert" className="mt-4 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">
            {saveError}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save event"}
          </button>
        </div>
      </form>
    </Card>
  );
}
