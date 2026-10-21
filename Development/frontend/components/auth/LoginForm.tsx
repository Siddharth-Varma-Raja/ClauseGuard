"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [islogin, setIslogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSubmitting(true);  
  try {
    if (islogin) {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/dashboard");
    } else {
      await sendPasswordResetEmail(auth, email);
      alert("Reset link sent. Check your email.");
      setSubmitting(false);
      setIslogin(true);
    }
  } catch (err) {
      if (err instanceof FirebaseError && err.code === "auth/invalid-credential") {
        alert("Incorrect email or password");
      } else {
        alert("Something went wrong. Please try again.");
  }
  setSubmitting(false);
  }
}

  return (
    <div className="flex min-h-screen items-center justify-center p-4">

      {islogin ? (
        // Login Form
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-brand-dark font-display">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />

              <div className="mt-1 text-right">
                <button
                  type="button"
                  onClick={() => setIslogin(false)}
                  className="text-xs text-brand-dark font-bold hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Dont have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-brand hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>
      ) : (
        // Forgot Password Form
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-brand-dark font-display">
              Forgot password?
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email address and we will send you instructions to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

             <Button
                type="submit"
                size="lg"
                className="w-full"
              >
                Send Reset Link
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={(e) => { e.preventDefault();setSubmitting(false); setEmail(""); setPassword(""); setIslogin(true); }}
            >
              Back to sign in
            </Button>
          </form>
        </div>
      )}

    </div>
  );
}
