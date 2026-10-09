import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
      <div className="text-center">
        <p className="text-6xl font-bold text-[var(--primary)]">
            404
        </p>

        <h1 className="mt-2 text-xl font-bold">
            Page not found
        </h1>

        <p className="mt-2 text-md text-[var(--muted)]">
            The page you're looking for doesn't exist.
        </p>

        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-[var(--primary)] px-5 py-2 font-medium text-white"
        >
            Back to ClauseGuard
        </Link>
      </div>
    </div>
  );
}