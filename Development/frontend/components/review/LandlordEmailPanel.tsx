"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy, ExternalLink, Info, Loader2, Mail, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError, errorMessage, generateLandlordEmail } from "@/lib/api";
import type { Analysis, Clause, LandlordEmailDraft } from "@/lib/notice-types";
import { STATUS } from "@/lib/status";
import { cn } from "@/lib/cn";

const MAILTO_LIMIT = 1800;

function draftErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404 || error.status === 405) return "The email writer isn't available yet. Please try again later.";
    if (error.status === 429) return "You've asked for a few drafts in a short time. Wait a minute and try again.";
  }
  return errorMessage(error, "We couldn't write your email. Please try again.");
}

export default function LandlordEmailPanel({
  analysis,
  selectedIds,
  onChangeSelected,
  onClose,
  onSent,
}: {
  analysis: Analysis;
  selectedIds: string[];
  onChangeSelected: (ids: string[]) => void;
  onClose: () => void;
  onSent: (clauses: Clause[]) => void;
}) {
  const { user } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"choose" | "writing" | "draft">("choose");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<LandlordEmailDraft | null>(null);
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const [landlordName, setLandlordName] = useState("");
  const [tenantName, setTenantName] = useState(user?.displayName ?? "");
  const [address, setAddress] = useState(analysis.propertyAddress ?? "");
  const [handedOff, setHandedOff] = useState(false);
  const [notice, setNotice] = useState("");

  const flagged = analysis.clauses.filter((c) => c.status === "red" || c.status === "amber");
  const chosen = flagged.filter((c) => selectedIds.includes(c.id));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function fillIn(text: string) {
    return text
      .replaceAll("[Landlord Name]", landlordName || "[Landlord Name]")
      .replaceAll("[Your Name]", tenantName || "[Your Name]")
      .replaceAll("[Property Address]", address || "[Property Address]");
  }

  const subject = fillIn(draft?.subject ?? "");
  const body = fillIn(editedBody ?? draft?.body ?? "");
  const blanks = (`${subject} ${body}`.match(/\[(Landlord Name|Your Name|Property Address)\]/g) ?? []).length;

  function toggle(clause: Clause) {
    onChangeSelected(selectedIds.includes(clause.id) ? selectedIds.filter((id) => id !== clause.id) : [...selectedIds, clause.id]);
  }

  function toggleGroup(group: Clause[]) {
    const ids = group.map((c) => c.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    onChangeSelected(allSelected ? selectedIds.filter((id) => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])]);
  }

  async function writeEmail() {
    setError("");
    setEditedBody(null);
    setHandedOff(false);
    setNotice("");
    setStep("writing");
    try {
      setDraft(await generateLandlordEmail(analysis.id, chosen));
      setStep("draft");
    } catch (err) {
      setError(draftErrorMessage(err));
      setStep("choose");
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function copyEmail() {
    const copied = await copyText(`Subject: ${subject}\n\n${body}`);
    setNotice(copied ? "Copied. Paste it into your email." : "We couldn't copy that. Select the text and copy it yourself.");
    if (copied) setHandedOff(true);
  }

  async function openEmailApp() {
    const fullLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (fullLink.length <= MAILTO_LIMIT) {
      window.location.href = fullLink;
      setNotice("");
    } else {
      const copied = await copyText(body);
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}`;
      setNotice(copied ? "This email is long, so we copied the text. Paste it into your email app." : "This email is too long to open directly. Copy the text instead.");
    }
    setHandedOff(true);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Email your landlord"
      onClose={onClose}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-none animate-slide-in flex-col bg-white shadow-2xl backdrop:bg-ink/35 open:flex sm:w-[560px]"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 bg-brand-dark px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-white/15">
            <Mail size={19} aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight">Email your landlord</h2>
            <p className="text-xs text-white/70">
              {step === "choose" ? "Step 1 of 2: choose what to raise" : "Step 2 of 2: check your draft"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-9 cursor-pointer place-items-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
        >
          <X size={20} />
        </button>
      </header>

      {step === "choose" && (
        <>
          <div className="min-h-0 flex-1 space-y-5 overflow-auto p-5">
            <p className="text-sm text-mute">
              Pick the clauses you&apos;d like to raise. We&apos;ll write a polite draft that you can edit and send yourself.
            </p>

            {error && (
              <p role="alert" className="rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">
                {error}
              </p>
            )}

            {(["red", "amber"] as const).map((status) => {
              const group = flagged.filter((c) => c.status === status);
              if (group.length === 0) return null;
              const style = STATUS[status];
              const allSelected = group.every((c) => selectedIds.includes(c.id));
              return (
                <div key={status}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className={cn("flex items-center gap-1.5 text-sm font-semibold", style.text)}>
                      <style.Icon size={16} aria-hidden />
                      {style.label} ({group.length})
                    </h3>
                    <button type="button" onClick={() => toggleGroup(group)} className="cursor-pointer text-xs font-semibold text-brand hover:underline">
                      {allSelected ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {group.map((clause) => {
                      const checked = selectedIds.includes(clause.id);
                      return (
                        <li key={clause.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer gap-3 rounded-2xl border p-3 transition-colors",
                              checked ? "border-brand bg-brand-soft/50" : "border-line hover:border-brand",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(clause)}
                              className="mt-1 size-4 shrink-0 cursor-pointer accent-brand"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-ink">
                                Clause {clause.number}. {clause.title}
                              </span>
                              <span className="mt-0.5 block text-sm leading-snug text-mute">{clause.explanation}</span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line p-4">
            <p className="text-sm text-mute">
              <b className="font-semibold text-ink">{chosen.length}</b> {chosen.length === 1 ? "clause" : "clauses"} selected
            </p>
            <button
              type="button"
              disabled={chosen.length === 0}
              onClick={writeEmail}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              Write my email
              <ArrowRight size={16} aria-hidden />
            </button>
          </footer>
        </>
      )}

      {step === "writing" && (
        <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-mute">
          <Loader2 size={28} className="animate-spin text-brand" aria-hidden />
          <p className="font-semibold text-brand-dark">Writing your draft…</p>
          <p className="text-sm">Your name and address aren&apos;t shared for this step.</p>
        </div>
      )}

      {step === "draft" && (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-mute">
                Landlord&apos;s name
                <input
                  value={landlordName}
                  onChange={(e) => setLandlordName(e.target.value)}
                  placeholder="Their full name"
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-normal text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="block text-xs font-semibold text-mute">
                Your name
                <input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Your full name"
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-normal text-ink outline-none focus:border-brand"
                />
              </label>
            </div>

            {!analysis.propertyAddress && (
              <label className="block text-xs font-semibold text-mute">
                Property address
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="The address of the rental"
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-normal text-ink outline-none focus:border-brand"
                />
              </label>
            )}

            <label className="block text-xs font-semibold text-mute">
              Subject
              <input value={subject} readOnly className="mt-1 w-full rounded-xl border border-line bg-surface/60 px-3 py-2 text-sm font-normal text-ink outline-none" />
            </label>

            <label className="flex min-h-64 flex-1 flex-col text-xs font-semibold text-mute">
              Email
              <textarea
                value={body}
                onChange={(e) => setEditedBody(e.target.value)}
                className="mt-1 min-h-0 w-full flex-1 resize-none rounded-xl border border-line px-3 py-2.5 text-sm font-normal leading-relaxed text-ink outline-none focus:border-brand"
              />
            </label>

            <p className="flex gap-2 rounded-xl bg-surface p-2.5 text-xs leading-relaxed text-mute">
              <Info size={15} className="mt-px shrink-0" aria-hidden />
              <span>
                ClauseGuard doesn&apos;t send this for you. Read it first: it&apos;s general information, not legal advice.
                {blanks > 0 && <b className="font-semibold text-ink"> Some details in brackets still need filling in.</b>}
              </span>
            </p>
            {notice && <p role="status" className="text-sm font-medium text-brand-dark">{notice}</p>}
          </div>

          {handedOff ? (
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-ok-bg/50 p-4">
              <p className="text-sm font-semibold text-ink">Did you send it? We&apos;ll remember what you raised.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setHandedOff(false)} className="min-h-10 cursor-pointer rounded-xl px-3 text-sm font-semibold text-mute hover:bg-white">
                  Not yet
                </button>
                <button
                  type="button"
                  onClick={() => onSent(chosen)}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  <Check size={16} aria-hidden />
                  Yes, I sent it
                </button>
              </div>
            </footer>
          ) : (
            <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line p-4">
              <button type="button" onClick={() => setStep("choose")} className="min-h-11 cursor-pointer rounded-xl px-3 text-sm font-semibold text-brand-dark hover:bg-surface">
                Back
              </button>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyEmail}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-brand-dark hover:bg-surface"
                >
                  <Copy size={16} aria-hidden />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={openEmailApp}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  <ExternalLink size={16} aria-hidden />
                  Open in email app
                </button>
              </div>
            </footer>
          )}
        </>
      )}
    </dialog>
  );
}
