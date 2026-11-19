"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Brain, History } from "lucide-react";
import ErrorState from "@/components/ui/ErrorState";
import RetrainProgress from "@/components/admin/RetrainProgress";
import ScoreChart from "@/components/admin/ScoreChart";
import VersionTable from "@/components/admin/VersionTable";
import { useRetrain } from "@/components/admin/useRetrain";
import { errorMessage, getLatestRetrain, getModelVersions } from "@/lib/api";
import type { ModelVersion } from "@/lib/notice-types";

export default function AdminModelsPage() {
  const [versions, setVersions] = useState<ModelVersion[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const retrain = useRetrain();
  const { run, setRun } = retrain;
  const status = run?.status;
  const lastStatus = useRef(status);

  useEffect(() => {
    let live = true;
    Promise.all([getModelVersions(), getLatestRetrain()])
      .then(([list, latest]) => {
        if (!live) return;
        setVersions(list);
        setRun(latest);
        setLoadError("");
      })
      .catch((error) => {
        if (live) setLoadError(errorMessage(error, "Model versions could not be loaded."));
      });
    return () => {
      live = false;
    };
  }, [attempt, setRun]);

  useEffect(() => {
    const was = lastStatus.current;
    lastStatus.current = status;
    if (was === status || !status) return;
    let live = true;
    getModelVersions()
      .then((list) => {
        if (live) setVersions(list);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [status]);

  if (loadError && !versions) {
    return (
      <div className="mt-6">
        <ErrorState message={loadError} onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    );
  }

  if (!versions) {
    return (
      <div aria-busy="true" className="mt-6">
        <p role="status" className="sr-only">
          Loading model versions
        </p>
        <div className="skeleton h-36 rounded-3xl" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="skeleton h-72 rounded-3xl" />
          <div className="skeleton h-72 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-[34px]">Model versions</h1>
        <p className="mt-1.5 text-mute">Every retrain, its score, and which version tenants are using now.</p>
      </div>

      {retrain.notice && (
        <p role="status" className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink">
          {retrain.notice}
        </p>
      )}
      {retrain.error && (
        <p role="alert" className="mt-6 rounded-xl border border-bad-line bg-bad-bg px-4 py-3 text-sm text-bad">
          {retrain.error}
        </p>
      )}

      {run ? (
        <RetrainProgress run={run} retrying={retrain.starting} onRetry={() => retrain.start()} />
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-neu-line bg-surface/60 px-5 py-4 text-sm">
          <History size={20} aria-hidden className="shrink-0 text-mute" />
          <p className="min-w-0 flex-1 text-mute">
            <b className="font-semibold text-ink">No retrains yet.</b> Approve some corrections, then start one from the review queue.
          </p>
          <Link href="/admin/review" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
            Review queue
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      )}

      {versions.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-3xl border border-dashed border-neu-line bg-surface/60 px-6 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
            <Brain size={26} aria-hidden />
          </span>
          <p className="mt-3 font-semibold text-ink">No model versions yet</p>
          <p className="mt-1 max-w-sm text-sm text-mute">Approve some corrections, then start a retrain from the review queue.</p>
          <Link href="/admin/review" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            Go to the review queue
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
          <ScoreChart versions={versions} />
          <VersionTable versions={versions} />
        </div>
      )}
    </>
  );
}
