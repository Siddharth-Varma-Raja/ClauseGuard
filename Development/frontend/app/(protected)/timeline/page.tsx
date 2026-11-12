"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import AddEventForm from "@/components/timeline/AddEventForm";
import AgendaList from "@/components/timeline/AgendaList";
import DayPanel from "@/components/timeline/DayPanel";
import ExportDialog from "@/components/timeline/ExportDialog";
import MiniCalendar from "@/components/timeline/MiniCalendar";
import MonthView from "@/components/timeline/MonthView";
import NextUp from "@/components/timeline/NextUp";
import TenancyStrip from "@/components/timeline/TenancyStrip";
import UndoToast from "@/components/timeline/UndoToast";
import type { EventActions } from "@/components/timeline/EventMenu";
import type { TimelineView } from "@/components/timeline/ViewToggle";
import PageTour from "@/components/PageTour";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { todayIso } from "@/lib/format";
import { TIMELINE_TOUR } from "@/lib/tours";
import { addEvent, deleteEvent, errorMessage, getAnalyses, getAnalysis, getEvents, setEventDone } from "@/lib/api";
import { eventsByDate, isUpcoming, leaseSuggestions, monthStart, nextEvent, type LeaseInfo, type Suggestion } from "@/lib/timeline";
import type { TimelineEvent } from "@/lib/notice-types";

const UNDO_MS = 6000;

const byDate = (a: TimelineEvent, b: TimelineEvent) => a.date.localeCompare(b.date);

async function loadLease(): Promise<LeaseInfo | null> {
  const [latest] = await getAnalyses();
  if (!latest) return null;
  const analysis = await getAnalysis(latest.id);
  if (!analysis?.tenancyStart) return null;
  return {
    start: analysis.tenancyStart,
    termMonths: analysis.termMonths || 12,
    monthlyRent: analysis.monthlyRentCents ? analysis.monthlyRentCents / 100 : null,
  };
}

type FormState = { editing: TimelineEvent | null; date?: string } | null;
type PendingDelete = { event: TimelineEvent; timer: ReturnType<typeof setTimeout> };

export default function TimelinePage() {
  const today = todayIso();
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [lease, setLease] = useState<LeaseInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState("");
  const [view, setView] = useState<TimelineView>("agenda");
  const [month, setMonth] = useState(() => monthStart(todayIso()));
  const [selected, setSelected] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [form, setForm] = useState<FormState>(null);
  const [exportIds, setExportIds] = useState<string[] | null | undefined>(undefined);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEvents()
      .then((data) => !cancelled && setEvents([...data].sort(byDate)))
      .catch((err) => !cancelled && setLoadError(errorMessage(err, "Your timeline could not be loaded.")));
    loadLease()
      .then((info) => !cancelled && setLease(info))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    return () => {
      const last = pendingRef.current;
      if (last) {
        clearTimeout(last.timer);
        deleteEvent(last.event.id).catch(() => undefined);
      }
    };
  }, []);

  const list = events ?? [];
  const upcoming = list.filter((e) => isUpcoming(e, today));
  const suggestions = leaseSuggestions(lease, list, today);

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

  function commitDelete(item: PendingDelete) {
    clearTimeout(item.timer);
    if (pendingRef.current?.event.id === item.event.id) {
      pendingRef.current = null;
      setPending(null);
    }
    deleteEvent(item.event.id).catch((err) => {
      setEvents((current) => [...(current ?? []), item.event].sort(byDate));
      setActionError(errorMessage(err, `"${item.event.title}" couldn't be deleted. Try again.`));
    });
  }

  function remove(event: TimelineEvent) {
    if (pendingRef.current) commitDelete(pendingRef.current);
    setActionError("");
    setEvents((current) => (current ?? []).filter((e) => e.id !== event.id));
    const item: PendingDelete = { event, timer: setTimeout(() => commitDelete(item), UNDO_MS) };
    pendingRef.current = item;
    setPending(item);
  }

  function undoDelete() {
    const item = pendingRef.current;
    if (!item) return;
    clearTimeout(item.timer);
    pendingRef.current = null;
    setPending(null);
    setEvents((current) => [...(current ?? []), item.event].sort(byDate));
  }

  function toggleDone(event: TimelineEvent) {
    const done = !event.done;
    change(
      list.map((e) => (e.id === event.id ? { ...e, done } : e)),
      () => setEventDone(event.id, done),
    );
  }

  function handleSaved(saved: TimelineEvent, replaced?: TimelineEvent) {
    setEvents((current) => [...(current ?? []).filter((e) => e.id !== replaced?.id), saved].sort(byDate));
    setForm(null);
  }

  async function addSuggestion(s: Suggestion) {
    setActionError("");
    try {
      const saved = await addEvent({ title: s.title, date: s.date, kind: s.kind, note: s.note });
      setEvents((current) => [...(current ?? []), saved].sort(byDate));
    } catch (err) {
      setActionError(errorMessage(err, "That date couldn't be added. Try again."));
    }
  }

  function select(date: string) {
    setSelected(date);
    if (date < today) setShowPast(true);
  }

  const actions: EventActions = {
    onEdit: (event) => setForm({ editing: event }),
    onExport: (event) => setExportIds([event.id]),
    onToggleDone: toggleDone,
    onDelete: remove,
  };

  const selectedDay = selected ?? today;

  return (
    <div className="-m-6 min-h-screen bg-[#eaf1f2] p-6 md:-m-8 md:p-8">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-x-4 gap-y-1 2xl:flex-row 2xl:items-baseline">
            <h1 className="whitespace-nowrap font-display text-[28px] font-semibold text-brand-dark">Tenancy timeline</h1>
            <p className="text-[15px] text-mute">Your key dates in one place. Add them to your own calendar to get reminders.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <PageTour tourId="timeline" steps={TIMELINE_TOUR} />
            <div className="flex gap-2.5">
              <button
                type="button"
                data-tour="add-to-calendar"
                onClick={() => setExportIds(null)}
                disabled={upcoming.length === 0}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-brand/30 bg-white px-3.5 text-sm font-semibold text-brand-dark shadow-soft hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarPlus size={17} aria-hidden />
                Add to my calendar
              </button>
              <button
                type="button"
                data-tour="add-event"
                onClick={() => setForm({ editing: null })}
                disabled={events === null}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white shadow-soft hover:bg-brand-dark disabled:opacity-50"
              >
                <Plus size={17} aria-hidden />
                Add date
              </button>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mt-8">
            <ErrorState message={loadError} onRetry={retry} />
          </div>
        ) : events === null ? (
          <LoadingState label="Loading your timeline…" />
        ) : (
          <>
            <TenancyStrip lease={lease} events={list} today={today} />

            {actionError && (
              <p role="alert" className="mt-4 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">
                {actionError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
              <div className="lg:col-start-1 lg:row-start-1">
                <NextUp event={nextEvent(list, today)} today={today} onRemind={actions.onExport} onAdd={() => setForm({ editing: null })} />
              </div>

              <div className="relative min-h-[480px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
                <div className={view === "agenda" ? "h-full lg:absolute lg:inset-0" : "h-full"}>
                  {view === "agenda" ? (
                    <AgendaList
                      events={list}
                      today={today}
                      suggestions={suggestions}
                      showPast={showPast}
                      jumpDate={selected}
                      actions={actions}
                      onShowPastChange={setShowPast}
                      onViewChange={setView}
                      onAddSuggestion={addSuggestion}
                      onExportUpcoming={() => setExportIds(null)}
                      onAdd={() => setForm({ editing: null })}
                    />
                  ) : (
                    <MonthView
                      events={list}
                      today={today}
                      month={month}
                      selected={selectedDay}
                      onMonthChange={setMonth}
                      onSelect={select}
                      onViewChange={setView}
                    />
                  )}
                </div>
              </div>

              <div className="lg:col-start-1 lg:row-start-2">
                {view === "agenda" ? (
                  <MiniCalendar events={list} today={today} month={month} selected={selected} onMonthChange={setMonth} onSelect={select} />
                ) : (
                  <DayPanel
                    date={selectedDay}
                    events={eventsByDate(list).get(selectedDay) ?? []}
                    today={today}
                    actions={actions}
                    onAddForDate={(date) => setForm({ editing: null, date })}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {form && (
        <AddEventForm
          key={form.editing?.id ?? form.date ?? "new"}
          editing={form.editing}
          initialDate={form.date}
          onSaved={handleSaved}
          onCancel={() => setForm(null)}
        />
      )}

      {exportIds !== undefined && (
        <ExportDialog events={upcoming} initialIds={exportIds} onClose={() => setExportIds(undefined)} />
      )}

      {pending && <UndoToast title={pending.event.title} onUndo={undoDelete} onClose={() => commitDelete(pending)} />}
    </div>
  );
}
