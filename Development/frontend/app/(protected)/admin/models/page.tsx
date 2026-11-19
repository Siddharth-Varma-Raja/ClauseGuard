"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Brain } from "lucide-react";
import ErrorState from "@/components/ui/ErrorState";
import RetrainProgress from "@/components/admin/RetrainProgress";
import ScoreChart from "@/components/admin/ScoreChart";
import VersionTable from "@/components/admin/VersionTable";
import { errorMessage, getLatestRetrain, getModelVersions } from "@/lib/api";
import type { ModelVersion, RetrainRun } from "@/lib/notice-types";
import { cn } from "@/lib/cn";

const POLL_MS = 5000;

export default function AdminModelsPage() {
  const [versions, setVersions] = useState<ModelVersion[] | null>(null);
  const [run, setRun] = useState<RetrainRun | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const running = run?.status === "running";

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
  }, [attempt]);

  useEffect(() => {
    if (!running) return;
    let live = true;
    const timer = window.setTimeout(() => {
      getLatestRetrain()
        .then((latest) => {
          if (!live) return;
          setRun(latest);
          if (latest?.status !== "running") return getModelVersions().then((list) => live && setVersions(list));
        })
        .catch(() => {
          if (live) setRun((r) => (r ? { ...r } : r));
        });
    }, POLL_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [running, run]);

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

      {run && <RetrainProgress run={run} />}

      {versions.length === 0 ? (
        <div className={cn("flex flex-col items-center rounded-3xl border border-dashed border-neu-line bg-surface/60 px-6 py-12 text-center", run ? "mt-4" : "mt-6")}>
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
        <div className={cn("grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]", run ? "mt-4" : "mt-6")}>
          <ScoreChart versions={versions} />
          <VersionTable versions={versions} />
        </div>
      )}
    </>
  );
}
