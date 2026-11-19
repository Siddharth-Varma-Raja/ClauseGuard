"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Lock, Mail, ArrowRight } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = password.length >= 8 && hasUpper && hasNumber;

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isFormComplete =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    isPasswordValid &&
    confirmPassword.length > 0 &&
    !passwordsMismatch &&
    agreeTerms;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError("Password must be at least 8 characters, include an uppercase letter and a number.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!agreeTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    setSubmitting(true);

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message.replace("Firebase: ", ""));
      setSubmitting(false);
    }
  }

  return (
    <div data-tour="register-form" className="w-full">
      <div className="mb-6 text-center animate-fade-up">
        <h1 className="text-2xl font-bold text-brand-dark font-display">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a ClauseGuard tenant account.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up [animation-delay:120ms]">
        <div>
          <label htmlFor="register-name" className="mb-1 block text-sm font-medium text-slate-700">
            Full name
          </label>
          <div className="relative">
            <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="text"
              id="register-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              className="w-full min-h-12 rounded-2xl border border-line bg-white pl-11 pr-4 text-base outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <div className="relative">
            <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="email"
              id="register-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full min-h-12 rounded-2xl border border-line bg-white pl-11 pr-4 text-base outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type={showPassword ? "text" : "password"}
              id="register-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              className="w-full min-h-12 rounded-2xl border border-line bg-white pl-11 pr-12 text-base outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 grid size-12 cursor-pointer place-items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <ul id="password-hints" className="mt-3 flex flex-wrap gap-1 text-xs">
            <li className={`rounded-full px-2.5 py-1 font-medium transition-colors ${password.length >= 8 ? "bg-ok-bg text-ok" : "bg-surface text-mute"}`}>8+ characters</li>
            <li className={`rounded-full px-2.5 py-1 font-medium transition-colors ${hasUpper ? "bg-ok-bg text-ok" : "bg-surface text-mute"}`}>1 uppercase</li>
            <li className={`rounded-full px-2.5 py-1 font-medium transition-colors ${hasNumber ? "bg-ok-bg text-ok" : "bg-surface text-mute"}`}>1 number</li>
          </ul>
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <div className="relative">
            <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="register-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className={`w-full min-h-12 rounded-2xl border bg-white pl-11 pr-12 text-base outline-none transition-colors ${passwordsMismatch
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-line focus:border-brand focus:ring-1 focus:ring-brand"
                }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-0 top-0 grid size-12 cursor-pointer place-items-center text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {passwordsMismatch && (
            <p className="mt-1 text-xs text-red-600 font-medium">
              Passwords do not match
            </p>
          )}
        </div>

        <label className="flex min-h-12 cursor-pointer items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            name="terms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            required
            className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-brand"
          />
          <span>
            I agree to the <Link href="/terms" className="font-semibold text-brand hover:underline">Terms of Service</Link> and <Link href="/privacy" className="font-semibold text-brand hover:underline">Privacy Policy</Link>.
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          className="group w-full gap-2 active:scale-[0.98]"
          disabled={!isFormComplete || submitting}
          data-tour="register-button"
        >
          {submitting ? "Creating account…" : "Create account"}
          {!submitting && (
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1"/>
          )}
        </Button>
      </form>

      <p data-tour="switch-to-login" className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="inline-flex items-center font-semibold text-brand hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
