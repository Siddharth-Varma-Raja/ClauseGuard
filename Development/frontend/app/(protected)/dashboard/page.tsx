"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, FileCheck, FilePlusCorner, FileSearchCorner, Upload } from "lucide-react";
import PageTour from "@/components/PageTour";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import AnalysisCard from "@/components/lease/AnalysisCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { DASHBOARD_TOUR } from "@/lib/tours";
import { errorMessage, getAnalyses } from "@/lib/api";
import type { AnalysisSummary } from "@/lib/notice-types";

const CARDS = [
  {
    Icon: FileCheck,
    title: "Check a Notice",
    description: "Check whether a landlord notice follows tenancy requirements and is valid.",
    href: "/notices",
    tour: "check-notice",
  },
  {
    Icon: CalendarClock,
    title: "Tenancy Timeline",
    description: "View a timeline of your tenancy, including important dates and events.",
    href: "/timeline",
    tour: "tenancy-timeline",
  },
] as const;

const RECENT_COUNT = 3;

export default function Dashboard() {
  const { user } = useAuth();
  const [recent, setRecent] = useState<AnalysisSummary[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAnalyses()
      .then((all) => !cancelled && setRecent(all.slice(0, RECENT_COUNT)))
      .catch((err) => !cancelled && setError(errorMessage(err, "Your recent analyses could not be loaded.")));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setError("");
    setRecent(null);
    setReloadKey((k) => k + 1);
  }

  const firstName = user?.displayName?.split(" ")[0];

  return (
    <main className="px-4 mx-auto max-w-5xl">
      <p className="text-mute">Welcome back{firstName ? `, ${firstName}` : ""}!</p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl mt-1 font-semibold tracking-tight font-display">What would you like to do?</h1>
        <PageTour tourId="dashboard" steps={DASHBOARD_TOUR} />
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div data-tour="validate-lease" className="relative flex flex-col gap-8 overflow-hidden rounded-3xl bg-brand-dark p-8 text-white sm:col-span-2 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-lg">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/10"><FileSearchCorner /></span>
            <h2 className="mt-5 font-display text-3xl font-semibold">Check your lease before you sign</h2>
            <p className="mt-2 text-white/80">Upload your lease and ClauseGuard checks every clause against Irish tenancy law.</p>
          </div>

          <div className="relative flex shrink-0 flex-col items-center gap-2">
            <Link
              href="/lease/new"
              className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-white px-10 py-5 text-xl font-semibold text-brand-dark shadow-2xl transition hover:-translate-y-0.5 hover:bg-brand-soft md:w-auto"
            >
              <Upload size={26} aria-hidden />
              Upload lease
            </Link>
          </div>
        </div>

        {CARDS.map(({ Icon, title, description, href, tour }) => (
          <Link href={href} key={title} data-tour={tour} className="group block rounded-2xl border border-gray-300 bg-white p-6 shadow-soft transition-colors hover:border-teal-600 ">
            <div className="flex justify-between ">
              <span className="size-11 grid place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={22} /></span>
              <ArrowRight size={18} className="text-mute" />
            </div>
            <h3 className="text-xl mt-4 font-semibold text-ink font-display">{title}</h3>
            <p className="text-mute mt-2">{description}</p>
          </Link>
        ))}
      </div>

      <section data-tour="recent-analyses" className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-brand-dark font-display">Recent analyses</h2>
          {recent && recent.length > 0 && (
            <Link href="/lease" className="text-sm font-semibold text-brand hover:underline">View all</Link>
          )}
        </div>

        <div className="mt-4">
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : recent === null ? (
            <LoadingState label="Loading your analyses…" />
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center border border-dashed rounded-2xl border-line px-6 py-12 bg-surface/60">
              <div className="bg-brand-soft text-brand mb-5 size-20 place-items-center grid rounded-full">
                <FilePlusCorner size={25} />
              </div>
              <h3 className="text-xl font-semibold text-brand-dark font-display">No leases were analysed yet</h3>
              <p className="mt-2 text-mute max-w-sm text-center">
                Upload a lease and we&apos;ll show you which clauses look fine and which are worth questioning.
              </p>
              <Link href="/lease/new" className="font-semibold mt-6 inline-flex gap-2 items-center bg-brand text-white rounded-xl px-6 py-3">
                <Upload size={20} />
                Upload lease
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recent.map((analysis) => (
                <AnalysisCard key={analysis.id} analysis={analysis} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}