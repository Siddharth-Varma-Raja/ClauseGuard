"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Calendar as CalendarIcon, List as ListIcon } from "lucide-react";
import Summary, { type RentInfo } from "@/components/timeline/Summary";
import AddEventForm from "@/components/timeline/AddEventForm";
import EventRow from "@/components/timeline/EventRow";
import EmptyState from "@/components/timeline/EmptyState";
import CalendarView from "@/components/timeline/CalendarView";
import LeaseDeadlinesBanner from "@/components/timeline/LeaseDeadlinesBanner";
import PageTour from "@/components/PageTour";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { todayIso } from "@/lib/format";
import { TIMELINE_TOUR } from "@/lib/tours";
import { cn } from "@/lib/cn";
import { deleteEvent, errorMessage, getAnalyses, getAnalysis, getEvents, setEventDone } from "@/lib/api";
import type { TimelineEvent } from "@/lib/notice-types";

const byDate = (a: TimelineEvent, b: TimelineEvent) => a.date.localeCompare(b.date);

async function loadRent(): Promise<RentInfo> {
  const [latest] = await getAnalyses();
  if (!latest) return null;
  const analysis = await getAnalysis(latest.id);
  if (!analysis?.monthlyRentCents) return null;
  return { amount: analysis.monthlyRentCents / 100, from: analysis.tenancyStart ?? latest.createdAt.slice(0, 10) };
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [rent, setRent] = useState<RentInfo>(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined);
  const [actionError, setActionError] = useState("");
  const [tab, setTab] = useState<"Upcoming" | "Past" | "All">("Upcoming");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const today = todayIso();
  const list = events ?? [];
  const isPast = (e: TimelineEvent) => e.date < today || e.done;
  const shown = list.filter((e) => tab === "All" || (tab === "Past") === isPast(e));
  const ordered = tab === "Past" ? [...shown].reverse() : shown;

  useEffect(() => {
    let cancelled = false;
    getEvents()
      .then((data) => !cancelled && setEvents([...data].sort(byDate)))
      .catch((err) => !cancelled && setLoadError(errorMessage(err, "Your timeline could not be loaded.")));
    loadRent()
      .then((info) => !cancelled && setRent(info))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setLoadError("");
    setEvents(null);
    setReloadKey((k) => k + 1);
  }

  async function change(next: TimelineEvent[], save: () => Promise<void>) {
    const previous = events;
    setActionError("");
    setEvents(next);
    try {
      await save();
    } catch (err) {
      setEvents(previous);
      setActionError(errorMessage(err, "That change didn't save. Check your connection and try again."));
    }
  }

  function toggleDone(event: TimelineEvent) {
    const done = !event.done;
    change(
      list.map((e) => (e.id === event.id ? { ...e, done } : e)),
      () => setEventDone(event.id, done),
    );
  }

  function remove(event: TimelineEvent) {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    change(
      list.filter((e) => e.id !== event.id),
      () => deleteEvent(event.id),
    );
  }

  function handleSaved(event: TimelineEvent) {
    setEvents([...list, event].sort(byDate));
    setAdding(false);
    setInitialDate(undefined);
  }

  function handleAddForDate(dateIso: string) {
    setInitialDate(dateIso);
    if (viewMode === "list") {
      setAdding(true);
    }
  }

  function handleCloseAdd() {
    setAdding(false);
    setInitialDate(undefined);
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

      <div data-tour="timeline-summary" className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-light text-brand-dark">Tenancy timeline</h1>
          <p className="mt-2 text-lg text-mute">Keep track of important dates, deadlines and tenancy events.</p>
        </div>
        <button
          data-tour="add-event"
          onClick={() => {
            setInitialDate(undefined);
            setAdding(true);
          }}
          disabled={events === null}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-white disabled:opacity-50"
        >
          <Plus size={18} aria-hidden />
          Add event
        </button>
      </div>

      {loadError ? (
        <div className="mt-8">
          <ErrorState message={loadError} onRetry={retry} />
        </div>
      ) : events === null ? (
        <LoadingState label="Loading your timeline…" />
      ) : (
        <>
          <Summary events={list} rent={rent} today={today} />
          <LeaseDeadlinesBanner
            events={list}
            onEventsAdded={(added) => setEvents([...list, ...added].sort(byDate))}
          />

          {adding && (
            <AddEventForm
              key={initialDate ?? "top-form"}
              initialDate={initialDate}
              onSaved={handleSaved}
              onCancel={handleCloseAdd}
            />
          )}

          {actionError && (
            <p role="alert" className="mt-6 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">
              {actionError}
            </p>
          )}

          {list.length === 0 && !adding ? (
            <EmptyState onAdd={() => setAdding(true)} />
          ) : (
            <div className="mt-8" data-tour="event-list">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div className="inline-flex rounded-xl bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                      viewMode === "list" ? "bg-white text-brand-dark shadow-sm" : "text-mute hover:text-ink",
                    )}
                  >
                    <ListIcon size={16} />
                    List View
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("calendar")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                      viewMode === "calendar" ? "bg-white text-brand-dark shadow-sm" : "text-mute hover:text-ink",
                    )}
                  >
                    <CalendarIcon size={16} />
                    Calendar View
                  </button>
                </div>

                {viewMode === "list" && (
                  <div role="tablist" aria-label="Filter events" className="inline-flex rounded-xl bg-surface p-1">
                    {(["Upcoming", "Past", "All"] as const).map((t) => (
                      <button
                        key={t}
                        role="tab"
                        aria-selected={tab === t}
                        onClick={() => setTab(t)}
                        className={cn(
                          "cursor-pointer rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors",
                          tab === t ? "bg-white text-brand-dark shadow-sm" : "text-mute hover:text-ink",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {viewMode === "calendar" ? (
                <CalendarView
                  events={list}
                  today={today}
                  onToggleDone={toggleDone}
                  onDelete={remove}
                  onAddForDate={handleAddForDate}
                  onEventAdded={handleSaved}
                />
              ) : (
                <ol className="relative mt-6 space-y-4 before:absolute before:bottom-4 before:left-[27px] before:top-4 before:w-px before:bg-line sm:before:left-[35px]">
                  {ordered.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      today={today}
                      onToggleDone={() => toggleDone(event)}
                      onDelete={() => remove(event)}
                    />
                  ))}
                  {ordered.length === 0 && <p className="py-8 text-center text-mute">Nothing here.</p>}
                </ol>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
