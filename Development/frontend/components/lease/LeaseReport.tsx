"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, ChevronRight, Download, FileText, Info, LayoutGrid, List, ListChecks } from "lucide-react";
import Alert from "@/components/ui/Alert";
import { addEvent, errorMessage, getEvents } from "@/lib/api";
import type { Analysis, Clause, NewTimelineEvent, Status } from "@/lib/notice-types";
import LandlordEmailPanel from "@/components/review/LandlordEmailPanel";
import { loadRaised, saveRaised } from "@/lib/raisedClauses";
import { OlderVersionNote, PrintHeader } from "./ReportExtras";
import { CountBoxes, LeaseDetails, NextSteps, ShortAnswer } from "./ReportSummary";
import FlaggedClauses from "./FlaggedClauses";
import AllClauses from "./AllClauses";
import Overview from "@/components/report/Overview";
import AllTab from "@/components/report/AllTab";
import DetailsTab from "@/components/report/DetailsTab";
import LeaseActionList from "@/components/review/LeaseActionList";
import { actionCount } from "@/lib/actionList";
import { useAuth } from "@/components/auth/AuthProvider";

import { cn } from "@/lib/cn";
import { pdf } from "@react-pdf/renderer";
import ReportPdf from "../report/ReportPdf";

const TAB_SHORT: Record<string, string> = { overview: "Overview", details: "Details", actions: "Actions", all: "Clauses" };
const TAB_ICONS: Record<string, typeof List> = { overview: LayoutGrid, details: FileText, actions: ListChecks, all: List };

function longDate(value: string | null) {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });
}

function euroFromCents(cents: number | null) {
  if (cents == null) return "—";
  const amount = cents / 100;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function termEnd(startIso: string, months: number) {
  const [y, m, d] = startIso.split("-").map(Number);
  const lastDayOfTargetMonth = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  const end = new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDayOfTargetMonth)) - 24 * 60 * 60 * 1000);
  return end.toISOString().slice(0, 10);
}

type Tab = "overview" | "all" | "details" | "actions";

export default function LeaseReport({ analysis }: { analysis: Analysis }) {
  const { clauses } = analysis;
  const counts: Record<Status, number> = { red: 0, amber: 0, green: 0, grey: 0 };
  clauses.forEach((c) => counts[c.status]++);
  const total = clauses.length;
  const flagged = (["red", "amber"] as const).flatMap((s) => clauses.filter((c) => c.status === s));

  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>("overview");
  const [risk, setRisk] = useState<Status | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailIds, setEmailIds] = useState<string[]>([]);
  const [, setRaised] = useState(() => loadRaised(analysis.id));
  const [timeline, setTimeline] = useState<{ busy: boolean; tone?: "success" | "error"; text?: string }>({ busy: false });
  const [printing, setPrinting] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  async function downloadReport() {
    var name = user?.displayName || "User";
    var email = user?.email || "";
    try {
      const blob = await pdf(
        <ReportPdf
          analysis={analysis}
          leaseName={leaseName}
          end={end}
          userName={name}
          userEmail={email}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${leaseName}-ClauseGuard-Report.pdf`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }
  }

  const left = flagged.filter((c) => !c.reviewed).length;
  const start = analysis.tenancyStart?.slice(0, 10) ?? null;
  const end = start && analysis.termMonths ? termEnd(start, analysis.termMonths) : null;
  const leaseName = analysis.fileName.replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");

  function go(next: Tab) {
    setTab(next);
    const top = tabsRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) tabsRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function open(c: Clause) {
    router.push(`/lease/${analysis.id}?clause=${encodeURIComponent(c.id)}`);
  }

  function openEmail() {
    if (emailIds.length === 0) setEmailIds(flagged.map((c) => c.id));
    setEmailOpen(true);
  }

  async function addDatesToTimeline() {
    if (!start) return;
    const note = `From your lease: ${analysis.fileName}`;
    const wanted: NewTimelineEvent[] = [{ title: "Tenancy starts", date: start, kind: "event", note }];
    if (end) wanted.push({ title: "Fixed term ends", date: end, kind: "deadline", note });
    setTimeline({ busy: true });
    try {
      const existing = await getEvents();
      const missing = wanted.filter((w) => !existing.some((e) => e.title === w.title && e.date === w.date));
      for (const event of missing) await addEvent(event);
      setTimeline({ busy: false, tone: "success", text: missing.length ? `Added ${missing.length} dates to your timeline.` : "These dates are already on your timeline." });
    } catch (err) {
      setTimeline({ busy: false, tone: "error", text: errorMessage(err, "The dates couldn't be added. Try again.") });
    }
  }

  const tabs: { id: Tab; label: string; intro?: { title: string; text: string } }[] = [
    { id: "overview", label: "Overview" },
    { id: "details", label: "Lease details", intro: { title: "Lease details", text: "The key facts we found in your lease. Check they match what you agreed." } },
    ...(analysis.actionList
      ? [
        {
          id: "actions" as const,
          label: "Action list",
          intro: {
            title: `Your action list${actionCount(analysis.actionList) ? `: ${actionCount(analysis.actionList)} items` : ""}`,
            text: "What your lease says you and your landlord must, can't and may do. Built from your lease using fixed rules, no AI reads your lease for this.",
          },
        },
      ]
      : []),
    { id: "all", label: "All clauses", intro: { title: `All ${total} clauses`, text: "Every clause in your lease, in order. Select a clause to open it in Lease viewer." } },
  ];
  const money = (cents: number | null) => (cents == null ? null : new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100));
  const printRows: [string, string | null][] = [
    ["Lease file", analysis.fileName],
    ["Monthly rent", money(analysis.monthlyRentCents)],
    ["Deposit", money(analysis.depositCents)],
    ["Start date", start],
    ["Fixed term ends", end],
    ["Size", `${analysis.pageCount} pages, ${total} clauses`],
  ];
  const at = tabs.findIndex((t) => t.id === tab);
  const current = tabs[at];
  const nextTab = tabs[at + 1];

  return (
    <div className="mx-auto max-w-[1240px]">
      <PrintHeader analysis={analysis} />

      <style>{`@media print { header { display: none !important; } body { background: white; } }`}</style>

      <Link href="/lease" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-brand hover:underline print:hidden">
        <ArrowLeft size={18} />
        Back to my leases
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3 sm:gap-6">
        <div className="min-w-0 flex-1">
          <h1 title={leaseName} className="line-clamp-2 font-display text-2xl font-semibold tracking-tight text-brand-dark [overflow-wrap:anywhere] sm:text-4xl">{leaseName}</h1>
          <p className="mt-1 text-sm text-mute sm:text-base">
            Lease report
            {start && end ? `, tenancy ${new Date(`${start}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })} to ${new Date(`${end}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-3 sm:pt-1 print:hidden">
          <button
            type="button"
            onClick={downloadReport}
            aria-label="Download PDF"
            className="inline-flex min-h-12 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-brand-dark bg-white px-5 font-semibold text-brand-dark transition hover:bg-brand-soft active:scale-95 max-sm:size-12 max-sm:justify-center max-sm:px-0"
          >
            <Download size={19} />
            <span className="max-sm:hidden">Download PDF</span>
          </button>
        </div>
      </div>

      <p role="note" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#d5dde1] bg-[#eef2f4] px-4 py-2.5 text-sm text-ink/85 sm:mt-5 sm:items-center sm:px-5 sm:py-3">
        <Info size={18} className="mt-px shrink-0 text-neu sm:mt-0" aria-hidden />
        <span>
          <b className="font-bold text-ink">Not legal advice.</b> ClauseGuard gives automated, informational analysis.
        </span>
      </p>

      <OlderVersionNote analysis={analysis} />

      <div ref={tabsRef} className="sticky top-16 z-20 md:top-0 -mx-2 mt-5 bg-white/70 px-2 py-2 backdrop-blur print:hidden">
        <div role="tablist" aria-label="Report sections, read them in order" className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl border border-[#cfe1e2] bg-white p-1 shadow-soft sm:flex sm:gap-1.5 sm:overflow-x-auto sm:rounded-full sm:p-1.5">
          {tabs.map((t, i) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => go(t.id)}
                className={cn(
                  "inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-5 font-semibold transition-colors duration-300 max-sm:min-h-[54px] max-sm:flex-col max-sm:justify-center max-sm:gap-1 max-sm:px-1 max-sm:text-xs sm:rounded-full lg:flex-1 lg:justify-center",
                  on ? "bg-brand-dark text-white" : "text-ink/70 hover:bg-surface hover:text-ink",
                )}
              >
                <span className={cn("grid size-6 place-items-center rounded-full text-xs font-bold max-sm:hidden", on ? "bg-white text-brand-dark" : "bg-surface text-mute")}>{i + 1}</span>
                {(() => {
                  const TabIcon = TAB_ICONS[t.id];
                  return <TabIcon size={19} aria-hidden className="sm:hidden" />;
                })()}
                <span className="sm:hidden">{TAB_SHORT[t.id]}</span>
                <span className="max-sm:hidden">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div key={tab} role="tabpanel" aria-label={current?.label} className="animate-fade-up mt-5 print:hidden">
        {current?.intro && (
          <div className="mb-5">
            <h2 className="font-display text-2xl font-semibold text-brand-dark sm:text-3xl">{current.intro.title}</h2>
            <p className="mt-1 text-mute sm:text-lg">{current.intro.text}</p>
          </div>
        )}
        {tab === "overview" && (
          <Overview
            clauses={clauses}
            counts={counts}
            left={left}
            onPick={(s: Status) => {
              setRisk(s);
              go("all");
            }}
            onOpen={open}
            onIssues={() => {
              const first = flagged.find((c) => !c.reviewed) ?? flagged[0];
              if (first) open(first);
            }}
            onEmail={openEmail}
          />
        )}

        {tab === "all" && <AllTab clauses={clauses} risk={risk} onRisk={setRisk} onOpen={open} />}
        {tab === "actions" && analysis.actionList && <LeaseActionList actionList={analysis.actionList} clauses={clauses} onView={open} showHeader={false} />}
        {tab === "details" && <DetailsTab analysis={analysis} end={end} busy={timeline.busy} onAddDates={addDatesToTimeline} />}

        {(tab !== "overview" || nextTab) && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#cfe1e2] bg-white px-5 py-4 sm:rounded-[28px] sm:px-6 sm:py-5">
            <p className="text-mute">
              {nextTab ? (
                <>
                  Next: <span className="font-semibold text-ink">{nextTab.label}</span>. {nextTab.intro?.text.split(".")[0]}.
                </>
              ) : (
                "You've reached the end of the report."
              )}
            </p>
            <button
              type="button"
              onClick={() => go(nextTab ? nextTab.id : "overview")}
              className="group inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-dark px-5 font-semibold text-white transition-transform hover:bg-brand active:scale-95 max-sm:w-full"
            >
              {nextTab ? `Go to ${nextTab.label}` : "Back to the summary"}
              <ChevronRight size={17} className="transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>

      {printing && (
        <div className="hidden print:block">
          <ShortAnswer counts={counts} total={total} />
          <CountBoxes counts={counts} />
          <LeaseDetails rows={printRows} missing={[]} />
          {analysis.actionList && (
            <div className="mt-6 break-before-page">
              <LeaseActionList actionList={analysis.actionList} clauses={clauses} onView={open} />
            </div>
          )}
          <NextSteps counts={counts} onDownload={downloadReport} onEmail={openEmail} />
          <FlaggedClauses analysisId={analysis.id} clauses={clauses} printing raised={null} onEmail={openEmail} />
          <AllClauses analysisId={analysis.id} clauses={clauses} printing />
        </div>
      )}

      {timeline.text && timeline.tone && (
        <div className="mt-4 print:hidden">
          <Alert tone={timeline.tone}>{timeline.text}</Alert>
        </div>
      )}

      {emailOpen && (
        <LandlordEmailPanel
          analysis={analysis}
          selectedIds={emailIds}
          onChangeSelected={setEmailIds}
          onClose={() => setEmailOpen(false)}
          onSent={(sent: Clause[]) => {
            setRaised(saveRaised(analysis.id, sent));
            setEmailIds([]);
            setEmailOpen(false);
          }}
        />
      )}
    </div>
  );
}