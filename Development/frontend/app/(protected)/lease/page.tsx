"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Plus, Upload } from "lucide-react";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import AnalysisCard from "@/components/lease/AnalysisCard";
import { errorMessage, getAnalyses } from "@/lib/api";
import type { AnalysisSummary } from "@/lib/notice-types";
import PageTour from "@/components/PageTour";
import { LEASES_TOUR } from "@/lib/tours";

export default function LeasePage() {
  const [leases, setLeases] = useState<AnalysisSummary[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAnalyses()
      .then((data) => !cancelled && setLeases(data))
      .catch((err) => !cancelled && setError(errorMessage(err, "Your leases could not be loaded.")));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setError("");
    setLeases(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
        <PageTour tourId="leases" steps={LEASES_TOUR} />
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold font-display text-brand-dark">My leases</h1>
          <p className="mt-2 text-mute">Upload and review your rental agreements.</p>
        </div>
        {leases && leases.length > 0 && (
          <Link
            href="/lease/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            <Plus size={18} aria-hidden />
            Check another lease
          </Link>
        )}
      </div>

      <div data-tour="lease-list" className="mt-8">
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : leases === null ? (
          <LoadingState label="Loading your leases…" />
        ) : leases.length === 0 ? (
          <section className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
              <FileText size={28} />
            </div>
            <h2 className="mt-5 text-xl font-semibold font-display text-brand-dark">No leases yet</h2>
            <p className="mx-auto mt-2 max-w-md text-mute">
              Upload your rental agreement to get started. Once the analysis is complete, your lease will appear here.
            </p>
            <Link
              href="/lease/new"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
            >
              <Upload size={18} />
              Upload your first lease
            </Link>
          </section>
        ) : (
          <section>
            <h2 className="mb-4 text-xl font-semibold text-brand">Your saved leases</h2>
            <ul className="space-y-3">
              {leases.map((lease) => (
                <AnalysisCard key={lease.id} analysis={lease} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}