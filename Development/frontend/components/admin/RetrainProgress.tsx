import { CircleCheck, CircleX, Info, LoaderCircle, RefreshCw } from "lucide-react";
import type { RetrainRun, RetrainStep } from "@/lib/notice-types";
import { cn } from "@/lib/cn";
import { dayTime, score } from "./shared";

const ORDER: RetrainStep[] = ["adding", "training", "testing", "comparing"];

function steps(run: RetrainRun) {
  const tested = run.leasesTotal ? `Lease ${run.leasesTested ?? 0} of ${run.leasesTotal}` : "Running";
  return [
    { key: "adding", title: "Add corrections", note: `${run.correctionsAdded} added` },
    { key: "training", title: "Retrain", note: "Training a new model" },
    { key: "testing", title: "Test, one lease left out at a time", note: tested },
    { key: "comparing", title: `Compare with ${run.fromVersion}`, note: `Replaces it only if at least ${score(run.oldScore)}` },
  ];
}

function describe(run: RetrainRun) {
  if (run.status === "failed") {
    return {
      tone: "bad",
      heading: "Retrain failed",
      summary: run.error || "Something went wrong during the retrain. The current model is still in use.",
    };
  }
  if (run.status === "running") {
    return {
      tone: "brand",
      heading: "Retrain in progress",
      summary: `Started ${dayTime(run.startedAt)} · ${run.correctionsAdded} new correction${run.correctionsAdded === 1 ? "" : "s"}`,
    };
  }
  if (run.correctionsAdded === 0) {
    return { tone: "neu", heading: "Nothing to retrain with", summary: `There were no approved corrections to add, so ${run.fromVersion} is still the current model.` };
  }
  if (run.deployed) {
    return {
      tone: "ok",
      heading: `${run.toVersion} is now the current model`,
      summary: `macro-F1 went from ${score(run.oldScore)} to ${score(run.newScore)}.`,
    };
  }
  return {
    tone: "warn",
    heading: `Kept ${run.fromVersion}, new score was not higher`,
    summary: `${run.toVersion} scored ${score(run.newScore)} against ${score(run.oldScore)} for ${run.fromVersion}, so nothing changed for tenants.`,
  };
}

const TONE = {
  bad: { border: "border-bad-line", icon: "bg-bad-bg text-bad", Icon: CircleX },
  brand: { border: "border-[#d5e3e4]", icon: "bg-brand-soft text-brand", Icon: LoaderCircle },
  ok: { border: "border-ok-line", icon: "bg-ok-bg text-ok", Icon: CircleCheck },
  warn: { border: "border-warn-line", icon: "bg-warn-bg text-warn", Icon: Info },
  neu: { border: "border-[#d5e3e4]", icon: "bg-neu-bg text-neu", Icon: Info },
};

export default function RetrainProgress({ run, retrying, onRetry }: { run: RetrainRun; retrying: boolean; onRetry: () => void }) {
  const at = ORDER.indexOf(run.step);
  const failed = run.status === "failed";
  const { tone, heading, summary } = describe(run);
  const style = TONE[tone as keyof typeof TONE];

  return (
    <section aria-labelledby="run-title" className={cn("mt-6 rounded-3xl border bg-white p-5 shadow-soft", style.border)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", style.icon)}>
            <style.Icon size={20} aria-hidden className={run.status === "running" ? "animate-spin" : undefined} />
          </span>
          <div>
            <h2 id="run-title" className="font-display text-[21px] font-semibold text-brand-dark">
              {heading}
            </h2>
            <p className="mt-0.5 text-sm text-mute" aria-live="polite">
              {summary}
            </p>
          </div>
        </div>
        {run.status === "running" && <p className="text-xs text-mute">Updates every 5 seconds</p>}
        {failed && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-wait disabled:opacity-70"
          >
            {retrying ? <LoaderCircle size={16} aria-hidden className="animate-spin" /> : <RefreshCw size={16} aria-hidden />}
            {retrying ? "Starting" : "Run again"}
          </button>
        )}
      </div>

      {(run.status === "running" || failed) && (
        <ol className="mt-5 grid gap-4 sm:grid-cols-4 sm:gap-0">
          {steps(run).map((step, i) => {
            const done = i < at;
            const now = i === at;
            return (
              <li key={step.key} className="relative flex gap-3 sm:block sm:pr-4 sm:pt-6">
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 right-0 top-[7px] hidden h-[3px] sm:block",
                    done ? "bg-brand" : now && !failed ? "bg-[linear-gradient(90deg,var(--color-brand)_50%,var(--color-line)_50%)]" : "bg-line",
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 size-[17px] shrink-0 rounded-full border-[3px] sm:absolute sm:left-0 sm:top-0",
                    done ? "border-brand bg-brand" : now ? (failed ? "border-bad-solid bg-white" : "border-brand bg-white") : "border-line bg-white",
                  )}
                />
                <span className="text-sm">
                  <span className="block font-semibold text-ink">
                    {step.title}
                    <span className="sr-only">{done ? ", done" : now ? (failed ? ", failed" : ", in progress") : ", not started"}</span>
                  </span>
                  <span className={cn("block", now && failed ? "font-medium text-bad" : "text-mute")}>{done ? "Done" : now && failed ? "Stopped here" : step.note}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
