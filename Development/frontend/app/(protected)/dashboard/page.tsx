import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back
        </h1>

        <p className="mt-2 text-[var(--muted)]">
          What would you like to do?
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link
          href="/validate/new"
          className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold">
            Validate New Lease
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Upload a draft lease and check important clauses
            before signing.
          </p>

          <span className="mt-5 inline-block text-sm font-medium text-[var(--primary)]">
            Get started →
          </span>
        </Link>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 opacity-60">
          <h2 className="text-lg font-semibold">
            Check a Notice
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Check whether a landlord notice follows the relevant
            tenancy requirements.
          </p>

          <span className="mt-5 inline-block text-sm text-[var(--muted)]">
            Coming soon
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 opacity-60">
          <h2 className="text-lg font-semibold">
            Tenancy Timeline
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Track important dates, deadlines and tenancy events.
          </p>

          <span className="mt-5 inline-block text-sm text-[var(--muted)]">
            Coming soon
          </span>
        </div>
      </div>
    </div>
  );
}