"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, CalendarPlus, Download, FileSearch, Loader2, Mail } from "lucide-react";
import Alert from "@/components/ui/Alert";
import { addEvent, errorMessage, getEvents } from "@/lib/api";
import type { Analysis, Clause, NewTimelineEvent, Status } from "@/lib/notice-types";
import { CountBoxes, LeaseDetails, NextSteps, ShortAnswer } from "./ReportSummary";
import FlaggedClauses from "./FlaggedClauses";
import AllClauses from "./AllClauses";
import LandlordEmailPanel from "@/components/review/LandlordEmailPanel";
import { loadRaised, saveRaised } from "@/lib/raisedClauses";
import { HelpBox, OlderVersionNote, PrintHeader } from "./ReportExtras";

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


export default function LeaseReport({ analysis }: { analysis: Analysis }) {
  const { clauses } = analysis;
  const counts: Record<Status, number> = { red: 0, amber: 0, green: 0, grey: 0 };
  clauses.forEach((c) => counts[c.status]++);
  const total = clauses.length;

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailIds, setEmailIds] = useState<string[]>([]);
  const [raised, setRaised] = useState(() => loadRaised(analysis.id));
  const [printing, setPrinting] = useState(false);
  const [timeline, setTimeline] = useState<{ busy: boolean; tone?: "success" | "error"; text?: string }>({ busy: false });

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

  function openEmail() {
    if (emailIds.length === 0) setEmailIds(clauses.filter((c) => c.status === "red" || c.status === "amber").map((c) => c.id));
    setEmailOpen(true);
  }

  function markEmailSent(sent: Clause[]) {
    setRaised(saveRaised(analysis.id, sent));
    setEmailIds([]);
    setEmailOpen(false);
  }

  function downloadReport() {
    flushSync(() => setPrinting(true));
    window.print();
  }

  async function addDatesToTimeline() {
    if (!analysis.tenancyStart) {
      setTimeline({ busy: false, tone: "error", text: "We couldn't find a start date in this lease." });
      return;
    }
    const note = `From your lease: ${analysis.fileName}`;
    const wanted: NewTimelineEvent[] = [{ title: "Tenancy starts", date: analysis.tenancyStart, kind: "event", note }];
    if (analysis.termMonths) {
      wanted.push({ title: "Fixed term ends", date: termEnd(analysis.tenancyStart, analysis.termMonths), kind: "deadline", note });
    }

    setTimeline({ busy: true });
    try {
      const existing = await getEvents();
      const missing = wanted.filter((w) => !existing.some((e) => e.title === w.title && e.date === w.date));
      for (const event of missing) await addEvent(event);
      setTimeline({
        busy: false,
        tone: "success",
        text: missing.length
          ? `Added ${missing.length} ${missing.length === 1 ? "date" : "dates"} to your timeline.`
          : "These dates are already on your timeline.",
      });
    } catch (err) {
      setTimeline({ busy: false, tone: "error", text: errorMessage(err, "The dates couldn't be added. Try again.") });
    }
  }

  const leaseName = analysis.fileName.replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");

  const details: [string, string | null][] = [
    ["Lease file", analysis.fileName],
    ["Uploaded", longDate(analysis.createdAt)],
    ["Property address", analysis.propertyAddress],
    ["Monthly rent", analysis.monthlyRentCents == null ? null : euroFromCents(analysis.monthlyRentCents)],
    ["Deposit", analysis.depositCents == null ? null : euroFromCents(analysis.depositCents)],
    ["Start date", analysis.tenancyStart ? longDate(analysis.tenancyStart) : null],
    ["Length", analysis.termMonths ? `${analysis.termMonths} months` : null],
    ...((analysis.versionCount ?? 1) > 1
      ? [["Version", `${analysis.version} of ${analysis.versionCount}${analysis.version === analysis.versionCount ? " (latest)" : ""}`] as [string, string]]
      : []),
    ["Size", `${analysis.pageCount} ${analysis.pageCount === 1 ? "page" : "pages"}, ${total} clauses`],
  ];

  const missing = [
    analysis.propertyAddress ? null : "property address",
    analysis.monthlyRentCents == null ? "monthly rent" : null,
    analysis.tenancyStart ? null : "start date",
    analysis.termMonths ? null : "length of the lease",
  ].filter((item): item is string => item !== null);

  const flaggedCount = counts.red + counts.amber;

  return (
    <div className="mx-auto max-w-5xl">
      <PrintHeader analysis={analysis} />
      <style>{`@media print { header, [data-tour="tour-button"] { display: none !important; } body { background: white; } }`}</style>
      <Link href="/lease" className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-brand hover:underline print:hidden">
        <ArrowLeft size={18} />
        Back to my leases
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-mute">Your lease report</p>
          <h1 className="mt-1 break-words font-display text-3xl font-semibold text-brand-dark sm:text-4xl">{leaseName}</h1>
        </div>
        <button
          type="button"
          onClick={downloadReport}
          title="Opens the print dialog — choose “Save as PDF”"
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold text-brand-dark hover:border-brand print:hidden"
        >
          <Download size={18} /> Download PDF
        </button>
      </div>

      <OlderVersionNote analysis={analysis} />
      <ShortAnswer counts={counts} total={total}>

        {flaggedCount > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 print:hidden">
            {raised && (
              <span className="text-sm text-ink">
                You raised {raised.clauses.length} {raised.clauses.length === 1 ? "clause" : "clauses"} on{" "}
                {new Date(raised.sentAt).toLocaleDateString("en-IE", { day: "numeric", month: "long" })}.
              </span>
            )}
          </div>
        )}
      </ShortAnswer>

      <CountBoxes counts={counts} />
      <LeaseDetails rows={details} missing={missing} />

      <div className="hidden print:block">
        <NextSteps counts={counts} onDownload={downloadReport} onEmail={openEmail} />
      </div>

      {/*<div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <Link
          href={`/lease/${analysis.id}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold text-brand-dark hover:border-brand"
        >
          <FileSearch size={17} /> See it in my lease
        </Link>
        <button
          type="button"
          onClick={addDatesToTimeline}
          disabled={timeline.busy}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold text-brand-dark hover:border-brand disabled:opacity-60"
        >
          {timeline.busy ? <Loader2 size={17} className="animate-spin" /> : <CalendarPlus size={17} />}
          Add dates to my timeline
        </button>
      </div>
      {timeline.text && timeline.tone && (
        <div className="mt-3 print:hidden">
          <Alert tone={timeline.tone}>
            {timeline.text}{" "}
            {timeline.tone === "success" && (
              <Link href="/timeline" className="underline">
                Open timeline
              </Link>
            )}
          </Alert>
        </div>
      )}*/}

      <FlaggedClauses analysisId={analysis.id} clauses={clauses} printing={printing} raised={raised} onEmail={openEmail} />

      <AllClauses analysisId={analysis.id} clauses={clauses} printing={printing} />

      <HelpBox />

      {emailOpen && (
        <LandlordEmailPanel
          analysis={analysis}
          selectedIds={emailIds}
          onChangeSelected={setEmailIds}
          onClose={() => setEmailOpen(false)}
          onSent={markEmailSent}
        />
      )}
    </div>
  )
}
