"use client";

import Link from "next/link";
import Summary from "@/components/timeline/Summary";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { todayIso } from "@/lib/format";
import type { TimelineEvent, TimelineResponse } from "@/lib/types";
import AddEventForm from "@/components/timeline/AddEventForm";
import PageTour from "@/components/PageTour";
import { TIMELINE_TOUR } from "@/lib/tours";
import { cn } from "@/lib/cn";
import EventRow from "@/components/timeline/EventRow";

export default function TimelinePage() {
    const [data, setData] = useState<TimelineResponse | null>(null);
    const [adding, setAdding] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [tab, setTab] = useState<"Upcoming" | "Past" | "All">("Upcoming");
    const events = data?.events ?? [];
    const today = todayIso();
    const rent = data?.rent;
    const isPast = (e: TimelineEvent) => e.date < today || e.done;

    const shown = events.filter((e) => tab === "All" || (tab === "Past") === isPast(e));
    const ordered = tab === "Past" ? [...shown].reverse() : shown;

    async function changeEvents(newEvents: TimelineEvent[], saveToBackend: () => Promise<void>) {
        const oldEvents = events;
        setActionError("");
        setData({ ...data!, events: newEvents });
        try {
            await saveToBackend();
        } catch {
            setData({ ...data!, events: oldEvents });
            setActionError("That change didn't save. Check your connection and try again.");
        }
    }

    function toggleDone(event: TimelineEvent) {
        const updated = events.map((e) =>
            e.id === event.id ? { ...e, done: !e.done } : e
        );

        setData((prev) =>
            prev ? { ...prev, events: updated } : prev
        );
    }

    function remove(event: TimelineEvent) {
        setData((prev) =>
            prev
                ? {
                    ...prev,
                    events: prev.events.filter((e) => e.id !== event.id),
                }
                : prev
        );
    }

    function handleSaved(event: TimelineEvent) {
        const sorted = [...events, event].sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        setData((prev) => ({
            ...(prev ?? { events: [], rent: null }),
            events: sorted,
        }));

        setAdding(false);
    }

    return (
        <main className="mx-auto max-w-4xl px-4 py-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-brand hover:underline">
                    <ArrowLeft size={18} />
                    Back
                </Link>
                <PageTour tourId="timeline" steps={TIMELINE_TOUR} />
            </div>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-semibold tracking-light text-brand-dark">Tenancy timeline</h1>
                    <p className="mt-2 text-lg text-mute">Keep track of important dates, deadlines and tenancy events.</p>
                </div>
                <button onClick={() => setAdding(true)} className="bg-brand flex items-center gap-2 text-white px-4 py-2 rounded-lg">
                    <Plus size={18} aria-hidden />
                    Add event
                </button>
            </div>

            <Summary events={events} rent={rent} today={today} />
            {adding && <AddEventForm onSaved={handleSaved} onCancel={() => setAdding(false)} />}
            {actionError && (
                <p role="alert" className="mt-6 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">
                    {actionError}
                </p>
            )}

            <div className="mt-8" data-tour="event-list">
                <>
                    <div
                        role="tablist"
                        aria-label="Filter events"
                        className="mb-5 inline-flex rounded-xl bg-surface p-1"
                    >
                        {(["Upcoming", "Past", "All"] as const).map((t) => (
                            <button
                                key={t}
                                role="tab"
                                aria-selected={tab === t}
                                onClick={() => setTab(t)}
                                className={cn(
                                    "cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                                    tab === t
                                        ? "bg-white text-brand-dark shadow-sm"
                                        : "text-mute hover:text-ink"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-[27px] before:top-4 before:w-px before:bg-line sm:before:left-[35px]">
                        {ordered.map((event) => (
                            <EventRow
                                key={event.id}
                                event={event}
                                today={today}
                                past={isPast(event)}
                                onToggleDone={() => toggleDone(event)}
                                onDelete={() => remove(event)}
                            />
                        ))}

                        {ordered.length === 0 && (
                            <p className="py-8 text-center text-mute">Nothing here.</p>
                        )}
                    </ol>
                </>
            </div>
        </main>
    );
}