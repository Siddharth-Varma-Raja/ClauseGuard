"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  DoorOpen,
  FileText,
  Gavel,
  LoaderCircle,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { checkNotice, errorMessage, getAnalyses, getAnalysis, getNotices } from "@/lib/api";
import { buildNoticeAnswers } from "@/lib/notice-answers";
import { fmtDate, todayIso } from "@/lib/format";
import type { NoticeSummary, NoticeType } from "@/lib/notice-types";
import PageTour from "@/components/PageTour";
import { NOTICES_TOUR } from "@/lib/tours";

type LeaseOption = {
  id: string;
  label: string;
  propertyAddress?: string | null;
  tenancyStart?: string | null;
  monthlyRent?: number | null;
  termMonths?: number | null;
};

const TERMINATION_REASONS = [
  { value: "sale", label: "The landlord is selling the property" },
  { value: "own_use", label: "The landlord is moving in" },
  { value: "family", label: "A family member of the landlord is moving in" },
  { value: "refurbishment", label: "Major refurbishment of the property" },
  { value: "breach", label: "I broke a term of the lease (e.g. rent arrears)" },
  { value: "other", label: "Another reason / no reason given" },
];

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
  defaultValue,
  value,
  onChange,
  badge,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  defaultValue?: string | number;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  badge?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
        <label htmlFor={name} className="block text-sm font-semibold text-brand-dark">
          {label}{required && <span aria-hidden="true"> *</span>}
        </label>
        {badge}
      </div>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        className="min-h-11 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {hint && <p className="mt-1 text-sm text-mute">{hint}</p>}
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-brand-dark">{label}</label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        className="min-h-11 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function CheckField({
  name,
  children,
  defaultChecked,
  checked,
  onChange,
}: {
  name: string;
  children: React.ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3 text-sm leading-5 hover:bg-surface">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4 shrink-0 accent-teal-700"
      />
      <span>{children}</span>
    </label>
  );
}

export default function NoticesPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "form">("upload");
  const [type, setType] = useState<NoticeType>("termination");
  const [step, setStep] = useState<1 | 2>(1);
  const [notices, setNotices] = useState<NoticeSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [leases, setLeases] = useState<LeaseOption[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>("");

  const [formTenancyStart, setFormTenancyStart] = useState<string>("");
  const [currentRentVal, setCurrentRentVal] = useState<number | null>(null);
  const [newRentVal, setNewRentVal] = useState<number | null>(null);
  const [isRpz, setIsRpz] = useState(true);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadNoticeType, setUploadNoticeType] = useState<NoticeType>("termination");
  const [uploadTenancyStart, setUploadTenancyStart] = useState<string>("");
  const [uploadServiceDate, setUploadServiceDate] = useState<string>(todayIso());
  const [uploadTerminationDate, setUploadTerminationDate] = useState<string>("");
  const [uploadCurrentRent, setUploadCurrentRent] = useState<string>("");
  const [uploadNewRent, setUploadNewRent] = useState<string>("");
  const [uploadReason, setUploadReason] = useState<string>("sale");
  const [uploadDescription, setUploadDescription] = useState<string>("");
  const [uploadIsWritten, setUploadIsWritten] = useState(true);
  const [uploadIsSigned, setUploadIsSigned] = useState(true);
  const [uploadHasStatutoryDeclaration, setUploadHasStatutoryDeclaration] = useState(true);
  const [uploadCopySentToRtb, setUploadCopySentToRtb] = useState(true);
  const [uploadDisputeRights, setUploadDisputeRights] = useState(true);
  const [uploadInRpz, setUploadInRpz] = useState(true);
  const [uploadHasThreeComparables, setUploadHasThreeComparables] = useState(true);

  useEffect(() => {
    getNotices()
      .then(setNotices)
      .catch((err: unknown) => setHistoryError(errorMessage(err, "Previous checks could not be loaded.")))
      .finally(() => setLoadingHistory(false));

    getAnalyses()
      .then(async (list) => {
        if (!list || list.length === 0) return;
        const items = await Promise.all(
          list.slice(0, 10).map(async (item) => {
            try {
              const detail = await getAnalysis(item.id);
              const rent = detail?.monthlyRentCents ? detail.monthlyRentCents / 100 : null;
              const address = detail?.propertyAddress || item.propertyAddress || item.fileName || "Lease Agreement";
              const start = detail?.tenancyStart ? `Started ${fmtDate(detail.tenancyStart)}` : "";
              const rentText = rent ? `€${rent}/mo` : "";
              const details = [start, rentText].filter(Boolean).join(" • ");
              return {
                id: item.id,
                label: details ? `${address} (${details})` : address,
                propertyAddress: detail?.propertyAddress || item.propertyAddress,
                tenancyStart: detail?.tenancyStart || null,
                monthlyRent: rent,
                termMonths: detail?.termMonths || null,
              };
            } catch {
              return {
                id: item.id,
                label: item.fileName || "Lease Agreement",
                propertyAddress: item.propertyAddress,
                tenancyStart: null,
                monthlyRent: null,
                termMonths: null,
              };
            }
          })
        );
        setLeases(items);
      })
      .catch(() => { });
  }, []);

  const activeLease = leases.find((l) => l.id === selectedLeaseId) ?? null;

  function handleLeaseChange(leaseId: string) {
    setSelectedLeaseId(leaseId);
    const chosen = leases.find((l) => l.id === leaseId);
    if (chosen) {
      if (chosen.tenancyStart) {
        setFormTenancyStart(chosen.tenancyStart);
        setUploadTenancyStart(chosen.tenancyStart);
      }
      if (chosen.monthlyRent) {
        setCurrentRentVal(chosen.monthlyRent);
        setUploadCurrentRent(String(chosen.monthlyRent));
      }
    } else {
      setFormTenancyStart("");
      setUploadTenancyStart("");
      setCurrentRentVal(null);
      setUploadCurrentRent("");
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);

    const name = file.name.toLowerCase();
    if (name.includes("rent") || name.includes("increase") || name.includes("review")) {
      setUploadNoticeType("rent");
    } else if (name.includes("entry") || name.includes("inspect") || name.includes("visit")) {
      setUploadNoticeType("entry");
    } else {
      setUploadNoticeType("termination");
    }
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const form = new FormData();
    if (uploadNoticeType === "termination") {
      if (!uploadTenancyStart) {
        setError("Please enter the date your tenancy started.");
        return;
      }
      if (!uploadServiceDate || !uploadTerminationDate) {
        setError("Please fill in both the notice date and the termination date.");
        return;
      }
      form.append("tenancyStart", uploadTenancyStart);
      form.append("serviceDate", uploadServiceDate);
      form.append("terminationDate", uploadTerminationDate);
      form.append("reason", uploadReason);
      if (uploadIsWritten) form.append("isWritten", "on");
      if (uploadIsSigned) form.append("isSigned", "on");
      if (uploadHasStatutoryDeclaration) form.append("hasStatutoryDeclaration", "on");
      if (uploadCopySentToRtb) form.append("copySentToRtb", "on");
      if (uploadDisputeRights) form.append("disputeRights", "on");
    } else if (uploadNoticeType === "rent") {
      if (!uploadCurrentRent || !uploadNewRent) {
        setError("Please enter both current and new rent amounts.");
        return;
      }
      if (!uploadServiceDate || !uploadTerminationDate) {
        setError("Please fill in the date on the notice and the date new rent starts.");
        return;
      }
      form.append("currentRent", uploadCurrentRent);
      form.append("newRent", uploadNewRent);
      form.append("serviceDate", uploadServiceDate);
      form.append("effectiveDate", uploadTerminationDate);
      if (uploadInRpz) form.append("inRpz", "on");
      if (uploadHasThreeComparables) form.append("hasThreeComparables", "on");
    } else if (uploadNoticeType === "entry") {
      form.append("toldAt", uploadServiceDate ? `${uploadServiceDate}T09:00` : `${todayIso()}T09:00`);
      form.append("visitAt", uploadTerminationDate ? `${uploadTerminationDate}T10:00` : `${todayIso()}T10:00`);
      form.append("agreedTime", "on");
    } else {
      form.append("description", uploadDescription || `Uploaded notice document: ${uploadedFile?.name || "Notice letter"}`);
    }

    const built = buildNoticeAnswers(uploadNoticeType, form);
    if (!built.ok) {
      setError(built.error);
      return;
    }

    if (selectedLeaseId) {
      built.answers.linkedLeaseId = selectedLeaseId;
    }

    setSubmitting(true);
    try {
      const result = await checkNotice({ type: uploadNoticeType, answers: built.answers });
      if (activeLease) {
        try {
          localStorage.setItem(
            `cg_notice_lease_${result.id}`,
            JSON.stringify({
              id: activeLease.id,
              address: activeLease.propertyAddress || activeLease.label,
              monthlyRent: activeLease.monthlyRent,
              tenancyStart: activeLease.tenancyStart,
            })
          );
        } catch { }
      }
      router.push(`/notices/${result.id}`);
    } catch (err) {
      setError(errorMessage(err, "We couldn't check this notice. Please try again."));
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const built = buildNoticeAnswers(type, new FormData(event.currentTarget));
    if (!built.ok) {
      setError(built.error);
      return;
    }

    if (selectedLeaseId) {
      built.answers.linkedLeaseId = selectedLeaseId;
    }

    setSubmitting(true);
    try {
      const result = await checkNotice({ type, answers: built.answers });
      if (activeLease) {
        try {
          localStorage.setItem(
            `cg_notice_lease_${result.id}`,
            JSON.stringify({
              id: activeLease.id,
              address: activeLease.propertyAddress || activeLease.label,
              monthlyRent: activeLease.monthlyRent,
              tenancyStart: activeLease.tenancyStart,
            })
          );
        } catch { }
      }
      router.push(`/notices/${result.id}`);
    } catch (err) {
      setError(errorMessage(err, "We couldn't check this notice. Please try again."));
      setSubmitting(false);
    }
  }

  const rentDiff = currentRentVal && newRentVal ? newRentVal - currentRentVal : null;
  const rentPct = currentRentVal && newRentVal ? ((newRentVal - currentRentVal) / currentRentVal) * 100 : null;

  const uploadCurrNum = Number(uploadCurrentRent);
  const uploadNewNum = Number(uploadNewRent);
  const uploadRentDiff = uploadCurrNum > 0 && uploadNewNum > 0 ? uploadNewNum - uploadCurrNum : null;
  const uploadRentPct = uploadCurrNum > 0 && uploadNewNum > 0 ? ((uploadNewNum - uploadCurrNum) / uploadCurrNum) * 100 : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to dashboard
        </Link>
        <PageTour tourId="notices" steps={NOTICES_TOUR} />
      </div>

      <header data-tour="notice-intro">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">Check a notice</h1>
        <p className="mt-2 text-base leading-7 text-mute sm:text-lg">
          Verify termination notices, rent reviews, and inspection requests against statutory Irish tenancy rules.
        </p>
      </header>

      <div className="mt-8 flex rounded-xl bg-surface p-1">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition ${mode === "upload" ? "bg-white text-brand-dark shadow-sm" : "text-mute hover:text-ink"
            }`}
        >
          <UploadCloud size={16} />
          Upload Notice Letter (Fastest)
        </button>
        <button
          type="button"
          onClick={() => setMode("form")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition ${mode === "form" ? "bg-white text-brand-dark shadow-sm" : "text-mute hover:text-ink"
            }`}
        >
          <FileText size={16} />
          Quick Form
        </button>
      </div>

      {mode === "upload" ? (
        <section className="mt-6 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand" />
            <h2 className="text-xl font-semibold text-brand-dark">Upload Landlord Notice</h2>
          </div>
          <p className="mt-1 text-sm text-mute">
            Drop the PDF or photo of the letter you received from your landlord to verify it automatically.
          </p>

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

          {leases.length > 0 && (
            <div className="mt-5 rounded-xl border border-line bg-surface/40 p-3 sm:p-4">
              <label htmlFor="uploadLinkedLease" className="mb-1.5 block text-sm font-semibold text-brand-dark">
                Which uploaded lease is this notice for? <span className="text-xs font-normal text-mute">(Optional)</span>
              </label>
              <select
                id="uploadLinkedLease"
                value={selectedLeaseId}
                onChange={(e) => handleLeaseChange(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">None / I will enter details manually</option>
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              {activeLease && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-brand font-medium">
                  <CheckCircle2 size={14} />
                  Connected to {activeLease.propertyAddress || activeLease.label}. Tenancy dates and rent pre-filled.
                </p>
              )}
            </div>
          )}

          {!uploadedFile ? (
            <label className="mt-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand/30 bg-brand-soft/20 px-6 py-10 text-center cursor-pointer hover:border-brand hover:bg-brand-soft/30 transition">
              <UploadCloud size={36} className="text-brand" />
              <span className="mt-3 block text-base font-semibold text-brand-dark">Choose file or drag & drop</span>
              <span className="mt-1 block text-xs text-mute">PDF, JPG, PNG or WEBP (Max 25 MB)</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileSelected}
                className="sr-only"
              />
            </label>
          ) : (
            <form onSubmit={handleUploadSubmit} className="mt-6 space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface/60 p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={20} className="text-brand shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-mute">{(uploadedFile.size / 1024).toFixed(0)} KB • Ready to check</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="text-xs font-semibold text-mute hover:text-bad"
                >
                  Change file
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="What kind of notice did you receive?"
                  name="uploadNoticeType"
                  value={uploadNoticeType}
                  onChange={(e) => setUploadNoticeType(e.target.value as NoticeType)}
                  options={[
                    { value: "termination", label: "Notice of termination (Eviction)" },
                    { value: "rent", label: "Rent increase notice" },
                    { value: "entry", label: "Inspection / visit request" },
                    { value: "other", label: "Other landlord letter" },
                  ]}
                />

                <InputField
                  label="Date on the notice letter"
                  name="uploadServiceDate"
                  type="date"
                  required
                  value={uploadServiceDate}
                  onChange={(e) => setUploadServiceDate(e.target.value)}
                />

                {uploadNoticeType === "termination" && (
                  <>
                    <InputField
                      label="When did your tenancy start?"
                      name="uploadTenancyStart"
                      type="date"
                      required
                      value={uploadTenancyStart}
                      onChange={(e) => setUploadTenancyStart(e.target.value)}
                      badge={
                        activeLease?.tenancyStart ? (
                          <span className="inline-flex items-center rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                            ✓ From selected lease
                          </span>
                        ) : null
                      }
                    />

                    <InputField
                      label="Stated date the tenancy ends"
                      name="uploadTerminationDate"
                      type="date"
                      required
                      placeholder="Date on letter"
                      value={uploadTerminationDate}
                      onChange={(e) => setUploadTerminationDate(e.target.value)}
                    />

                    <div className="sm:col-span-2">
                      <SelectField
                        label="Reason given on notice"
                        name="uploadReason"
                        value={uploadReason}
                        onChange={(e) => setUploadReason(e.target.value)}
                        options={TERMINATION_REASONS}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <p className="mb-2 text-sm font-semibold text-brand-dark">Notice format details</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <CheckField name="uploadIsWritten" checked={uploadIsWritten} onChange={(e) => setUploadIsWritten(e.target.checked)}>
                          It&apos;s a written letter (not a text or call)
                        </CheckField>
                        <CheckField name="uploadIsSigned" checked={uploadIsSigned} onChange={(e) => setUploadIsSigned(e.target.checked)}>
                          It&apos;s signed by landlord or agent
                        </CheckField>
                        <CheckField name="uploadHasStatutoryDeclaration" checked={uploadHasStatutoryDeclaration} onChange={(e) => setUploadHasStatutoryDeclaration(e.target.checked)}>
                          Statutory declaration included
                        </CheckField>
                        <CheckField name="uploadCopySentToRtb" checked={uploadCopySentToRtb} onChange={(e) => setUploadCopySentToRtb(e.target.checked)}>
                          Copy sent to the RTB
                        </CheckField>
                      </div>
                    </div>
                  </>
                )}

                {uploadNoticeType === "rent" && (
                  <>
                    <InputField
                      label="Current monthly rent (€)"
                      name="uploadCurrentRent"
                      type="number"
                      placeholder="e.g. 1800"
                      required
                      value={uploadCurrentRent}
                      onChange={(e) => setUploadCurrentRent(e.target.value)}
                      badge={
                        activeLease?.monthlyRent ? (
                          <span className="inline-flex items-center rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                            ✓ From selected lease
                          </span>
                        ) : null
                      }
                    />

                    <InputField
                      label="New monthly rent (€)"
                      name="uploadNewRent"
                      type="number"
                      placeholder="e.g. 1950"
                      required
                      value={uploadNewRent}
                      onChange={(e) => setUploadNewRent(e.target.value)}
                    />

                    {uploadRentDiff !== null && uploadRentPct !== null && (
                      <div className="rounded-xl border border-line bg-surface/70 p-3.5 text-sm sm:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-brand-dark">
                            Proposed increase: {uploadRentDiff > 0 ? "+" : ""}€{Math.round(uploadRentDiff)}/month ({uploadRentPct.toFixed(1)}%)
                          </span>
                          {uploadRentDiff > 0 && (
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${uploadRentPct > 2 && uploadInRpz
                                  ? "border-red-200 bg-red-50 text-red-800"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
                                }`}
                            >
                              {uploadRentPct > 2 && uploadInRpz ? "⚠️ Exceeds 2% RPZ cap" : "✓ Within 2% RPZ cap"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <InputField
                        label="Date new rent starts"
                        name="uploadTerminationDate"
                        type="date"
                        required
                        value={uploadTerminationDate}
                        onChange={(e) => setUploadTerminationDate(e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <CheckField name="uploadInRpz" checked={uploadInRpz} onChange={(e) => setUploadInRpz(e.target.checked)}>
                          My home is in a Rent Pressure Zone (RPZ)
                        </CheckField>
                        <CheckField name="uploadHasThreeComparables" checked={uploadHasThreeComparables} onChange={(e) => setUploadHasThreeComparables(e.target.checked)}>
                          Lists 3 similar rental comparables
                        </CheckField>
                      </div>
                    </div>
                  </>
                )}

                {uploadNoticeType === "entry" && (
                  <div className="sm:col-span-2">
                    <InputField
                      label="Date of planned visit"
                      name="uploadTerminationDate"
                      type="date"
                      required
                      value={uploadTerminationDate}
                      onChange={(e) => setUploadTerminationDate(e.target.value)}
                    />
                  </div>
                )}

                {uploadNoticeType === "other" && (
                  <div className="sm:col-span-2">
                    <label htmlFor="uploadDescription" className="mb-1.5 block text-sm font-semibold text-brand-dark">
                      What does the letter or notice say?
                    </label>
                    <textarea
                      id="uploadDescription"
                      rows={4}
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="Describe what the landlord is asking or stating in the document..."
                      className="w-full rounded-xl border border-line bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {submitting && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
                  {submitting ? "Verifying notice…" : "Verify notice now"}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : step === 1 ? (
        <section data-tour="notice-type" className="mt-6 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
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
            <button
              data-tour="notice-continue"
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Continue <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : (
        <form data-tour="notice-form" onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-6">
          <h2 className="text-xl font-semibold text-brand-dark">About your {noticeTitle(type).toLowerCase()}</h2>
          <p className="mt-1 text-sm text-mute">Fields marked with * are required.</p>

          {leases.length > 0 && (
            <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3.5">
              <label htmlFor="formLinkedLease" className="mb-1.5 block text-sm font-semibold text-brand-dark">
                Which uploaded lease is this notice for? <span className="text-xs font-normal text-mute">(Optional)</span>
              </label>
              <select
                id="formLinkedLease"
                value={selectedLeaseId}
                onChange={(e) => handleLeaseChange(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">None / Enter details manually</option>
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              {activeLease && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-brand font-medium">
                  <CheckCircle2 size={14} />
                  Referencing &quot;{activeLease.propertyAddress || activeLease.label}&quot; — lease details pre-filled below.
                </p>
              )}
            </div>
          )}

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

          {type === "termination" && (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="When did your tenancy start?"
                  name="tenancyStart"
                  type="date"
                  required
                  value={formTenancyStart}
                  onChange={(e) => setFormTenancyStart(e.target.value)}
                  badge={
                    activeLease?.tenancyStart ? (
                      <span className="inline-flex items-center rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                        ✓ From selected lease
                      </span>
                    ) : null
                  }
                />
                <InputField label="Date on the notice" name="serviceDate" type="date" required hint="The date it was given to you." />
                <InputField label="Date the tenancy ends" name="terminationDate" type="date" required />
                <SelectField label="Reason given on the notice" name="reason" options={TERMINATION_REASONS} />
              </div>
              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-semibold text-brand-dark">Tick everything that applies</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CheckField name="isWritten" defaultChecked={true}>It&apos;s a written letter (not a text or call)</CheckField>
                  <CheckField name="isSigned" defaultChecked={true}>It&apos;s signed by the landlord or agent</CheckField>
                  <CheckField name="hasStatutoryDeclaration" defaultChecked={true}>A signed statutory declaration came with it</CheckField>
                  <CheckField name="copySentToRtb" defaultChecked={true}>It says a copy was sent to the RTB</CheckField>
                  <CheckField name="disputeRights" defaultChecked={true}>It says I can refer a dispute to the RTB</CheckField>
                </div>
              </fieldset>
            </>
          )}

          {type === "rent" && (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Current monthly rent (€)"
                  name="currentRent"
                  type="number"
                  placeholder="e.g. 1800"
                  required
                  value={currentRentVal !== null ? currentRentVal : ""}
                  onChange={(e) => setCurrentRentVal(Number(e.target.value) || null)}
                  badge={
                    activeLease?.monthlyRent ? (
                      <span className="inline-flex items-center rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                        ✓ From selected lease
                      </span>
                    ) : null
                  }
                />
                <InputField
                  label="New monthly rent (€)"
                  name="newRent"
                  type="number"
                  placeholder="e.g. 1950"
                  required
                  onChange={(e) => setNewRentVal(Number(e.target.value) || null)}
                />

                {rentDiff !== null && rentPct !== null && (
                  <div className="rounded-xl border border-line bg-surface/70 p-3.5 text-sm sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-brand-dark">
                        Proposed increase: {rentDiff > 0 ? "+" : ""}€{Math.round(rentDiff)}/month ({rentPct.toFixed(1)}%)
                      </span>
                      {rentDiff > 0 && (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${rentPct > 2 && isRpz
                              ? "border-red-200 bg-red-50 text-red-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                            }`}
                        >
                          {rentPct > 2 && isRpz ? "⚠️ Exceeds 2% RPZ cap" : "✓ Within 2% RPZ cap"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <InputField label="Date on the letter" name="serviceDate" type="date" required />
                <InputField label="Date the new rent starts" name="effectiveDate" type="date" required />
                <InputField label="When did your rent last change?" name="lastReviewDate" type="date" hint="Leave blank if it never has." />
              </div>
              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-semibold text-brand-dark">Tick everything that applies</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CheckField name="inRpz" defaultChecked={true} onChange={(e) => setIsRpz(e.target.checked)}>
                    My home is in a Rent Pressure Zone
                  </CheckField>
                  <CheckField name="hasThreeComparables" defaultChecked={true}>The letter lists 3 similar homes and their rents</CheckField>
                </div>
              </fieldset>
            </>
          )}

          {type === "entry" && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField label="When were you told about the visit?" name="toldAt" type="datetime-local" required />
              <InputField label="When is the visit?" name="visitAt" type="datetime-local" required />
              <div className="grid gap-2 sm:col-span-2">
                <CheckField name="isEmergency">It&apos;s a genuine emergency (e.g. a leak or fire)</CheckField>
                <CheckField name="agreedTime" defaultChecked={true}>The time was agreed with me</CheckField>
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
            <button
              type="button"
              onClick={() => { setError(""); setStep(1); }}
              className="min-h-11 rounded-xl border border-line bg-white px-4 py-2.5 font-semibold text-brand-dark hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {submitting && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
              {submitting ? "Checking…" : "Check notice"}
            </button>
          </div>
        </form>
      )}

      <section data-tour="previous-checks" className="mt-10 sm:mt-12">
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
