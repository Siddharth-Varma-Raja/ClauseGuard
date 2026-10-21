import Link from "next/link";
import { FileText, Plus, Upload, ArrowLeft } from "lucide-react";
import PageTour from "@/components/PageTour";
import { LEASES_TOUR } from "@/lib/tours";

export default function LeasePage() {

  const lease = [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </Link>
            <PageTour tourId="leases" steps={LEASES_TOUR} />
          </div>
          <h1 className="text-3xl font-semibold font-display text-brand-dark mt-8">
            My leases
          </h1>
          <p className="mt-2 text-mute">
            Upload and review your rental agreements.
          </p>
        </div>
      </div>

      {lease.length === 0 ? (
        <section data-tour="lease-list" className="mt-10 rounded-2xl border border-line bg-white px-6 py-14 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
            <FileText size={28} />
          </div>

          <h2 className="mt-5 text-xl font-semibold font-display text-brand-dark">
            No leases yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-mute">
            Upload your rental agreement to get started. Once the
            analysis is complete, your lease will appear here.
          </p>

          <Link
            href="/lease/new"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            <Upload size={18} />
            Upload your first lease
          </Link>
        </section>
      ) : (
        <section data-tour="lease-list" className="mt-8">
          <h2 className="text-xl font-semibold text-brand">
            Your saved leases
          </h2>
          {"Lease Cards"}
        </section>
      )}
    </main>
  );
}