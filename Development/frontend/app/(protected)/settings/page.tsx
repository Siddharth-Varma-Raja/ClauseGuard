"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, KeyRound, Loader2, Trash2 } from "lucide-react";
import BackLink from "@/components/ui/BackLink";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  deleteAllAnalyses,
  deleteMyAccount,
  errorMessage,
  exportMyData,
  getPreferences,
  getProfile,
  updatePreferences,
} from "@/lib/api";
import type { Preferences, UserProfile } from "@/lib/notice-types";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"" | "export" | "leases" | "account">("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const isNewPasswordValid = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getProfile(), getPreferences()])
      .then(([p, pr]) => {
        if (cancelled) return;
        setProfile(p);
        setPrefs(pr);
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err, "Your settings could not be loaded.")));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setLoadError("");
    setReloadKey((k) => k + 1);
  }

  async function savePreference(changes: Partial<Preferences>) {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...changes });
    setSaving(true);
    setMessage(null);
    try {
      setPrefs(await updatePreferences(changes));
    } catch (err) {
      setPrefs(previous);
      setMessage({ tone: "error", text: errorMessage(err, "Your preference wasn't saved.") });
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setBusy("export");
    setMessage(null);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clauseguard-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, "Your data couldn't be exported.") });
    } finally {
      setBusy("");
    }
  }

  async function handleDeleteLeases() {
    if (!window.confirm("Delete ALL your lease analyses and uploaded files? This can't be undone.")) return;
    setBusy("leases");
    setMessage(null);
    try {
      await deleteAllAnalyses();
      setMessage({ tone: "success", text: "All your lease analyses and files were deleted." });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, "Your leases couldn't be deleted.") });
    } finally {
      setBusy("");
    }
  }

  async function handleDeleteAccount() {
    setBusy("account");
    setMessage(null);
    try {
      await deleteMyAccount();
      await signOut(auth);
      router.replace("/");
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, "Your account couldn't be deleted.") });
      setBusy("");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (!isNewPasswordValid) {
      setPasswordMessage({
        tone: "error",
        text: "New password must be at least 8 characters and include an uppercase letter and a number.",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({ tone: "error", text: "New passwords do not match." });
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      setPasswordMessage({ tone: "error", text: "User not logged in." });
      return;
    }

    setPasswordLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setPasswordMessage({ tone: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setPasswordMessage({ tone: "error", text: "Current password is incorrect." });
      } else {
        setPasswordMessage({ tone: "error", text: "Failed to update password. Please try again." });
      }
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <BackLink href="/dashboard" label="Back to dashboard" />
      <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">Settings</h1>
      <p className="mt-2 text-lg text-mute">Your account, preferences and data.</p>

      {message && (
        <div className="mt-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      {loadError ? (
        <div className="mt-6">
          <ErrorState message={loadError} onRetry={retry} />
        </div>
      ) : !profile || !prefs ? (
        <LoadingState label="Loading your settings…" />
      ) : (
        <div className="mt-6 space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-brand-dark">Account</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-mute">Name</dt>
                <dd className="font-medium text-ink">{profile.displayName || "—"}</dd>
              </div>
              <div>
                <dt className="text-mute">Email</dt>
                <dd className="font-medium text-ink">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-mute">Member since</dt>
                <dd className="font-medium text-ink">
                  {new Date(profile.createdAt).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <KeyRound size={20} className="text-brand" />
              <h2 className="text-lg font-semibold text-brand-dark">Change password</h2>
            </div>
            <p className="mt-1 text-sm text-mute">Update the password used to sign in to your account.</p>

            {passwordMessage && (
              <div className="mt-4">
                <Alert tone={passwordMessage.tone}>{passwordMessage.text}</Alert>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700">Current password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">New password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters (uppercase & number)"
                  required
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Confirm new password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-mute cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                  className="accent-brand"
                />
                Show passwords
              </label>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={passwordLoading || !currentPassword || !newPassword || !confirmNewPassword}
                >
                  {passwordLoading ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-brand-dark">Preferences</h2>
              {saving && <Loader2 size={18} className="animate-spin text-brand" aria-label="Saving" />}
            </div>

            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-ink">How much detail in lease explanations?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["simple", "Simple", "Short, plain-English summaries."],
                    ["detailed", "Detailed", "Also show why each clause was flagged."],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label key={value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-sm hover:bg-surface">
                    <input
                      type="radio"
                      name="explanationDetail"
                      checked={prefs.explanationDetail === value}
                      onChange={() => savePreference({ explanationDetail: value })}
                      className="mt-1 accent-brand"
                    />
                    <span>
                      <span className="font-medium">{label}</span>
                      <span className="block text-mute">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-3.5 text-sm">
              <input
                type="checkbox"
                checked={prefs.remindersEnabled}
                onChange={(e) => savePreference({ remindersEnabled: e.target.checked })}
                className="mt-0.5 size-5 shrink-0 accent-brand"
              />
              <span>
                <span className="font-medium">Deadline reminders</span>
                <span className="mt-0.5 block text-mute">Remind me about upcoming dates on my tenancy timeline.</span>
              </span>
            </label> */}
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-brand-dark">Your data</h2>
            <p className="mt-1 text-sm text-mute">You can download or delete the data ClauseGuard holds about you.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={handleExport} disabled={busy !== ""}>
                {busy === "export" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download my data
              </Button>
              <Button variant="danger" onClick={handleDeleteLeases} disabled={busy !== ""}>
                {busy === "leases" ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete all my leases
              </Button>
            </div>
          </Card>

          <Card className="border-bad-line p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-bad">Delete account</h2>
            <p className="mt-1 text-sm text-mute">
              This deletes your leases, notice checks, timeline and preferences, and closes your account. It can't be undone.
            </p>
            <label htmlFor="confirm-delete" className="mt-4 block text-sm font-medium">
              Type <strong>DELETE</strong> to confirm
            </label>
            <div className="mt-2 flex flex-wrap gap-3">
              <input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="min-h-11 w-48 rounded-xl border border-line px-3"
                autoComplete="off"
              />
              <Button variant="danger" onClick={handleDeleteAccount} disabled={confirmText !== "DELETE" || busy !== ""}>
                {busy === "account" && <Loader2 size={16} className="animate-spin" />}
                Delete my account
              </Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
