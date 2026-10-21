import Card from "../ui/Card";
import { X } from "lucide-react";
import { NewTimelineEvent, TimelineEvent, TimelineResponse } from "@/lib/types";
import { use, useState } from "react";
import FormField from "./FormField";

const EMPTY_FORM: NewTimelineEvent = {
    title: "",
    date: "",
    kind: "event",
    note: ""
}

const inputClass = (error?: string) =>
    `w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] ${error ? "border-bad-line" : "border-line"
    }`;

export default function AddEventForm({ onSaved, onCancel }: { onSaved: (event: TimelineEvent) => void, onCancel: () => void }) {
    const [form, setForm] = useState<NewTimelineEvent>(EMPTY_FORM);
    const [errors, setErrors] = useState<{ title?: string; date?: string }>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    function update(field: keyof NewTimelineEvent, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setSaveError("");

        try {
            const res = await fetch("/api/timeline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            if (!res.ok) {
                const payload = await res.json();
                throw new Error(payload.error || "Failed to add event");
            }

            const event = (await res.json()) as TimelineEvent;
            onSaved(event);
        } catch (error) {
            console.error(error);
            setSaveError(error instanceof Error ? error.message : String(error));
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

                <div className="mt-4 grid gap-4 grid-cols-3">
                    <FormField label="Title" error={errors.title}>
                        <input
                            value={form.title}
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
                        <select value={form.kind} onChange={(e) => update("kind", e.target.value)} className={inputClass()}>
                            <option value="event">Event</option>
                            <option value="deadline">Deadline</option>
                            <option value="rent">Rent</option>
                        </select>
                    </FormField>
                    <FormField label="Note (optional)" className="col-span-3">
                        <input value={form.note} onChange={(e) => update("note", e.target.value)} className={inputClass()} />
                    </FormField>
                </div>

                {saveError && (
                    <p role="alert" className="mt-4 rounded-xl border border-bad-line bg-bag-bg p-3 text-sm text-bad">
                        {saveError}
                    </p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="rounded-lg border border-line px-4 py-2 text-sm font-medium">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
                    >
                        {saving ? "Saving..." : "Save event"}
                    </button>
                </div>
            </form>
        </Card>
    );
}