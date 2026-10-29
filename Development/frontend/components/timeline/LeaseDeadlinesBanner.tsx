"use client";

import { useEffect, useState } from "react";
import { Sparkles, CalendarPlus, X, Check, LoaderCircle } from "lucide-react";
import Card from "../ui/Card";
import { addEvent, errorMessage, getAnalyses, getAnalysis } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { NewTimelineEvent, TimelineEvent } from "@/lib/notice-types";

type Candidate = {
  id: string;
  title: string;
  date: string;
  kind: "deadline" | "rent" | "event";
  note: string;
};

function addMonthsToIso(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function LeaseDeadlinesBanner({
  events,
  onEventsAdded,
}: {
  events: TimelineEvent[];
  onEventsAdded: (added: TimelineEvent[]) => void;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successCount, setSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function detectDates() {
      try {
        const list = await getAnalyses();
        if (!list || list.length === 0 || cancelled) return;
        const analysis = await getAnalysis(list[0].id);
        if (!analysis || !analysis.tenancyStart || cancelled) return;

        const startIso = analysis.tenancyStart;
        const term = analysis.termMonths || 12;

        const part4Date = addMonthsToIso(startIso, 6);
        const expiryDate = addMonthsToIso(startIso, term);
        const rentReviewDate = addMonthsToIso(startIso, 12);

        const proposed: Candidate[] = [
          {
            id: "part4",
            title: "Part 4 Security of Tenure",
            date: part4Date,
            kind: "deadline",
            note: "Statutory protection under the Residential Tenancies Act: landlord cannot terminate without specific legal grounds.",
          },
          {
            id: "expiry",
            title: "Fixed-Term Lease Expiry",
            date: expiryDate,
            kind: "deadline",
            note: `End of your ${term}-month fixed-term lease period.`,
          },
          {
            id: "rent_review",
            title: "Earliest Statutory Rent Review",
            date: rentReviewDate,
            kind: "rent",
            note: "Under Irish RPZ rules, rent cannot be reviewed more than once every 12 months.",
          },
        ];

        const existingTitles = new Set(events.map((e) => e.title.toLowerCase()));
        const existingDates = new Set(events.map((e) => e.date));

        const unadded = proposed.filter(
          (p) => !existingTitles.has(p.title.toLowerCase()) && !existingDates.has(p.date),
        );

        if (!cancelled && unadded.length > 0) {
          setCandidates(unadded);
          setSelectedIds(new Set(unadded.map((u) => u.id)));
        }
      } catch {
      }
    }

    detectDates();
    return () => {
      cancelled = true;
    };
  }, [events]);

  if (dismissed || candidates.length === 0) return null;

  function toggleCandidate(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleAddSelected() {
    const toAdd = candidates.filter((c) => selectedIds.has(c.id));
    if (toAdd.length === 0) return;

    setSaving(true);
    setSaveError("");
    const addedList: TimelineEvent[] = [];

    try {
      for (const item of toAdd) {
        const payload: NewTimelineEvent = {
          title: item.title,
          date: item.date,
          kind: item.kind,
          note: item.note,
        };
        const saved = await addEvent(payload);
        addedList.push(saved);
      }
      onEventsAdded(addedList);
      setSuccessCount(addedList.length);
      setTimeout(() => {
        setDismissed(true);
      }, 2500);
    } catch (err: unknown) {
      setSaveError(errorMessage(err, "Could not add deadlines to your timeline."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-6 border-brand/30 bg-gradient-to-br from-brand-soft/40 via-white to-surface p-4 sm:p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-sm">
            <Sparkles size={20} aria-hidden />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-brand-dark">
                {candidates.length} Key Deadlines Detected From Your Lease
              </h2>
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">
                Auto-calculated
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-mute">
              We identified statutory milestones based on your uploaded lease agreement. Select which ones you want to track on your timeline:
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          className="rounded-lg p-1 text-mute hover:bg-surface hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>

      {successCount !== null ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm font-semibold text-emerald-800">
          <Check size={18} className="text-emerald-700" />
          Successfully added {successCount} deadline(s) to your timeline!
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {candidates.map((c) => {
              const checked = selectedIds.has(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    checked ? "border-brand/40 bg-white shadow-sm" : "border-line bg-surface/50 opacity-70"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCandidate(c.id)}
                    className="mt-1 size-4 shrink-0 accent-teal-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-brand-dark">{c.title}</span>
                      <strong className="text-xs sm:text-sm text-brand">{fmtDate(c.date)}</strong>
                    </div>
                    <p className="mt-0.5 text-xs text-mute">{c.note}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {saveError && (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              {saveError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="min-h-10 rounded-lg border border-line px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-mute hover:bg-surface hover:text-ink"
            >
              Skip for now
            </button>
            <button
              type="button"
              disabled={saving || selectedIds.size === 0}
              onClick={handleAddSelected}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
              {saving ? "Adding to timeline…" : `Add ${selectedIds.size} deadline(s) to Timeline`}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
