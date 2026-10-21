"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, CircleCheck, CircleX, FileQuestion, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { getNotice } from "@/lib/api";
import { formatDate } from "@/lib/notice-format";
import type { Notice, NoticeCheck, NoticeType } from "@/lib/notice-types";

function noticeTitle(type: NoticeType) {
  const titles: Record<NoticeType, string> = {
    termination: "Notice of termination",
    rent: "Rent increase",
    entry: "Entry or inspection",
    other: "Other tenancy notice",
  };
  return titles[type];
}

function verdictStyle(verdict: string) {
  if (verdict === "valid") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (verdict === "attention") return "bg-amber-50 text-amber-800 border-amber-200";
  if (verdict === "invalid") return "bg-red-50 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

const checkStyle: Record<NoticeCheck["status"], { label: string; Icon: typeof CircleCheck; className: string }> = {
  pass: { label: "Looks fine", Icon: CircleCheck, className: "text-emerald-700" },
  warn: { label: "Check this", Icon: TriangleAlert, className: "text-amber-700" },
  fail: { label: "Problem", Icon: CircleX, className: "text-red-700" },
  info: { label: "Information", Icon: Info, className: "text-slate-600" },
};

export default function NoticeResultPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // from BACKEND: lib/api.ts (GET /notices/{id})
    getNotice(id)
      .then((result) => {
        if (!result) setError("We couldn't find this check. It may have been deleted, or the link may be wrong.");
        else setNotice(result);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "We couldn't load this result. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/notices" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to notices
      </Link>

      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">Notice check result</h1>
        {notice && <p className="mt-2 text-base text-mute sm:text-lg">Checked on {formatDate(notice.createdAt, "long")}</p>}
      </header>

      {loading ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-white p-6 text-mute">
          <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
          Loading notice result…
        </div>
      ) : error ? (
        <section className="mt-6 rounded-2xl border border-line bg-white px-5 py-10 text-center shadow-soft sm:px-8">
          <FileQuestion size={36} className="mx-auto text-mute" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-brand-dark">Unable to show this check</h2>
          <p role="status" className="mt-2 text-mute">{error}</p>
          <Link href="/notices" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
            Check a notice
          </Link>
        </section>
      ) : notice ? (
        <div className="mt-6 space-y-5">
          <section className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
            <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${verdictStyle(notice.verdict)}`}>
              {notice.verdict === "valid" ? "Looks valid" : notice.verdict === "attention" ? "Needs review" : notice.verdict === "invalid" ? "Likely not valid" : "For information"}
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-brand-dark">{noticeTitle(notice.type)}</h2>
            <p className="mt-2 leading-7 text-mute">{notice.summary}</p>

            <h3 className="mt-6 text-lg font-semibold text-brand-dark">Checks</h3>
            {notice.checks.length === 0 ? (
              <p className="mt-3 text-sm text-mute">No individual checks were returned.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {notice.checks.map((check, index) => {
                  const item = checkStyle[check.status];
                  const Icon = item.Icon;
                  return (
                    <li key={`${check.title}-${index}`} className="flex gap-3 py-4">
                      <Icon size={21} className={`mt-0.5 shrink-0 ${item.className}`} aria-label={item.label} />
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-dark">{check.title}</p>
                        <p className="mt-1 text-sm leading-6 text-mute">{check.detail}</p>
                        {check.source && <p className="mt-2 text-xs text-mute">Source: {check.source}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {notice.keyDates.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
              <h3 className="text-lg font-semibold text-brand-dark">Key dates</h3>
              <ul className="mt-3 space-y-3">
                {notice.keyDates.map((item, index) => (
                  <li key={`${item.label}-${index}`} className="flex flex-col gap-1 border-b border-line pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-mute">{item.label}</span>
                    <strong className="text-sm text-brand-dark">{formatDate(item.date, "long")}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
            <h3 className="text-lg font-semibold text-brand-dark">Suggested next steps</h3>
            {notice.nextSteps.length === 0 ? (
              <p className="mt-3 text-sm text-mute">No next steps were returned.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {notice.nextSteps.map((step, index) => (
                  <li key={`${step}-${index}`} className="flex gap-2.5 text-sm leading-6 text-slate-800">
                    <Check size={18} className="mt-1 shrink-0 text-brand" aria-hidden="true" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs leading-relaxed text-mute">
            ClauseGuard provides general information, not legal advice. Check important questions with the RTB or Threshold.
          </p>
        </div>
      ) : null}
    </main>
  );
}
