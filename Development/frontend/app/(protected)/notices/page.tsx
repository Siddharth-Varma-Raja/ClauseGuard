"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, House } from "lucide-react";
import { checkNotice, errorMessage, getAnalyses, getAnalysis, getNotices } from "@/lib/api";
import { buildNoticeAnswers } from "@/lib/notice-answers";
import { noticeType } from "@/lib/notice-meta";
import { euro, fmtDate } from "@/lib/format";
import type { NoticeSummary, NoticeType } from "@/lib/notice-types";
import PageTour from "@/components/PageTour";
import ProcessingCard from "@/components/lease/ProcessingCard";
import TypeTiles from "@/components/notices/TypeTiles";
import LeasePicker, { type NoticeLease } from "@/components/notices/LeasePicker";
import PastChecks from "@/components/notices/PastChecks";
import NoticeDetails, { QUESTIONS, QUESTIONS_PER_PAGE, type Values } from "@/components/notices/NoticeDetails";
import LivePanel from "@/components/notices/LivePanel";
import { NOTICE_DETAILS_TOUR, NOTICES_FORM_TOUR } from "@/lib/tours";

const CHECK_STEPS = ["Reading your answers", "Working out the dates", "Comparing with Irish tenancy law", "Writing up your result"];
const STEP_INTERVAL_MS = 1500;
const MAX_LEASES = 10;

const card = "rounded-2xl border border-[#d5e3e4] bg-white shadow-soft";
const primary =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand pl-5 pr-4 text-[15px] font-semibold text-white shadow-[0_6px_16px_-6px_rgb(14_85_96/0.6)] hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

async function loadLeases(): Promise<NoticeLease[]> {
  const list = await getAnalyses();
  return Promise.all(
    list.slice(0, MAX_LEASES).map(async (item) => {
      const fallback = { id: item.id, address: item.propertyAddress || item.fileName || "Lease", tenancyStart: null, monthlyRent: null };
      try {
        const detail = await getAnalysis(item.id);
        if (!detail) return fallback;
        return {
          id: item.id,
          address: detail.propertyAddress || fallback.address,
          tenancyStart: detail.tenancyStart ? detail.tenancyStart.slice(0, 10) : null,
          monthlyRent: detail.monthlyRentCents ? detail.monthlyRentCents / 100 : null,
        };
      } catch {
        return fallback;
      }
    }),
  );
}

export default function NoticesPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<NoticeType | null>(null);
  const [leases, setLeases] = useState<NoticeLease[]>([]);
  const [loadingLeases, setLoadingLeases] = useState(true);
  const [leaseChoice, setLeaseChoice] = useState("");
  const [values, setValues] = useState<Values>({ reason: "other" });
  const [notices, setNotices] = useState<NoticeSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [questionPage, setQuestionPage] = useState(0);
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => {
    getNotices()
      .then(setNotices)
      .catch((err: unknown) => setHistoryError(errorMessage(err, "Your past checks could not be loaded.")))
      .finally(() => setLoadingHistory(false));

    loadLeases()
      .then(setLeases)
      .catch(() => setLeases([]))
      .finally(() => setLoadingLeases(false));
  }, []);

  const lease = leases.find((item) => item.id === leaseChoice) ?? null;

  function setValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function chooseLease(next: string) {
    const before = leases.find((item) => item.id === leaseChoice);
    const after = leases.find((item) => item.id === next);
    setValues((current) => {
      const updated = { ...current };
      if (before?.tenancyStart && updated.tenancyStart === before.tenancyStart) delete updated.tenancyStart;
      if (before?.monthlyRent && Number(updated.currentRent) === before.monthlyRent) delete updated.currentRent;
      if (after?.tenancyStart && !updated.tenancyStart) updated.tenancyStart = after.tenancyStart;
      if (after?.monthlyRent && !updated.currentRent) updated.currentRent = String(after.monthlyRent);
      return updated;
    });
    setLeaseChoice(next);
  }

  function goTo(next: 1 | 2) {
    setError("");
    setShowMissing(false);
    setQuestionPage(0);
    setStep(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!type) return;
    setError("");

    const questions = QUESTIONS[type];
    const firstMissing = questions.findIndex((item) => !values[item.name]);
    if (firstMissing >= 0) {
      setShowMissing(true);
      setQuestionPage(Math.floor(firstMissing / QUESTIONS_PER_PAGE));
      setError("Answer every question about the notice. Pick Not sure if you don't know.");
      return;
    }

    const questionNames = new Set(questions.map((item) => item.name));
    const form = new FormData();
    for (const [name, value] of Object.entries(values)) {
      if (!questionNames.has(name)) form.append(name, value);
      else if (value === "yes") form.append(name, "on");
    }

    const built = buildNoticeAnswers(type, form);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    const note = (values.note ?? "").trim();
    if (note) built.answers.note = note;
    if (lease) built.answers.linkedLeaseId = lease.id;

    setSubmitting(true);
    setProgress(0);
    const timer = setInterval(() => setProgress((p) => Math.min(p + 1, CHECK_STEPS.length - 1)), STEP_INTERVAL_MS);
    try {
      const result = await checkNotice({ type, answers: built.answers });
      setProgress(CHECK_STEPS.length);
      if (lease) {
        try {
          localStorage.setItem(`cg_notice_lease_${result.id}`, JSON.stringify(lease));
        } catch {}
      }
      router.push(`/notices/${result.id}`);
    } catch (err) {
      setError(errorMessage(err, "We couldn't check this notice. Please try again."));
      setSubmitting(false);
    } finally {
      clearInterval(timer);
    }
  }

  if (submitting) {
    return <ProcessingCard steps={CHECK_STEPS} current={progress} title="Checking your notice" subtitle="This usually takes a few seconds. Keep this page open." />;
  }

  const chosenType = type ? noticeType(type) : null;
  const filled = lease
    ? [
        type === "rent" && lease.monthlyRent ? { label: "Current rent", value: `${euro(lease.monthlyRent)} a month` } : null,
        type === "termination" && lease.tenancyStart ? { label: "Tenancy started", value: fmtDate(lease.tenancyStart) } : null,
      ].filter((item): item is { label: string; value: string } => item !== null)
    : [];
  const hasSide = step === 1 || type !== "other" || !!lease;

  return (
    <div className="-m-6 min-h-screen bg-[#eaf1f2] p-4 sm:p-6 md:-m-8 md:p-8">
      <div className="mx-auto flex max-w-[1240px] flex-col lg:min-h-[calc(100dvh-4rem)]">
        <div className="flex items-start justify-between gap-4">
          <div data-tour="notice-intro">
            <h1 className="font-display text-2xl font-semibold text-brand-dark sm:text-[30px] sm:leading-tight">Check a notice</h1>
            <p className="mt-1 text-sm text-mute sm:text-[15px]">Find out if a notice from your landlord follows Irish tenancy law.</p>
          </div>
          <PageTour key={step} tourId="notices" steps={step === 1 ? NOTICES_FORM_TOUR : NOTICE_DETAILS_TOUR} />
        </div>

        <div className={`mt-5 grid flex-1 grid-cols-1 gap-5 ${hasSide ? (step === 1 ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "lg:grid-cols-[minmax(0,1fr)_340px]") : ""}`}>
          {step === 1 ? (
            <section data-tour="notice-start" className={`flex flex-col ${card}`}>
              <div className="flex flex-1 flex-col px-4 pb-5 pt-5 sm:px-6">
                <h2 className="text-[15px] font-semibold text-brand-dark">What is the notice about?</h2>
                <div className="mt-3">
                  <TypeTiles value={type} onChange={setType} />
                </div>

                <h2 className="mt-6 text-[15px] font-semibold text-brand-dark lg:[@media(max-height:800px)]:mt-4">Is it about one of your leases?</h2>
                <div data-tour="notice-lease" className="mt-3">
                  {loadingLeases ? (
                    <div className="skeleton h-14 rounded-xl" />
                  ) : leases.length === 0 ? (
                    <p className="text-sm text-mute">You haven&apos;t uploaded a lease yet, so you&apos;ll fill in the details yourself.</p>
                  ) : (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
                      <p className="text-[13.5px] leading-snug text-mute md:max-w-[300px]">Pick it and we&apos;ll fill in your rent and the date your tenancy started.</p>
                      <div className="md:w-[380px] md:shrink-0">
                        <LeasePicker leases={leases} value={leaseChoice} onChange={chooseLease} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6 lg:[@media(max-height:800px)]:pt-4">
                  <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
                    {!type && <p className="text-sm text-mute">Choose what the notice is about to continue.</p>}
                    <button data-tour="notice-continue" type="button" disabled={!type} onClick={() => goTo(2)} className={primary}>
                      Continue
                      <ArrowRight size={17} aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <form data-tour="notice-start" noValidate onSubmit={handleSubmit} className={`flex flex-col ${card}`}>
              <div className="flex flex-1 flex-col gap-4 px-4 pb-5 pt-5 sm:px-6">
                <h2 className="text-[15px] font-semibold text-brand-dark">Fill in the details from the notice</h2>
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  {chosenType && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-2.5 py-1 font-semibold text-brand-dark">
                      <chosenType.Icon size={14} aria-hidden />
                      {chosenType.title}
                    </span>
                  )}
                  {lease && (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-brand-soft px-2.5 py-1 font-semibold text-brand-dark">
                      <House size={14} aria-hidden className="shrink-0" />
                      <span className="truncate">{lease.address}</span>
                    </span>
                  )}
                  <button type="button" onClick={() => goTo(1)} className="ml-1 cursor-pointer font-semibold text-brand hover:underline">
                    Change
                  </button>
                </div>
                {type && (
                  <NoticeDetails
                    type={type}
                    values={values}
                    lease={lease}
                    questionPage={questionPage}
                    showMissing={showMissing}
                    onChange={setValue}
                    onQuestionPage={setQuestionPage}
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-4 sm:flex-nowrap sm:px-6">
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[#cfdcde] bg-white px-4 text-sm font-semibold text-brand-dark hover:bg-surface"
                >
                  <ArrowLeft size={16} aria-hidden />
                  Back
                </button>
                <p role="alert" className="order-last w-full text-sm leading-snug text-bad sm:order-none sm:w-auto sm:flex-1 sm:text-right">
                  {error}
                </p>
                <button type="submit" className={`${primary} ml-auto shrink-0 sm:ml-0`}>
                  Check this notice
                  <ArrowRight size={17} aria-hidden />
                </button>
              </div>
            </form>
          )}

          {step === 1 ? (
            <PastChecks notices={notices} loading={loadingHistory} error={historyError} />
          ) : (
            hasSide && (
              <div data-tour="notice-numbers" className="flex flex-col gap-4 self-start">
                {type && <LivePanel type={type} values={values} />}
                {lease && (
                  <section className={`${card} p-5`}>
                    <p className="flex items-center gap-2 text-[15px] font-semibold text-brand-dark">
                      <House size={16} aria-hidden className="text-brand" />
                      {filled.length ? "Filled in from your lease" : "Linked to your lease"}
                    </p>
                    <dl className="mt-3 space-y-2 text-[13.5px]">
                      <div className="flex justify-between gap-4">
                        <dt className="text-mute">Lease</dt>
                        <dd className="truncate text-right font-semibold">{lease.address}</dd>
                      </div>
                      {filled.map((item) => (
                        <div key={item.label} className="flex justify-between gap-4">
                          <dt className="text-mute">{item.label}</dt>
                          <dd className="text-right font-semibold tabular-nums">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-3 text-xs text-mute">
                      {filled.length ? "If anything has changed since, edit it in the form." : "Your result will link back to this lease."}
                    </p>
                  </section>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
