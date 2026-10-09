"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [islogin, setIslogin] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (islogin) {
      // API for login authentication
    } else {
      // API for forgot password
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">

      {islogin ? (
        // Login Form
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              />

              <div className="mt-1 text-right">
                <button
                  type="button"
                  onClick={() => setIslogin(false)}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--primary)] py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-[var(--primary)] hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>
      ) : (
        // Forgot Password Form
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              Forgot password?
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email address and we'll send you instructions to reset your password.
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--primary)] py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              Send Reset Link
            </button>

            <button
              type="button"
              onClick={() => setIslogin(true)}
              className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to sign in
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
