import Link from "next/link";
import { Check, FileUp, FileText, Lightbulb, Lock, Upload } from "lucide-react";
import { cn } from "@/lib/cn";

const HOW_IT_WORKS = [
  { title: "Upload your lease", text: "Add the lease your landlord sent you, before you sign it." },
  { title: "We check every clause", text: "Each clause is compared with Irish tenancy law and RTB guidance." },
  { title: "Get a clear summary", text: "See what's fine and what to ask your landlord." },
];

export default function NewUserDashboard({ hasDates }: { hasDates: boolean }) {
  const steps = [
    { title: "Create your account", done: true },
    { title: "Upload your lease", done: false },
    { title: "Review the flagged clauses", done: false },
    { title: "Add your first important date", done: hasDates },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);

  return (
    <>
      <div className="stagger mt-6 grid gap-5 *:min-w-0 lg:grid-cols-[7fr_5fr]">
        <section
          data-tour="upload-hero"
          className="relative overflow-hidden rounded-3xl bg-[radial-gradient(120%_140%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-6 text-white shadow-soft sm:p-8"
        >
          <span className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/5" />
          <p className="relative text-xs font-bold uppercase tracking-widest text-[#9fd6d6]">Step 1 - Your lease</p>
          <h2 className="relative mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">Check your lease before you sign</h2>
          <p className="relative mt-2 max-w-lg leading-relaxed text-white/80">
            ClauseGuard reads every clause and flags anything that may break Irish tenancy law.
          </p>

          <div className="relative mt-6 flex flex-col gap-5 rounded-2xl border-2 border-dashed border-[#9fd6d6]/50 bg-white/5 p-5 sm:flex-row sm:items-center">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#9fd6d6]/20 text-[#bfe6e6]">
              <FileUp size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Upload your lease</p>
              <p className="text-sm text-white/70">PDF, Word or a photo - up to 25 MB</p>
            </div>
            <Link
              href="/lease/new"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-bold text-brand-dark shadow-xl transition hover:-translate-y-0.5 hover:bg-brand-soft"
            >
              <Upload size={18} />
              Choose a file
            </Link>
          </div>

          <p className="relative mt-4 flex items-center gap-2 text-sm text-white/75">
            <Lock size={15} />
            Private: personal details are removed. You can delete your lease at any time.
          </p>
        </section>

        <section data-tour="getting-started" className="flex flex-col rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-brand-dark">Getting started</h2>
            <span className="text-sm font-semibold text-brand">
              {doneCount} of {steps.length} done
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div className="animate-grow h-full rounded-full bg-ok-solid" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <ul className="mt-4 flex-1 space-y-1">
            {steps.map((step) => {
              const isNext = step === nextStep;
              return (
                <li key={step.title} className={cn("flex items-center gap-3 rounded-xl px-3 py-2", isNext && "bg-brand-soft")}>
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border-2",
                      step.done ? "border-ok-solid bg-ok-solid text-white" : isNext ? "border-brand bg-white" : "border-line",
                    )}

                  >
                    {step.done && <Check size={14} strokeWidth={3} className="animate-pop-in" />}
                    {isNext && <span className="size-2.5 rounded-full bg-brand" />}
                  </span>
                  <span className={cn("flex-1 text-sm font-medium", step.done && "text-mute line-through")}>{step.title}</span>
                  {isNext && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-brand">Next</span>}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs leading-relaxed text-mute">
            <Lightbulb size={15} className="mt-px shrink-0 text-brand" />
            Check your lease before you sign and ask your landlord to change anything that is against the law.
          </p>
        </section>
      </div>

      <section data-tour="how-it-works" style={{ animationDelay: "200ms" }} className="animate-fade-up mt-5 rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <h2 className="font-display text-xl font-semibold text-brand-dark">How ClauseGuard works</h2>
        <ol className="mt-4 grid gap-5 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="flex gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-lg font-semibold text-brand-dark">
                {index + 1}
              </span>
              <div>
                <p className="font-semibold text-ink">{step.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-mute">{step.text}</p>
                {index === 2 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                    <span className="rounded-full bg-bad-bg px-2.5 py-0.5 text-bad">High risk</span>
                    <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-warn">Medium risk</span>
                    <span className="rounded-full bg-ok-bg px-2.5 py-0.5 text-ok">Low risk</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

export function EmptyLeases() {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <h2 className="font-display text-xl font-semibold text-brand-dark">My leases</h2>
      <div className="mt-4 flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-line p-8 opacity-80">
        <span className="grid size-3 shrink-0 place-items-center rounded-xl bg-brand-soft/70 text-brand/60">
          <FileText size={25} />
        </span>
        <p className="mt-4 text-center font-semibold text-ink">Your leases will appear here</p>
        <p className="mt-1 text-center text-sm text-mute">Upload a lease and we'll show you which clauses look fine and which are worth questioning.</p>
      </div>

    </section>
  );
}
