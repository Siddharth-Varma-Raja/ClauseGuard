"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Lock, Mail } from "lucide-react";

import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import Alert from "@/components/ui/Alert";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [islogin, setIslogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      if (islogin) {
        await signInWithEmailAndPassword(auth, email, password);
        router.replace("/dashboard");
      } else {
        await sendPasswordResetEmail(auth, email);
        setSuccess("Reset link sent. Check your email.");
        setSubmitting(false);
        setIslogin(true);
      }
    } catch (err) {
      if (err instanceof FirebaseError && (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found")) {
        setError("Incorrect email or password");
      } else if (err instanceof FirebaseError && err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center">

      {islogin ? (
        <div className="w-full max-w-md">

          <div className="mb-6 text-center animate-fade-up">
            <h1 className="text-2xl font-bold text-brand-dark font-display">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to access your dashboard
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          {success && (
            <div className="mb-4">
              <Alert tone="success">{success}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up [animation-delay:120ms]">
            <div>
              <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full min-h-12 rounded-2xl border border-line bg-white pl-11 pr-4 text-base outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setIslogin(false);
                    setError("");
                    setSuccess("");
                  }}
                  className="inline-flex min-h-12 items-center text-sm text-brand-dark font-semibold hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="group w-full min-h-[45px] gap-2 active:scale-[0.98]" disabled={submitting}>
              {submitting ? "Logging in…" : "Log in"}
              {!submitting && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Dont have an account?{" "}
            <Link
              href="/register"
              className="inline-flex items-center font-semibold text-brand hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="mb-6 animate-fade-up">
            <h1 className="text-2xl font-bold text-brand-dark font-display">
              Forgot password?
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email address and we will send you instructions to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up [animation-delay:120ms]">
            <div>
              <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full min-h-12 rounded-2xl border border-line bg-white pl-11 pr-4 text-base outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full active:scale-[0.98]" disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={(e) => {
                e.preventDefault();
                setSubmitting(false);
                setEmail("");
                setPassword("");
                setError("");
                setSuccess("");
                setIslogin(true);
              }}
            >
              Back to sign in
            </Button>
          </form>
        </div>
      )}

    </div>
  );
}