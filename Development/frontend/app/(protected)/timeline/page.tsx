"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Plus } from "lucide-react";
import AddEventForm from "@/components/timeline/AddEventForm";
import AgendaList, { type Focus } from "@/components/timeline/AgendaList";
import ExportDialog from "@/components/timeline/ExportDialog";
import MiniCalendar from "@/components/timeline/MiniCalendar";
import NextUp from "@/components/timeline/NextUp";
import TenancyStrip from "@/components/timeline/TenancyStrip";
import UndoToast from "@/components/timeline/UndoToast";
import type { EventActions } from "@/components/timeline/EventMenu";
import PageTour from "@/components/PageTour";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { todayIso } from "@/lib/format";
import { TIMELINE_TOUR } from "@/lib/tours";
import { addEvent, deleteEvent, errorMessage, getAnalyses, getAnalysis, getEvents, setEventDone } from "@/lib/api";
import { isUpcoming, leaseSuggestions, monthStart, nextEvent, type LeaseInfo, type Suggestion } from "@/lib/timeline";
import type { Analysis, AnalysisSummary, TimelineEvent } from "@/lib/notice-types";

const UNDO_MS = 6000;

const byDate = (a: TimelineEvent, b: TimelineEvent) => a.date.localeCompare(b.date);

const LEASE_KEY = "clauseguard-timeline-lease";

function savedLeaseId() {
  try {
    return localStorage.getItem(LEASE_KEY);
  } catch {
    return null;
  }
}

function saveLeaseId(id: string) {
  try {
    localStorage.setItem(LEASE_KEY, id);
  } catch {}
}

function leaseName(lease: AnalysisSummary) {
  return lease.propertyAddress || lease.fileName;
}

function toLeaseInfo(analysis: Analysis): LeaseInfo | null {
  if (!analysis.tenancyStart) return null;
  return {
    id: analysis.id,
    name: leaseName(analysis),
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
  const [leases, setLeases] = useState<AnalysisSummary[]>([]);
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [lease, setLease] = useState<LeaseInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState("");
  const [month, setMonth] = useState(() => monthStart(todayIso()));
  const [day, setDay] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [form, setForm] = useState<FormState>(null);
  const [exportIds, setExportIds] = useState<string[] | null | undefined>(undefined);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEvents()
      .then((data) => {
        if (cancelled) return;
        setEvents([...data].sort(byDate));
        const asked = new URLSearchParams(window.location.search).get("date");
        if (asked && /^\d{4}-\d{2}-\d{2}$/.test(asked)) {
          setDay(asked);
          setMonth(monthStart(asked));
        }
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err, "Your timeline could not be loaded.")));
    getAnalyses()
      .then((list) => {
        if (cancelled) return;
        const saved = savedLeaseId();
        setLeases(list);
        setLeaseId(list.find((l) => l.id === saved)?.id ?? list[0]?.id ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!leaseId) return;
    let cancelled = false;
    getAnalysis(leaseId)
      .then((analysis) => !cancelled && setLease(analysis ? toLeaseInfo(analysis) : null))
      .catch(() => !cancelled && setLease(null));
    return () => {
      cancelled = true;
    };
  }, [leaseId]);

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

  function showDate(date: string) {
    if (day && day !== date) {
      setDay(date);
      setMonth(monthStart(date));
    }
    setFocus((current) => ({ date, id: (current?.id ?? 0) + 1 }));
  }

  function handleSaved(saved: TimelineEvent, replaced?: TimelineEvent) {
    setEvents((current) => [...(current ?? []).filter((e) => e.id !== replaced?.id), saved].sort(byDate));
    setForm(null);
    showDate(saved.date);
  }

  async function addSuggestion(s: Suggestion) {
    setActionError("");
    try {
      const saved = await addEvent({ title: s.title, date: s.date, kind: s.kind, note: s.note });
      setEvents((current) => [...(current ?? []), saved].sort(byDate));
      showDate(saved.date);
    } catch (err) {
      setActionError(errorMessage(err, "That date couldn't be added. Try again."));
    }
  }

  function chooseLease(id: string) {
    saveLeaseId(id);
    setLeaseId(id);
  }

  function selectDay(date: string) {
    setDay((current) => (current === date ? null : date));
    setCalendarOpen(false);
  }

  const actions: EventActions = {
    onEdit: (event) => setForm({ editing: event }),
    onExport: (event) => setExportIds([event.id]),
    onToggleDone: toggleDone,
    onDelete: remove,
  };

  return (
    <div className="-m-6 min-h-screen bg-[#eaf1f2] p-4 sm:p-6 md:-m-8 md:p-8">
      <div className="mx-auto flex max-w-[1320px] flex-col lg:h-[calc(100dvh-4rem)] lg:min-h-[520px]">
        <div data-tour="timeline-summary" className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="whitespace-nowrap font-display text-2xl font-semibold text-brand-dark sm:text-[28px]">Tenancy timeline</h1>
            <p className="hidden text-[15px] text-mute sm:block">Your key dates in one place. Add them to your own calendar to get reminders.</p>
          </div>
          <PageTour tourId="timeline" steps={TIMELINE_TOUR} />
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:gap-2.5">
            <button
              type="button"
              data-tour="add-to-calendar"
              onClick={() => setExportIds(null)}
              disabled={upcoming.length === 0}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand/30 bg-white px-3.5 text-sm font-semibold text-brand-dark shadow-soft hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BellRing size={17} aria-hidden />
              Get reminders
            </button>
            <button
              type="button"
              data-tour="add-event"
              onClick={() => setForm({ editing: null, date: day ?? undefined })}
              disabled={events === null}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white shadow-soft hover:bg-brand-dark disabled:opacity-50"
            >
              <Plus size={17} aria-hidden />
              Add date
            </button>
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
            <TenancyStrip
              lease={lease}
              leases={leases.map((l) => ({ id: l.id, name: leaseName(l) }))}
              leaseId={leaseId}
              events={list}
              today={today}
              onLeaseChange={chooseLease}
            />

            {actionError && (
              <p role="alert" className="mt-4 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">
                {actionError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="flex flex-col gap-4 lg:min-h-0">
                <div className="shrink-0">
                  <NextUp event={nextEvent(list, today)} today={today} onRemind={actions.onExport} onAdd={() => setForm({ editing: null })} />
                </div>
                <div className={calendarOpen ? "h-[340px] lg:h-auto lg:min-h-0 lg:flex-1" : "hidden lg:block lg:min-h-0 lg:flex-1"}>
                  <MiniCalendar events={list} today={today} month={month} selected={day} onMonthChange={setMonth} onSelect={selectDay} />
                </div>
              </div>

              <div className="relative">
                <div className="h-full lg:absolute lg:inset-0">
                  <AgendaList
                    events={list}
                    today={today}
                    suggestions={suggestions}
                    day={day}
                    focus={focus}
                    showPast={showPast}
                    calendarOpen={calendarOpen}
                    actions={actions}
                    onShowPastChange={setShowPast}
                    onClearDay={() => setDay(null)}
                    onToggleCalendar={() => setCalendarOpen((open) => !open)}
                    onAddSuggestion={addSuggestion}
                    onAdd={(date) => setForm({ editing: null, date })}
                  />
                </div>
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
