"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, FileQuestion } from "lucide-react";
import { errorMessage, getNotice } from "@/lib/api";
import type { Notice } from "@/lib/notice-types";
import type { NoticeLease } from "@/components/notices/LeasePicker";
import ResultHero from "@/components/notices/ResultHero";
import CheckList from "@/components/notices/CheckList";
import KeyDates from "@/components/notices/KeyDates";
import NextSteps from "@/components/notices/NextSteps";

type Tab = "checks" | "dates" | "steps";

function readLease(id: string): NoticeLease | null {
  try {
    const stored = localStorage.getItem(`cg_notice_lease_${id}`);
    return stored ? (JSON.parse(stored) as NoticeLease) : null;
  } catch {
    return null;
  }
}

function ResultSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col">
      <p role="status" className="sr-only">
        Loading your result
      </p>
      <div className="skeleton h-[190px] rounded-2xl" />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="skeleton h-[440px] rounded-2xl" />
        <div className="hidden flex-col gap-4 lg:flex">
          <div className="skeleton h-[250px] rounded-2xl" />
          <div className="skeleton h-[180px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function NoticeResultPage() {
  const { id } = useParams<{ id: string }>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lease, setLease] = useState<NoticeLease | null>(null);
  const [tab, setTab] = useState<Tab>("checks");

  useEffect(() => {
    let cancelled = false;
    getNotice(id)
      .then((result) => {
        if (cancelled) return;
        setLease(readLease(id));
        if (result) setNotice(result);
        else setError("We couldn't find this check. It may have been deleted, or the link may be wrong.");
      })
      .catch((err: unknown) => !cancelled && setError(errorMessage(err, "We couldn't load this result. Please try again.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tabs: { key: Tab; label: string }[] = notice
    ? [
        { key: "checks" as Tab, label: "Checks" },
        ...(notice.keyDates.length ? [{ key: "dates" as Tab, label: "Key dates" }] : []),
        ...(notice.nextSteps.length ? [{ key: "steps" as Tab, label: "Next steps" }] : []),
      ]
    : [];
  const hasSide = !!notice && (notice.keyDates.length > 0 || notice.nextSteps.length > 0);
  const shownOnPhone = (key: Tab) => (tab === key ? "flex" : "hidden lg:flex");

  return (
    <div className="-m-6 min-h-screen bg-[#eaf1f2] p-4 sm:p-6 md:-m-8 md:p-8">
      <div className="mx-auto flex max-w-[1240px] flex-col lg:min-h-[calc(100dvh-4rem)]">
        <div className="mb-3 flex items-center justify-between gap-4">
          <Link href="/notices" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            <ArrowLeft size={16} aria-hidden />
            Back to notices
          </Link>
          {lease && (
            <Link href={`/lease/${lease.id}`} className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
              Open the lease
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>

        {loading ? (
          <ResultSkeleton />
        ) : error || !notice ? (
          <section className="rounded-2xl border border-[#d5e3e4] bg-white px-5 py-10 text-center shadow-soft sm:px-8">
            <FileQuestion size={36} className="mx-auto text-mute" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold text-brand-dark">We can&apos;t show this check</h1>
            <p role="status" className="mt-2 text-mute">
              {error}
            </p>
            <Link href="/notices" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
              Check a notice
            </Link>
          </section>
        ) : (
          <>
            <ResultHero notice={notice} address={lease?.address} />

            {tabs.length > 1 && (
              <div role="tablist" aria-label="Result sections" className="mt-3 flex rounded-xl bg-white p-1 text-[13px] font-semibold ring-1 ring-[#d5e3e4] lg:hidden">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.key}
                    onClick={() => setTab(item.key)}
                    className={`flex-1 cursor-pointer rounded-lg py-2 ${tab === item.key ? "bg-brand-dark text-white" : "text-mute hover:text-ink"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className={`mt-3 grid grid-cols-1 gap-4 lg:mt-4 ${hasSide ? "lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start" : ""}`}>
              <CheckList checks={notice.checks} className={shownOnPhone("checks")} />
              {hasSide && (
                <div className="flex flex-col gap-4">
                  {notice.keyDates.length > 0 && <KeyDates notice={notice} className={tab === "dates" ? "" : "hidden lg:block"} />}
                  {notice.nextSteps.length > 0 && <NextSteps steps={notice.nextSteps} className={tab === "steps" ? "" : "hidden lg:block"} />}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
