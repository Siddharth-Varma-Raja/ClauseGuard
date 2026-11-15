"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Check, CircleCheck, FlaskConical, Loader2, Play, TriangleAlert, X } from "lucide-react";
import CountUp from "@/components/dashboard/CountUp";
import { SAMPLE_ID, SAMPLE_LEASE, SAMPLE_PARTIES } from "@/lib/sample-lease";
import type { Clause } from "@/lib/notice-types";
import { cn } from "@/lib/cn";

const STEPS = [
  "Uploading your lease",
  "Reading the text",
  "Removing personal details",
  "Checking each clause against Irish tenancy law",
];
const STEP_INTERVAL_MS = 1600;
const REDIRECT_SECONDS = 3;

const FACTS = [
  { label: "Rent", value: "€1,850 a month" },
  { label: "Length", value: "12 months" },
  { label: "Pages", value: `${SAMPLE_LEASE.pageCount}` },
  { label: "Clauses", value: `${SAMPLE_LEASE.clauses.length}` },
];

const MARK = {
  red: "bg-bad-bg shadow-[inset_3px_0_0_var(--color-bad-solid)]",
  amber: "bg-warn-bg shadow-[inset_3px_0_0_var(--color-warn-solid)]",
  green: "shadow-[inset_3px_0_0_var(--color-ok-solid)]",
  grey: "",
};

const TAG = {
  red: "bg-bad-solid text-white",
  amber: "bg-warn-solid text-[#3b2600]",
  green: "bg-ok-solid text-white",
  grey: "",
};

const FINDINGS: Record<string, string> = {
  "sample-4": "Above the legal limit",
  "sample-6": "Landlord's job, not yours",
  "sample-7": "Entry without notice",
  "sample-8": "No limit on rent increases",
  "sample-10": "Strict guest rule",
  "sample-11": "No pets",
  "sample-12": "Fixed charge from deposit",
  "sample-13": "Long notice period",
  "sample-14": "Takes away your RTB rights",
};

const PAGES = [...new Set(SAMPLE_LEASE.clauses.map((c) => c.page))];
const RED = SAMPLE_LEASE.clauses.filter((c) => c.status === "red").length;
const AMBER = SAMPLE_LEASE.clauses.filter((c) => c.status === "amber").length;
const GREEN = SAMPLE_LEASE.clauses.filter((c) => c.status === "green").length;

export default function TrySampleLease() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reading, setReading] = useState(false);
  const [maxScroll, setMaxScroll] = useState(0);
  const [focusTop, setFocusTop] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const paperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paperRef.current && contentRef.current) {
      setMaxScroll(contentRef.current.scrollHeight - paperRef.current.clientHeight);
      setFocusTop((document.getElementById("try-sample-3")?.offsetTop ?? 0) - 16);
    }
  }, []);

  useEffect(() => {
    if (!checking || progress === STEPS.length) return;
    const timer = setTimeout(() => setProgress(progress + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [checking, progress]);

  const done = checking && progress === STEPS.length;

  useEffect(() => {
    if (!done) return;
    if (secondsLeft === 0) {
      router.push(`/lease/${SAMPLE_ID}`);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [done, secondsLeft, router]);

  function startCheck() {
    setReading(false);
    setChecking(true);
  }

  const marked = checking && progress >= STEPS.length - 1;
  const scroll = !checking ? 0 : marked ? focusTop : (maxScroll * (progress + 1)) / (STEPS.length - 1);

  return (
    <main className="mx-auto max-w-5xl">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-brand hover:underline">
        <ArrowLeft size={18} />
        Back to dashboard
      </Link>

      <section className="mt-4 rounded-[2rem] bg-[linear-gradient(135deg,#1a7d86,#0a3f47)] p-3 shadow-[0_30px_70px_-10px_rgb(11_58_66/0.45)]">
        <div className="grid items-center gap-10 rounded-3xl bg-[radial-gradient(rgb(255_255_255/0.08)_1.2px,transparent_1.2px)] bg-size-[22px_22px] p-6 sm:p-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div
            ref={paperRef}
            className="relative mx-auto h-[34rem] w-full max-w-sm overflow-hidden rounded-sm bg-white font-serif text-[10.5px] leading-[1.6] text-[#1d2a30] shadow-[0_24px_50px_rgb(0_0_0/0.35)]"
          >
            <div
              ref={contentRef}
              className="px-7 py-8 transition-transform duration-[1500ms] ease-in-out motion-reduce:transition-none"
              style={{ transform: `translateY(-${scroll}px)` }}
            >
              <LeaseHeading />
              <div className="mt-3 space-y-1">
                {SAMPLE_LEASE.clauses.map((clause) => (
                  <LeaseClauseText
                    key={clause.id}
                    clause={clause}
                    anchor
                    tag={marked ? FINDINGS[clause.id] : undefined}
                    className={cn("-mx-2 rounded-sm px-2 py-1 transition-colors duration-700", marked && MARK[clause.status])}
                  />
                ))}
              </div>
            </div>
            <span className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(transparent,white)]" />
            {checking && !marked && (
              <span className="animate-scan absolute inset-x-0 h-12 border-b-2 border-ok-solid bg-[linear-gradient(transparent,rgb(31_157_85/0.18))]" />
            )}
          </div>

          {done ? (
            <div className="animate-fade-up text-white">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                <CircleCheck size={15} />
                Check complete
              </p>
              <p className="mt-5 font-display text-7xl font-semibold leading-none">
                <CountUp value={RED + AMBER} />
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold">things worth a look</h1>
              <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-full bg-bad-solid px-3 py-1">{RED} high risk</span>
                <span className="rounded-full bg-warn-solid px-3 py-1 text-[#3b2600]">{AMBER} medium</span>
                <span className="rounded-full bg-white/15 px-3 py-1">{GREEN} look fine</span>
              </div>
              <p className="mt-6 flex gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 leading-relaxed">
                <TriangleAlert size={20} className="mt-0.5 shrink-0 text-[#ffb4ab]" />
                <span>
                  <b className="font-semibold">Biggest issue:</b> the deposit is three months; rent. The legal limit is one month.
                </span>
              </p>
              <div className="mt-8 max-w-sm">
                <div className="flex items-center justify-between text-sm text-white/80">
                  <span>Opening the full results in {secondsLeft}…</span>
                  <button type="button" onClick={() => router.push(`/lease/${SAMPLE_ID}`)} className="cursor-pointer font-semibold text-white underline underline-offset-4">
                    Open now
                  </button>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-1000 ease-linear"
                    style={{ width: `${((REDIRECT_SECONDS - secondsLeft) / REDIRECT_SECONDS) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : checking ? (
            <div className="text-white">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                <FlaskConical size={15} />
                This is what happens when you upload your own lease
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold">Checking the sample lease</h1>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${Math.max(progress / STEPS.length, 0.05) * 100}%` }} />
              </div>
              <ol className="mt-6 space-y-4" aria-live="polite">
                {STEPS.map((step, i) => (
                  <li key={step} className={cn("flex items-center gap-3", i > progress && "text-white/50")}>
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full",
                        i < progress ? "bg-white text-brand-dark" : i === progress ? "bg-white/15" : "border border-white/30",
                      )}
                    >
                      {i < progress ? <Check size={15} /> : i === progress ? <Loader2 size={15} className="animate-spin" /> : i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="text-white">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                <FlaskConical size={15} />
                Sample lease, nothing is saved
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-tight">Try ClauseGuard on a sample lease</h1>
              <p className="mt-3 leading-relaxed text-white/80">
                A made-up Dublin lease with a few common problems hidden in it. We'll check it exactly the way we check yours.
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-3">
                {FACTS.map((fact) => (
                  <div key={fact.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                    <dt className="text-xs text-white/70">{fact.label}</dt>
                    <dd className="mt-0.5 font-display text-xl font-semibold">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={startCheck}
                  className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-white py-2 pl-2 pr-6 font-sans text-lg font-semibold text-brand-dark shadow-[0_0_0_8px_rgb(255_255_255/0.12)] transition-transform hover:scale-[1.03]"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-[linear-gradient(135deg,#1f9d55,#0e5560)] text-white">
                    <Play size={18} />
                  </span>
                  Check this lease
                </button>
                <button
                  type="button"
                  onClick={() => setReading(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-white/55 bg-white/10 px-5 py-2.5 font-semibold hover:bg-white/20"
                >
                  <BookOpen size={17} />
                  Read it first
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {reading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1f24]/60 p-4" role="dialog" aria-modal="true" aria-label="Sample lease">
          <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <p className="font-display text-xl font-semibold text-brand-dark">Sample lease</p>
                <p className="text-sm text-mute">12 Harbour View, Dublin · {SAMPLE_LEASE.pageCount} pages</p>
              </div>
              <button type="button" onClick={() => setReading(false)} aria-label="Close" className="grid size-10 cursor-pointer place-items-center rounded-full text-mute hover:bg-surface">
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[#e7ecee] p-4 sm:p-6">
              {PAGES.map((page) => (
                <article key={page} className="mx-auto mb-4 max-w-[640px] bg-white px-8 py-10 font-serif text-[13px] leading-[1.7] text-[#1d2a30] shadow-sm last:mb-0 sm:px-12">
                  {page === 1 && <LeaseHeading />}
                  <div className="mt-4 space-y-4">
                    {SAMPLE_LEASE.clauses
                      .filter((clause) => clause.page === page)
                      .map((clause) => (
                        <LeaseClauseText key={clause.id} clause={clause} />
                      ))}
                  </div>
                  {page === SAMPLE_LEASE.pageCount && (
                    <div className="mt-10 grid grid-cols-2 gap-8 text-[12px]">
                      <p>
                        SIGNED by the Landlord
                        <span className="mt-8 block border-t border-[#1d2a30] pt-1">Declan Walsh</span>
                      </p>
                      <p>
                        SIGNED by the Tenant
                        <span className="mt-8 block border-t border-[#1d2a30] pt-1">Aoife Byrne</span>
                      </p>
                    </div>
                  )}
                  <p className="mt-8 text-center font-sans text-xs text-mute">
                    {page} / {SAMPLE_LEASE.pageCount}
                  </p>
                </article>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
              <p className="text-sm text-mute">Spotted anything? Let's see what ClauseGuard finds.</p>
              <button type="button" onClick={startCheck} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 font-semibold text-white hover:bg-brand">
                <Play size={16} />
                Check this lease
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function LeaseHeading() {
  return (
    <>
      <p className="text-center text-[1.15em] font-bold tracking-wide">RESIDENTIAL TENANCY AGREEMENT</p>
      <p className="mt-3 text-justify">
        THIS AGREEMENT is made the {SAMPLE_PARTIES.date} BETWEEN {SAMPLE_PARTIES.landlord} (&quot;the Landlord&quot;) of the one part AND {SAMPLE_PARTIES.tenant} (&quot;the Tenant&quot;) of the other part, in respect of {SAMPLE_PARTIES.premises} (&quot;the Premises&quot;).
      </p>
      <p className="mt-2 font-bold">NOW IT IS HEREBY AGREED as follows:</p>
    </>
  );
}

function LeaseClauseText({ clause, tag, className, anchor = false }: { clause: Clause; tag?: string; className?: string; anchor?: boolean }) {
  return (
    <div id={anchor ? `try-${clause.id}` : undefined} className={className}>
      <p className="flex flex-wrap items-center gap-2 font-bold">
        {clause.number}. {clause.title.toUpperCase()}
        {tag && <span className={cn("animate-pop-in rounded-full px-2 py-0.5 font-sans text-[9.5px] font-semibold", TAG[clause.status])}>{tag}</span>}
      </p>
      <p className="text-justify">
        {clause.number}.1 {clause.text}
      </p>
    </div>
  );
}
