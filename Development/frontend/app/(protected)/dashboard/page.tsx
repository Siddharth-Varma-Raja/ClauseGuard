"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileCheck } from "lucide-react";
import PageTour from "@/components/PageTour";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import ErrorState from "@/components/ui/ErrorState";
import RentalOverview from "@/components/dashboard/RentalOverview";
import ActionList from "@/components/dashboard/ActionList";
import LeaseList from "@/components/dashboard/LeaseList";
import TimelineStrip from "@/components/dashboard/TimelineStrip";
import UploadBox from "@/components/lease/UploadBox";
import { useAuth } from "@/components/auth/AuthProvider";
import { DASHBOARD_TOUR, NEW_USER_TOUR } from "@/lib/tours";
import { errorMessage, getAnalyses, getAnalysis, getEvents, getNotices } from "@/lib/api";
import { buildItems, greeting } from "@/lib/dashboard";
import { leaseOpenedTimes } from "@/lib/leaseVisits";
import type { Analysis, AnalysisSummary, NoticeSummary, TimelineEvent } from "@/lib/notice-types";
import FeatureTiles from "@/components/dashboard/FeatureTiles";
import UploadLeaseButton from "@/components/ui/UploadLeaseButton";

const RECENT_COUNT = 3;
const MAX_LEASES_CHECKED = 10;

type DashboardData = {
  leases: AnalysisSummary[];
  details: Analysis[];
  events: TimelineEvent[];
  notices: NoticeSummary[];
  opened: Record<string, number>;
};

async function loadDashboard(): Promise<DashboardData> {
  const [leases, events, notices] = await Promise.all([
    getAnalyses(),
    getEvents().catch(() => []),
    getNotices().catch(() => []),
  ]);
  const found = await Promise.all(leases.slice(0, MAX_LEASES_CHECKED).map((lease) => getAnalysis(lease.id).catch(() => null)));
  const details = found.filter((analysis): analysis is Analysis => analysis !== null);
  return { leases, details, events, notices, opened: leaseOpenedTimes() };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadDashboard()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(errorMessage(err, "Your dashboard could not be loaded.")));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setError("");
    setData(null);
    setReloadKey((k) => k + 1);
  }

  const firstName = user?.displayName?.split(" ")[0];
  const isNewUser = data !== null && data.leases.length === 0;
  const today = new Date().toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });

  const items = data ? buildItems(data.details, data.events, data.notices) : [];

  return (
    <main className="mx-auto max-w-[1240px]">
      {isNewUser && (
        <>
          <PageTour key="new" tourId="dashboard-new" steps={NEW_USER_TOUR} />
          <UploadBox
            title="Check your lease"
            highlight="before you sign"
            subtitle={`Welcome${firstName ? `, ${firstName}` : ""}! Renting in Ireland is stressful. We read every clause and tell you, in plain English, what's fair and what to question.`}
            isNewUser
          >
            <FeatureTiles />
          </UploadBox>
        </>
      )}

      {!isNewUser && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-mute">{today}</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
              {`${greeting()}${firstName ? `, ${firstName}` : ""}`}
            </h1>
          </div>
          {data && (
            <div className="grid w-full grid-cols-1 gap-2.5 sm:mt-4 sm:flex sm:w-auto">
              <PageTour key="returning" tourId="dashboard" steps={DASHBOARD_TOUR} />
              <Link
                href="/notices"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfe3e4] bg-white px-5 py-3.5 font-semibold text-brand-dark transition-all hover:-translate-y-0.5 hover:border-brand"
              >
                <FileCheck size={18} className="text-brand" aria-hidden />
                Check a notice
              </Link>
              <UploadLeaseButton large className="justify-center sm:justify-start" />
            </div>
          )}
        </div>
      )}

      {error ? (
        <div className="mt-8">
          <ErrorState message={error} onRetry={retry} />
        </div>
      ) : !data ? (
        <DashboardSkeleton />
      ) : isNewUser ? null : (
        <>
          <div className={`stagger mt-6 grid gap-5 *:min-w-0 ${data.details.length > 0 ? "lg:grid-cols-[7fr_5fr]" : ""}`}>
            {data.details.length > 0 ? <RentalOverview leases={data.details} events={data.events} /> : null}
            <ActionList items={items} />
          </div>
          <div className="animate-fade-up mt-5" style={{ animationDelay: "200ms" }}>
            <LeaseList leases={data.leases.slice(0, RECENT_COUNT)} details={data.details} totalCount={data.leases.length} opened={data.opened} />
          </div>
          <div className="animate-fade-up mt-5" style={{ animationDelay: "350ms" }}>
            <TimelineStrip events={data.events} lease={data.details[0]} />
          </div>
        </>
      )}
    </main>
  );
}
