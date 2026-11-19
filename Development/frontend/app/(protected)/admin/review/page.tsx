"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, CircleCheck, Hourglass } from "lucide-react";
import ErrorState from "@/components/ui/ErrorState";
import ReviewQueue from "@/components/admin/ReviewQueue";
import RetrainCard from "@/components/admin/RetrainCard";
import { StatCard, day, daysAgo, score } from "@/components/admin/shared";
import { decideCorrection, errorMessage, getLatestRetrain, getModelSummary, getReviewQueue, startRetrain } from "@/lib/api";
import type { CorrectionStatus, ModelSummary, RetrainRun, ReviewCorrection } from "@/lib/notice-types";

type Loaded = { model: ModelSummary; rows: ReviewCorrection[]; run: RetrainRun | null };

export default function AdminReviewPage() {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([getModelSummary(), getReviewQueue(), getLatestRetrain()])
      .then(([model, rows, run]) => {
        if (!live) return;
        const sorted = [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setData({ model, rows: sorted, run });
        setLoadError("");
      })
      .catch((error) => {
        if (live) setLoadError(errorMessage(error, "The review queue could not be loaded."));
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  async function decide(row: ReviewCorrection, status: CorrectionStatus) {
    setBusy((ids) => [...ids, row.id]);
    setErrors((e) => {
      const next = { ...e };
      delete next[row.id];
      return next;
    });
    try {
      await decideCorrection(row.id, status);
      setData((d) => d && { ...d, rows: d.rows.map((r) => (r.id === row.id ? { ...r, status } : r)) });
    } catch (error) {
      setErrors((e) => ({ ...e, [row.id]: errorMessage(error, "That didn't save. Try again.") }));
    } finally {
      setBusy((ids) => ids.filter((x) => x !== row.id));
    }
  }

  async function retrain() {
    setStarting(true);
    setStartError("");
    try {
      await startRetrain();
      router.push("/admin/models");
    } catch (error) {
      setStartError(errorMessage(error, "The retrain could not be started."));
      setStarting(false);
    }
  }

  if (loadError && !data) {
    return (
      <div className="mt-6">
        <ErrorState message={loadError} onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    );
  }

  if (!data) {
    return (
      <div aria-busy="true" className="mt-6">
        <p role="status" className="sr-only">
          Loading the review queue
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-28 rounded-3xl" />
        </div>
        <div className="skeleton mt-4 h-80 rounded-3xl" />
      </div>
    );
  }

  const { model, rows, run } = data;
  const approvedNow = rows.filter((r) => r.status === "approved").length;
  const decidedNow = rows.filter((r) => r.status !== "pending").length;
  const approved = model.approvedSinceRetrain + approvedNow;
  const waiting = Math.max(0, model.waiting - decidedNow);
  const oldest = rows.find((r) => r.status === "pending");

  return (
    <>
      <div className="mt-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-[34px]">Corrections waiting for review</h1>
        <p className="mt-1.5 text-mute">Topics tenants say ClauseGuard got wrong. Approved ones are used in the next retrain.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard Icon={Brain} label="Model in use" value={`${model.version} · ${score(model.macroF1)}`} note={`macro-F1 score · live since ${day(model.liveSince)}`} />
        <StatCard Icon={CircleCheck} label="Approved since last retrain" value={String(approved)} note={approved ? "Ready to add to the labelled set" : "Nothing approved yet"} />
        <StatCard Icon={Hourglass} label="Waiting for review" value={String(waiting)} note={oldest ? `Oldest sent ${daysAgo(oldest.createdAt)}` : "All caught up"} />
      </div>

      <ReviewQueue rows={rows} busy={busy} errors={errors} onDecide={decide} />

      <RetrainCard approved={approved} currentScore={model.macroF1} run={run} starting={starting} error={startError} onStart={retrain} />
    </>
  );
}
