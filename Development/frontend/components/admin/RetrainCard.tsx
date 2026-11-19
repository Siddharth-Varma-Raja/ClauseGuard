"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Info, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import type { RetrainRun } from "@/lib/notice-types";
import { day, score } from "./shared";

function lastRun(run: RetrainRun) {
  let result = `kept ${run.fromVersion}, new score was not higher`;
  if (run.deployed) result = `${run.toVersion} became the current model`;
  if (run.correctionsAdded === 0) result = "nothing to retrain with";
  return `Last run: ${day(run.startedAt)} · ${run.fromVersion} → ${run.toVersion} · ${score(run.oldScore)} → ${score(run.newScore)} · ${result}`;
}

export default function RetrainCard({
  approved,
  currentScore,
  run,
  starting,
  error,
  notice,
  onStart,
}: {
  approved: number;
  currentScore: number;
  run: RetrainRun | null;
  starting: boolean;
  error: string;
  notice: string;
  onStart: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const running = run?.status === "running";
  const failed = run?.status === "failed";
  const blocked = approved === 0 || running;

  return (
    <section
      aria-labelledby="retrain-title"
      className="relative mt-4 overflow-hidden rounded-3xl bg-[radial-gradient(120%_140%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-5 text-white shadow-soft sm:p-6"
    >
      <span className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/[0.04]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <h2 id="retrain-title" className="text-xs font-bold uppercase tracking-[0.14em] text-[#9fd6d6]">
            Retrain and compare
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] text-white/85">
            {approved === 0 ? (
              "There is nothing to retrain with yet. Approve at least one correction in the queue first."
            ) : (
              <>
                Adds the {approved} approved correction{approved === 1 ? "" : "s"} to the labelled set, retrains, then tests by leaving out one lease at a time. The new
                model only replaces the current one if its macro-F1 is <b className="font-semibold text-white">at least {score(currentScore)}</b>.
              </>
            )}
          </p>
          {run && !running && !failed && <p className="mt-2 text-[13px] text-white/60">{lastRun(run)}</p>}
          {failed && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-[#ff9b8f]/15 px-3 py-2 text-sm text-[#ffd0ca]">
              <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
              <span>
                The last retrain failed{run?.error ? `: ${run.error}` : "."} The current model is still in use, so you can run it again.
              </span>
            </p>
          )}
          {notice && (
            <p role="status" className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white">
              <Info size={16} aria-hidden className="mt-0.5 shrink-0 text-[#9fd6d6]" />
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-[#ff9b8f]/15 px-3 py-2 text-sm text-[#ffd0ca]">
              <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0">
          {running ? (
            <Link
              href="/admin/models"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/15"
            >
              <LoaderCircle size={16} aria-hidden className="animate-spin" />
              Retrain in progress, see progress
            </Link>
          ) : confirming ? (
            <div role="group" aria-label="Confirm retrain" className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/20">
              <p className="text-sm font-semibold">Start a retrain now?</p>
              <p className="mt-0.5 text-xs text-white/65">This can take several minutes. Tenants keep using the current model until it finishes.</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    onStart();
                  }}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-brand-dark hover:bg-brand-soft"
                >
                  Yes, start
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold text-white/80 hover:bg-white/10">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={blocked || starting}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-brand-dark transition hover:-translate-y-0.5 hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {starting ? <LoaderCircle size={16} aria-hidden className="animate-spin" /> : <RefreshCw size={16} aria-hidden />}
              {starting ? "Starting" : failed ? "Run again" : "Retrain and compare"}
              {!starting && <ArrowRight size={16} aria-hidden />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
