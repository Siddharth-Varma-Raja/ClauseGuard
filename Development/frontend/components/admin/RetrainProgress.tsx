import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
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
    { key: "comparing", title: `Compare with ${run.fromVersion}`, note: `Goes live only if at least ${score(run.oldScore)}` },
  ];
}

export default function RetrainProgress({ run }: { run: RetrainRun }) {
  const at = ORDER.indexOf(run.step);
  const finished = run.status === "finished";
  const failed = run.status === "failed";

  let heading = "Retrain in progress";
  if (finished) heading = run.deployed ? `${run.toVersion} is now live` : `Kept ${run.fromVersion}`;
  if (failed) heading = "Retrain failed";

  let summary = `Started ${dayTime(run.startedAt)} · ${run.correctionsAdded} new correction${run.correctionsAdded === 1 ? "" : "s"}`;
  if (finished) {
    summary = run.deployed
      ? `macro-F1 went from ${score(run.oldScore)} to ${score(run.newScore)}, so the new model was put live.`
      : `${run.toVersion} scored ${score(run.newScore)}, lower than ${score(run.oldScore)}, so tenants stay on ${run.fromVersion}.`;
  }
  if (failed) summary = run.error || "Something went wrong during the retrain. The current model is still in use.";

  return (
    <section
      aria-labelledby="run-title"
      className={cn(
        "mt-6 rounded-3xl border bg-white p-5 shadow-soft",
        failed ? "border-bad-line" : finished && run.deployed ? "border-ok-line" : "border-[#d5e3e4]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full",
              failed ? "bg-bad-bg text-bad" : finished && run.deployed ? "bg-ok-bg text-ok" : finished ? "bg-neu-bg text-neu" : "bg-brand-soft text-brand",
            )}
          >
            {failed ? <CircleX size={20} aria-hidden /> : finished ? <CircleCheck size={20} aria-hidden /> : <LoaderCircle size={20} aria-hidden className="animate-spin" />}
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
        {!finished && !failed && <p className="text-xs text-mute">Updates every few seconds</p>}
      </div>

      {!finished && (
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
                  <span className="block text-mute">{done ? "Done" : step.note}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
