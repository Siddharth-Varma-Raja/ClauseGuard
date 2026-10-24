"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Upload,
  FileSearch,
  Sparkles,
  CalendarClock,
  ShieldAlert,
  TriangleAlert,
  CircleCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Eye,
  Lock,
} from "lucide-react";
import RedirectIfSignedIn from "@/components/auth/RedirectIfSignedIn";
import PageTour from "@/components/PageTour";
import { HOME_TOUR } from "@/lib/tours";

const faqs = [
  {
    q: "Is this legal advice?",
    a: "No. ClauseGuard is a tool that checks your lease against Irish rental rules and highlights potential problems. It is NOT legal representation. If you have an ongoing dispute with a landlord, consult a solicitor.",
  },
  {
    q: "Will anyone see my personal information?",
    a: "No. Your lease is encrypted, and your details stay private to your account. You can permanently delete your files and account at any time from your settings.",
  },
  {
    q: "What types of documents can I upload?",
    a: "You can upload rental contracts, accommodation agreements, rent increase letters or notices.",
  },
  {
    q: "Is it really free for tenants?",
    a: "Yes, completely free... for now.",
  },
];

export default function LandingPage() {
  const [stage, setStage] = useState<"upload" | "redact" | "scan" | "results">("upload");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const durations = {
      upload: 2600,
      redact: 3400,
      scan: 3000,
      results: 6000,
    };

    const timer = setTimeout(() => {
      setStage((prev) => {
        if (prev === "upload") return "redact";
        if (prev === "redact") return "scan";
        if (prev === "scan") return "results";
        return "upload";
      });
    }, durations[stage]);

    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <main className="overflow-hidden">
      <RedirectIfSignedIn />

      <section data-tour="hero" className="relative bg-brand-dark text-white py-14 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(20,105,115,0.4),_transparent_60%)] pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-300">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  Built for renters in Ireland
                </span>
                <PageTour tourId="hero" steps={HOME_TOUR} />
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-5xl font-semibold leading-[1.15] tracking-tight">
                Know what's in your lease <br />
                <span className="text-brand-soft">before you sign.</span>
              </h1>

              <p className="text-base text-white/80 leading-relaxed max-w-md">
                Drop in your rental agreement. We'll hide your personal details, check the wording against Irish law, and flag any unclear or unfair terms before you sign.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/register"
                  data-tour="get-started"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-semibold text-brand-dark transition-all hover:bg-brand-soft hover:shadow-lg hover:shadow-black/20"
                >
                  Get Started <ArrowRight size={18} />
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3.5 font-medium text-white transition-all hover:bg-white/10"
                >
                  <Eye size={17} /> How it works
                </a>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>Residential Tenancy Act 2004-2026</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>Residential Tenancies Board (RTB) Standards</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative rounded-2xl border border-white/15 bg-white/10 p-3 sm:p-5 backdrop-blur-xl shadow-2xl h-[520px] sm:h-[540px] flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-brand-soft" />
                    <span className="text-xs font-semibold text-white/90">Sample_Tenancy_Agreement.pdf</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-medium text-white/70">
                      {stage === "upload" && "Uploading document..."}
                      {stage === "redact" && "Hiding private details"}
                      {stage === "scan" && "Checking Irish rules"}
                      {stage === "results" && "Review ready"}
                    </span>
                  </div>
                </div>

                <div className="relative mt-3 flex-1 rounded-xl bg-white p-4 sm:p-5 text-ink shadow-md overflow-hidden flex flex-col justify-between">
                  <div
                    className={`absolute inset-0 bg-white/95 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all duration-700 z-20 ${
                      stage === "upload"
                        ? "opacity-100 pointer-events-auto scale-100"
                        : "opacity-0 pointer-events-none scale-95"
                    }`}
                  >
                    <div className="size-16 rounded-2xl bg-brand-soft text-brand grid place-items-center mb-3 animate-bounce shadow-xs">
                      <Upload size={28} />
                    </div>
                    <div className="font-display text-base font-bold text-brand-dark">
                      Uploading Tenancy_Agreement.pdf
                    </div>
                    <p className="mt-1 text-xs text-mute max-w-xs leading-relaxed">
                      Reading the contract and preparing to hide personal data...
                    </p>

                    <div className="mt-5 w-full max-w-xs bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                      <div className="bg-brand h-full rounded-full animate-progress" />
                    </div>
                    <span className="mt-2 text-[11px] font-semibold text-brand">Uploading document...</span>
                  </div>

                  <div className="relative space-y-3">
                    <div
                      className={`absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-90 animate-scan pointer-events-none z-10 shadow-xs transition-opacity duration-500 ${
                        stage === "scan" ? "opacity-100" : "opacity-0"
                      }`}
                    />

                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-mute">Document Preview</div>
                        <div className="text-xs font-bold text-brand-dark">STANDARD RESIDENTIAL TENANCY AGREEMENT</div>
                      </div>

                      <div className="h-6 flex items-center">
                        {stage === "redact" && (
                          <span className="animate-pop-in inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                            <Lock size={10} /> Private details hidden
                          </span>
                        )}
                        {stage === "scan" && (
                          <span className="animate-pop-in inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-900 animate-pulse">
                            <FileSearch size={10} /> Checking Irish rules
                          </span>
                        )}
                        {stage === "results" && (
                          <span className="animate-pop-in inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                            <CheckCircle2 size={10} /> Review complete
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-[11px] space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Tenant:</span>
                        <span className="relative inline-block px-1 font-semibold text-slate-800">
                          Sarah Murphy
                          <span
                            className={`absolute inset-0 bg-slate-900 rounded-xs transition-all duration-700 ease-out ${
                              stage === "upload" ? "w-0" : "w-full"
                            }`}
                          />
                          <span
                            className={`absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-400 transition-opacity duration-500 delay-500 ${
                              stage === "upload" ? "opacity-0" : "opacity-100"
                            }`}
                          >
                            [HIDDEN]
                          </span>
                        </span>

                        <span className="text-slate-500 font-medium ml-2">Phone:</span>
                        <span className="relative inline-block px-1 font-semibold text-slate-800">
                          +353 87 234 5678
                          <span
                            className={`absolute inset-0 bg-slate-900 rounded-xs transition-all duration-700 ease-out ${
                              stage === "upload" ? "w-0" : "w-full"
                            }`}
                          />
                          <span
                            className={`absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-400 transition-opacity duration-500 delay-500 ${
                              stage === "upload" ? "opacity-0" : "opacity-100"
                            }`}
                          >
                            [HIDDEN]
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Rental Address:</span>
                        <span className="relative inline-block px-1 font-semibold text-slate-800">
                          Apt 4B, Grand Canal Dock, Dublin 2
                          <span
                            className={`absolute inset-0 bg-slate-900 rounded-xs transition-all duration-700 ease-out ${
                              stage === "upload" ? "w-0" : "w-full"
                            }`}
                          />
                          <span
                            className={`absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-400 transition-opacity duration-500 delay-500 ${
                              stage === "upload" ? "opacity-0" : "opacity-100"
                            }`}
                          >
                            [HIDDEN]
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs leading-relaxed">
                      <div
                        className={`rounded-lg p-2.5 transition-all duration-700 ease-out ${
                          stage === "results"
                            ? "border border-bad-line bg-bad-bg/60 text-bad shadow-2xs"
                            : "border border-slate-100 bg-slate-50/50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px]">Clause 3.2: Security Deposit</span>
                          {stage === "results" && (
                            <span className="animate-pop-in inline-flex items-center gap-1 text-[10px] font-bold text-bad bg-bad-bg px-2 py-0.5 rounded-full border border-bad-line">
                              <ShieldAlert size={10} /> Unlawful in Ireland
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-1 transition-all duration-700 ${
                            stage === "results"
                              ? "border-b-2 border-bad text-bad font-semibold pb-0.5"
                              : "border-b-2 border-transparent text-slate-700"
                          }`}
                        >
                          “The Tenant shall provide a security deposit equivalent to three (3) months' rent prior to the move-in date.”
                        </p>
                        {stage === "results" && (
                          <div className="mt-1 text-[10px] text-slate-700 font-medium animate-pop-in">
                            Irish law strictly limits deposits to one month of rent. Asking for three months is illegal.
                          </div>
                        )}
                      </div>

                      <div
                        className={`rounded-lg p-2.5 transition-all duration-700 ease-out ${
                          stage === "results"
                            ? "border border-warn-line bg-warn-bg/60 text-warn shadow-2xs"
                            : "border border-slate-100 bg-slate-50/50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px]">Clause 8.1: Overnight Guests</span>
                          {stage === "results" && (
                            <span className="animate-pop-in inline-flex items-center gap-1 text-[10px] font-bold text-warn bg-warn-bg px-2 py-0.5 rounded-full border border-warn-line">
                              <TriangleAlert size={10} /> Needs a closer look
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-1 transition-all duration-700 ${
                            stage === "results"
                              ? "border-b-2 border-warn-solid text-warn font-semibold pb-0.5"
                              : "border-b-2 border-transparent text-slate-700"
                          }`}
                        >
                          “No visitors or overnight guests are permitted under any circumstances without written consent.”
                        </p>
                        {stage === "results" && (
                          <div className="mt-1 text-[10px] text-slate-700 font-medium animate-pop-in">
                            Tenants have a legal right to peaceful enjoyment of their home. Blanket bans on visitors are rarely enforceable.
                          </div>
                        )}
                      </div>

                      <div
                        className={`rounded-lg p-2.5 transition-all duration-700 ease-out ${
                          stage === "results"
                            ? "border border-ok-line bg-ok-bg/50 text-ok shadow-2xs"
                            : "border border-slate-100 bg-slate-50/50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px]">Clause 12.4: Reporting Repairs</span>
                          {stage === "results" && (
                            <span className="animate-pop-in inline-flex items-center gap-1 text-[10px] font-bold text-ok bg-ok-bg px-2 py-0.5 rounded-full border border-ok-line">
                              <CircleCheck size={10} /> Standard clause
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-1 transition-all duration-700 ${
                            stage === "results"
                              ? "border-b-2 border-ok text-ok font-semibold pb-0.5"
                              : "border-b-2 border-transparent text-slate-700"
                          }`}
                        >
                          “The Tenant agrees to notify the Landlord of any urgent structural repairs within 48 hours.”
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-mute">
                    <div className="h-5 flex items-center">
                      {stage === "upload" && <span>Step 1: Uploading agreement</span>}
                      {stage === "redact" && <span>Step 2: Personal details hidden</span>}
                      {stage === "scan" && <span>Step 3: Checking Irish rental rules</span>}
                      {stage === "results" && (
                        <div className="animate-pop-in flex items-center gap-2">
                          <span className="font-bold text-bad">1 Red flag</span>
                          <span>•</span>
                          <span className="font-bold text-warn">1 Warning</span>
                          <span>•</span>
                          <span className="font-bold text-ok">1 Safe</span>
                        </div>
                      )}
                    </div>

                    <Link href="/register" className="font-semibold text-brand hover:underline inline-flex items-center gap-1">
                      Check your own lease <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">
            Why use ClauseGuard?
          </h2>
          <p className="mt-2 text-mute text-base sm:text-lg">
            Helps tenants in Ireland know what they're signing before they sign it.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-7 shadow-xs hover:border-brand/40 hover:shadow-soft transition-all">
            <div className="size-12 rounded-xl bg-red-50 text-bad grid place-items-center mb-5">
              <ShieldAlert size={24} />
            </div>
            <h3 className="font-display text-xl font-bold text-brand-dark">
              Catch Unfair Rules
            </h3>
            <p className="mt-2.5 text-sm text-mute leading-relaxed">
              We flag rules that aren't legal - like asking for three months rent up front, turning up unannounced or charging unreasonable fees.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-7 shadow-xs hover:border-brand/40 hover:shadow-soft transition-all">
            <div className="size-12 rounded-xl bg-brand-soft text-brand grid place-items-center mb-5">
              <Sparkles size={24} />
            </div>
            <h3 className="font-display text-xl font-bold text-brand-dark">
              Simple English Explanations
            </h3>
            <p className="mt-2.5 text-sm text-mute leading-relaxed">
              Leases are filled with confusing legal words. We rewrite the tricky bits so you actually understand what you're agreeing to.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-7 shadow-xs hover:border-brand/40 hover:shadow-soft transition-all">
            <div className="size-12 rounded-xl bg-amber-50 text-warn-solid grid place-items-center mb-5">
              <CalendarClock size={24} />
            </div>
            <h3 className="font-display text-xl font-bold text-brand-dark">
              Rent Caps and Dates
            </h3>
            <p className="mt-2.5 text-sm text-mute leading-relaxed">
              Check if rent hikes stay within the 2% cap, and whether any notice to leave gives you the time the law requires.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" data-tour="how-it-works" className="bg-surface border-y border-line py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">
              How it works
            </h2>
            <p className="mt-2 text-mute text-base">
              Three simple steps before you sign on the dotted line.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
              <div className="size-10 rounded-full bg-brand-dark text-white font-bold grid place-items-center mb-4">
                1
              </div>
              <div className="flex items-center gap-2 font-display text-lg font-bold text-brand-dark">
                <Upload size={19} className="text-brand" />
                Upload your agreement
              </div>
              <p className="mt-2 text-sm text-mute leading-relaxed">
                Upload your rental agreement to get started.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
              <div className="size-10 rounded-full bg-brand-dark text-white font-bold grid place-items-center mb-4">
                2
              </div>
              <div className="flex items-center gap-2 font-display text-lg font-bold text-brand-dark">
                <FileSearch size={19} className="text-brand" />
                We check the rules
              </div>
              <p className="mt-2 text-sm text-mute leading-relaxed">
                Review potential issues against Irish tenancy guidance.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
              <div className="size-10 rounded-full bg-brand-dark text-white font-bold grid place-items-center mb-4">
                3
              </div>
              <div className="flex items-center gap-2 font-display text-lg font-bold text-brand-dark">
                <CircleCheck size={19} className="text-brand" />
                You get a clear report
              </div>
              <p className="mt-2 text-sm text-mute leading-relaxed">
                Read clear explanations and relevant sources.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-brand-dark">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-mute text-base">
            Common questions about using ClauseGuard.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={faq.q} className="rounded-2xl border border-line bg-white overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left font-semibold text-brand-dark hover:bg-surface/50 transition-colors cursor-pointer"
                >
                  <span className="text-base flex items-center gap-2.5">
                    <HelpCircle size={18} className="text-brand shrink-0" />
                    {faq.q}
                  </span>
                  {isOpen ? <ChevronUp size={18} className="text-mute shrink-0" /> : <ChevronDown size={18} className="text-mute shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-mute leading-relaxed border-t border-line/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-brand-dark text-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">
            Don't sign until you're sure.
          </h2>
          <p className="mt-3 max-w-lg mx-auto text-base text-white/80">
            Upload your lease right now for a simplified breakdown.
          </p>

          <div className="mt-8 flex flex-wrap justify-center items-center gap-3">
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-7 py-3 font-semibold text-brand-dark hover:bg-brand-soft transition-all"
            >
              Get Started <ArrowRight size={17} />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center rounded-xl border border-white/30 px-6 py-3 font-medium text-white hover:bg-white/10 transition-all"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}