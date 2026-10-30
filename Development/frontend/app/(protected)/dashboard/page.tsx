"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import PageTour from "@/components/PageTour";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import ErrorState from "@/components/ui/ErrorState";
import Spotlight from "@/components/dashboard/Spotlight";
import AlsoOnList from "@/components/dashboard/AlsoOnList";
import LeaseList from "@/components/dashboard/LeaseList";
import UpcomingDates from "@/components/dashboard/UpcomingDates";
import QuickActions from "@/components/dashboard/QuickActions";
import NewUserDashboard, { EmptyLeases } from "@/components/dashboard/NewUserDashboard";
import { useAuth } from "@/components/auth/AuthProvider";
import { DASHBOARD_TOUR, NEW_USER_TOUR } from "@/lib/tours";
import { errorMessage, getAnalyses, getAnalysis, getEvents, getNotices } from "@/lib/api";
import { allClearItem, buildItems, flaggedClauses, greeting, upcomingEvents } from "@/lib/dashboard";
import { daysUntil, relativeDays } from "@/lib/format";
import type { Analysis, AnalysisSummary, NoticeSummary, TimelineEvent } from "@/lib/notice-types";

const RECENT_COUNT = 3;
const MAX_LEASES_CHECKED = 10;

type DashboardData = {
  leases: AnalysisSummary[];
  details: Analysis[];
  events: TimelineEvent[];
  notices: NoticeSummary[];
};

async function loadDashboard(): Promise<DashboardData> {
  const [leases, events, notices] = await Promise.all([
    getAnalyses(),
    getEvents().catch(() => []),
    getNotices().catch(() => []),
  ]);
  const found = await Promise.all(leases.slice(0, MAX_LEASES_CHECKED).map((lease) => getAnalysis(lease.id).catch(() => null)));
  const details = found.filter((analysis): analysis is Analysis => analysis !== null);
  return { leases, details, events, notices };
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
  const spotlight = items[0] ?? (data ? allClearItem(data.leases) : null);
  const others = items.slice(1).filter((item) => item.kind !== "deadline" && item.kind !== "date");

  const toCheck = data ? data.details.reduce((sum, d) => sum + flaggedClauses(d).filter((c) => !c.reviewed).length, 0) : 0;
  const nextEvent = data ? upcomingEvents(data.events)[0] : undefined;

  return (
    <main className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mute">{today}</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
            {isNewUser ? `Welcome to ClauseGuard${firstName ? `, ${firstName}` : ""}` : `${greeting()}${firstName ? `, ${firstName}` : ""}`}
          </h1>
          {isNewUser ? (
            <p className="mt-2 text-mute">Let's check your first lease.</p>
          ) : data && (toCheck > 0 || nextEvent) ? (
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-medium">
              {toCheck > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full border border-warn-line bg-warn-bg px-3 py-1.5 text-warn">
                  <span className="size-2 rounded-full bg-warn-solid" />
                  {toCheck} {toCheck === 1 ? "clause" : "clauses"} to check
                </span>
              )}
              {nextEvent && (
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-ink">
                  <Clock size={15} className="text-brand"/>
                  {nextEvent.title} {relativeDays(daysUntil(nextEvent.date))}
                </span>
              )}
            </div>
          ) : null}
        </div>
        {data && (
          <PageTour
            key={isNewUser ? "new" : "returning"}
            tourId={isNewUser ? "dashboard-new" : "dashboard"}
            steps={isNewUser ? NEW_USER_TOUR : DASHBOARD_TOUR}
          />
        )}
      </div>

      {error ? (
        <div className="mt-8">
          <ErrorState message={error} onRetry={retry} />
        </div>
      ) : !data || !spotlight ? (
        <DashboardSkeleton />
      ) : isNewUser ? (
        <>
          <NewUserDashboard hasDates={data.events.length > 0} />
          <div className="stagger mt-5 grid gap-5 *:min-w-0 lg:grid-cols-[8fr_4fr]" style={{ "--delay": "300ms" } as React.CSSProperties}>
            <EmptyLeases />
            <UpcomingDates events={data.events} />
          </div>
        </>
      ) : (
        <>
          <div className="stagger mt-6 grid gap-5 *:min-w-0 lg:grid-cols-[7fr_5fr]">
            <Spotlight item={spotlight} />
            <AlsoOnList items={others} latest={data.details[0] ?? null} />
          </div>
          <div className="stagger mt-5 grid gap-5 *:min-w-0 lg:grid-cols-[8fr_4fr]" style={{ "--delay": "200ms" } as React.CSSProperties}>
            <LeaseList leases={data.leases.slice(0, RECENT_COUNT)} details={data.details} totalCount={data.leases.length} />
            <UpcomingDates events={data.events} />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "400ms" }}>
            <QuickActions />
          </div>
        </>
      )}
    </main>
  );
}
