"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div data-tour="register-form" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-dark font-display">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a ClauseGuard tenant account.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && !isPasswordValid && (
              <p className="mt-1 text-xs text-amber-600">
                {password.length < 8
                  ? "Must be at least 8 characters"
                  : !hasUpper
                  ? "Must include at least one uppercase letter (A-Z)"
                  : "Must include at least one number (0-9)"}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition ${
                  passwordsMismatch
                    ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600"
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

          <label className="flex items-start gap-3 text-sm text-slate-600 pt-1 cursor-pointer">
            <input
              type="checkbox"
              name="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              required
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand accent-brand cursor-pointer"
            />
            <span>
              I agree to the <Link href="/terms" className="font-medium text-brand hover:underline">Terms of Service</Link> and <Link href="/privacy" className="font-medium text-brand hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!isFormComplete || submitting}
            data-tour="register-button"
          >
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p data-tour="switch-to-login" className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
