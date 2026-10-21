"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Banknote, DoorOpen, FileText, Gavel, LoaderCircle } from "lucide-react";
import { checkNotice, getNotices } from "@/lib/api";
import type { NoticeSummary, NoticeType } from "@/lib/notice-types";

const noticeTypes = [
  { value: "termination", title: "Notice of termination", description: "The landlord says the tenancy is ending.", Icon: Gavel },
  { value: "rent", title: "Rent increase", description: "The landlord wants to raise the rent.", Icon: Banknote },
  { value: "entry", title: "Entry or inspection", description: "The landlord wants to visit the property.", Icon: DoorOpen },
  { value: "other", title: "Something else", description: "Another letter or message about the tenancy.", Icon: FileText },
] as const;

function noticeTitle(type: NoticeType) {
  return noticeTypes.find((item) => item.value === type)?.title ?? "Notice";
}

function verdictStyle(verdict: string) {
  if (verdict === "valid") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (verdict === "attention") return "bg-amber-50 text-amber-800 border-amber-200";
  if (verdict === "invalid") return "bg-red-50 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function InputField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-brand-dark">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        className="min-h-11 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {hint && <p className="mt-1 text-sm text-mute">{hint}</p>}
    </div>
  );
}

function CheckField({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3 text-sm leading-5 hover:bg-surface">
      <input name={name} type="checkbox" className="mt-1 size-4 shrink-0 accent-teal-700" />
      <span>{children}</span>
    </label>
  );
}

export default function NoticesPage() {
  const router = useRouter();
  const [type, setType] = useState<NoticeType>("termination");
  const [step, setStep] = useState<1 | 2>(1);
  const [notices, setNotices] = useState<NoticeSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getNotices()
      .then(setNotices)
      .catch((err: unknown) => {
        setHistoryError(err instanceof Error ? err.message : "Previous checks could not be loaded.");
      })
      .finally(() => setLoadingHistory(false));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = new FormData(event.currentTarget);
    const answers: Record<string, string | boolean> = {};
    form.forEach((value, key) => {
      answers[key] = value === "on" ? true : String(value).trim();
    });

    // from BACKEND: lib/api.ts (POST /notices)
    setSubmitting(true);
    try {
      const result = await checkNotice({ type, answers });
      router.push(`/notices/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't check this notice. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/dashboard" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to dashboard
      </Link>

      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">Check a notice</h1>
        <p className="mt-2 text-base leading-7 text-mute sm:text-lg">
          Tell us about a notice you received. ClauseGuard will check your answers against the tenancy rules configured by your team.
        </p>
      </header>

      {step === 1 ? (
        <section className="mt-6 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
          <h2 className="text-xl font-semibold text-brand-dark">What kind of notice is it?</h2>
          <div role="radiogroup" aria-label="Notice type" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {noticeTypes.map(({ value, title, description, Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={type === value}
                onClick={() => setType(value)}
                className={`flex min-h-24 items-start gap-3 rounded-2xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${type === value ? "border-brand bg-brand-soft/60" : "border-line hover:border-brand/50"
                  }`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-brand-dark">{title}</span>
                  <span className="mt-1 block text-sm leading-5 text-mute">{description}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => setStep(2)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              Continue <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
          <h2 className="text-xl font-semibold text-brand-dark">About your {noticeTitle(type).toLowerCase()}</h2>
          <p className="mt-1 text-sm text-mute">Fields marked with * are required.</p>

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

          {type === "termination" && (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField label="When did your tenancy start?" name="tenancyStart" type="date" required />
                <InputField label="Date on the notice" name="serviceDate" type="date" required />
                <InputField label="Date the tenancy ends" name="terminationDate" type="date" required />
                <InputField label="Reason given on the notice" name="reason" placeholder="e.g. landlord is selling" />
              </div>
              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-semibold text-brand-dark">Tick everything that applies</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CheckField name="inWriting">It's a written letter (not a text or call)</CheckField>
                  <CheckField name="signed">It's signed by the landlord or agent</CheckField>
                  <CheckField name="disputeRights">It says I can refer a dispute to the RTB</CheckField>
                </div>
              </fieldset>
            </>
          )}

          {type === "rent" && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField label="Current monthly rent (€)" name="currentRent" type="number" placeholder="e.g. 1800" required />
              <InputField label="New monthly rent (€)" name="proposedRent" type="number" placeholder="e.g. 1950" required />
              <InputField label="Date on the letter" name="serviceDate" type="date" required />
              <InputField label="Date the new rent starts" name="effectiveDate" type="date" hint="Leave blank if the letter doesn't say." />
              <InputField label="When did your rent last change?" name="lastReviewDate" type="date" hint="Leave blank if it never has." />
            </div>
          )}

          {type === "entry" && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField label="Date you were told about the visit" name="requestDate" type="date" required />
              <InputField label="Date of the visit" name="visitDate" type="date" required />
              <div className="grid gap-2 sm:col-span-2">
                <CheckField name="emergency">It's a genuine emergency (e.g. a leak or fire)</CheckField>
                <CheckField name="agreedTime">The time was agreed with me</CheckField>
              </div>
            </div>
          )}

          {type === "other" && (
            <div className="mt-5">
              <label htmlFor="description" className="mb-1.5 block text-sm font-semibold text-brand-dark">What does the letter say? *</label>
              <textarea id="description" name="description" rows={5} maxLength={2000} required className="w-full rounded-xl border border-line bg-white px-3 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
              <p className="mt-1 text-sm text-mute">Maximum 2,000 characters.</p>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => { setError(""); setStep(1); }} className="min-h-11 rounded-xl border border-line bg-white px-4 py-2.5 font-semibold text-brand-dark hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              Back
            </button>
            <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              {submitting && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
              {submitting ? "Checking…" : "Check notice"}
            </button>
          </div>
        </form>
      )}

      <section className="mt-10 sm:mt-12">
        <h2 className="mb-4 text-xl font-semibold text-brand-dark">Previous checks</h2>
        {loadingHistory ? (
          <p className="rounded-xl border border-line bg-white p-4 text-sm text-mute">Loading previous checks…</p>
        ) : historyError ? (
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{historyError}</p>
        ) : notices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-8 text-center">
            <p className="font-semibold text-brand-dark">No previous checks yet</p>
            <p className="mt-1 text-sm text-mute">Your completed notice checks will appear here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
            {notices.map((notice) => (
              <Link key={notice.id} href={`/notices/${notice.id}`} className="flex min-h-16 flex-col gap-2 border-b border-line p-4 last:border-b-0 hover:bg-surface focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block font-semibold text-brand-dark">{noticeTitle(notice.type)}</span>
                  <span className="mt-1 block text-sm text-mute">{notice.summary}</span>
                </span>
                <span className={`inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${verdictStyle(notice.verdict)}`}>
                  {notice.verdict === "valid" ? "Looks valid" : notice.verdict === "attention" ? "Needs review" : notice.verdict === "invalid" ? "Likely not valid" : "For information"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-mute">
        ClauseGuard provides general information, not legal advice. Check important questions with the RTB or Threshold.
      </p>
    </main>
  );
}
