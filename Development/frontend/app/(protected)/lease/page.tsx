"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, CircleCheck, FileText, Loader2, Trash2 } from "lucide-react";
import UploadLeaseButton from "@/components/ui/UploadLeaseButton";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import AnalysisCard, { MobileLeaseRow, MobileRiskLegend, RiskLegend, leaseVerdict } from "@/components/lease/AnalysisCard";
import { deleteAnalysis, errorMessage, getAnalyses } from "@/lib/api";
import type { AnalysisSummary } from "@/lib/notice-types";
import PageTour from "@/components/PageTour";
import { LEASES_TOUR } from "@/lib/tours";

const PAGE_SIZE = 10;
const ROW_HEIGHT = 77;

export default function LeasePage() {
  const [leases, setLeases] = useState<AnalysisSummary[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [toDelete, setToDelete] = useState<AnalysisSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const listRef = useRef<HTMLUListElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getAnalyses()
      .then((data) => !cancelled && setLeases(data))
      .catch((err) => !cancelled && setError(errorMessage(err, "Your leases could not be loaded.")));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!toDelete) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) setToDelete(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toDelete, deleting]);

  useEffect(() => {
    function fitRows() {
      const list = listRef.current;
      if (!list || list.offsetParent === null) return;
      const listTop = list.getBoundingClientRect().top + window.scrollY;
      const footerHeight = footerRef.current?.offsetHeight ?? 64;
      const room = window.innerHeight - listTop - footerHeight - 34;
      setPageSize(Math.max(3, Math.floor(room / ROW_HEIGHT)));
    }
    fitRows();
    window.addEventListener("resize", fitRows);
    return () => window.removeEventListener("resize", fitRows);
  }, [leases, message]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  function retry() {
    setError("");
    setLeases(null);
    setReloadKey((k) => k + 1);
  }

  function askDelete(lease: AnalysisSummary) {
    setDeleteError("");
    setMessage("");
    setToDelete(lease);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAnalysis(toDelete.id);
      setLeases((current) => (current ?? []).filter((lease) => lease.id !== toDelete.id));
      setMessage(`“${toDelete.propertyAddress || toDelete.fileName}” was deleted.`);
      setToDelete(null);
    } catch (err) {
      setDeleteError(errorMessage(err, "The lease could not be deleted. Try again."));
    }
    setDeleting(false);
  }

  const attention = (leases ?? []).filter((lease) => leaseVerdict(lease.counts).attention).sort((a, b) => b.counts.red - a.counts.red || b.counts.amber - a.counts.amber);
  const settled = (leases ?? []).filter((lease) => !leaseVerdict(lease.counts).attention);
  const total = leases?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * pageSize;
  const pageLeases = (leases ?? []).slice(firstIndex, firstIndex + pageSize);
  const mobileLeases = [...attention, ...settled].slice(0, shownCount);

  return (
    <main className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl font-semibold text-brand-dark">My leases</h1>
          <p className="mt-1 text-mute">Every lease you’ve checked, in one place.</p>
        </div>
        <div className="flex items-center gap-3 max-md:hidden">
          <PageTour tourId="leases" steps={LEASES_TOUR} />
          {leases && leases.length > 0 && <UploadLeaseButton />}
        </div>
      </div>

      {message && (
        <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl bg-ok-bg px-4 py-3 text-sm font-medium text-ok animate-fade-up max-md:fixed max-md:inset-x-4 max-md:bottom-24 max-md:z-50 max-md:mt-0 max-md:shadow-lg max-md:ring-1 max-md:ring-ok-line">
          <CircleCheck size={17} aria-hidden />
          {message}
        </p>
      )}

      <div data-tour="lease-list" className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : leases === null ? (
          <LoadingState label="Loading your leases…" />
        ) : leases.length === 0 ? (
          <section className="rounded-3xl border border-line bg-white px-6 py-14 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
              <FileText size={28} />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold text-brand-dark">No leases yet</h2>
            <p className="mx-auto mt-2 max-w-md text-mute">
              Upload your rental agreement to get started. Once the analysis is complete, your lease will appear here.
            </p>
            <UploadLeaseButton className="mt-6" />
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft animate-fade-up [animation-delay:100ms] md:hidden">
              <h2 className="sr-only">Your saved leases</h2>
              <div className="border-b border-line bg-[#f7fbfb] px-4 py-1">
                <MobileRiskLegend />
              </div>
              <ul className="divide-y divide-line row-in">
                {mobileLeases.map((lease) => (
                  <MobileLeaseRow key={lease.id} analysis={lease} onDelete={askDelete} />
                ))}
              </ul>
              {total > shownCount && (
                <button
                  type="button"
                  onClick={() => setShownCount(shownCount + PAGE_SIZE)}
                  className="group flex min-h-12 w-full cursor-pointer items-center justify-center gap-1.5 border-t border-line text-sm font-semibold text-brand transition-colors duration-200 active:bg-[#f7fbfb]"
                >
                  Show {Math.min(PAGE_SIZE, total - shownCount)} more
                  <ChevronDown size={17} aria-hidden className="transition-transform duration-200 group-active:translate-y-0.5" />
                </button>
              )}
              <p className="border-t border-line px-4 py-3 text-sm text-mute">
                Showing {mobileLeases.length} of {total} lease{total === 1 ? "" : "s"}
              </p>
            </section>
            <section className="hidden overflow-hidden rounded-3xl border border-line bg-white shadow-soft animate-fade-up [animation-delay:100ms] md:block">
              <h2 className="sr-only">Your saved leases</h2>
              <div className="border-b border-line px-6 py-3">
                <RiskLegend />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_9rem_2.5rem] gap-x-4 border-b border-line bg-[#f7fbfb] px-6 py-3 text-xs font-semibold text-mute lg:grid-cols-[minmax(0,1fr)_17rem_9rem_2.5rem]">
                <span>Lease</span>
                <span className="hidden lg:block">Clauses by risk</span>
                <span>Overall risk</span>
                <span className="sr-only">Delete</span>
              </div>
              <ul ref={listRef} className="divide-y divide-line row-in" key={`${currentPage}-${pageSize}`}>
                {pageLeases.map((lease) => (
                  <AnalysisCard key={lease.id} analysis={lease} onDelete={askDelete} />
                ))}
              </ul>
              <div ref={footerRef} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3">
                <p className="text-sm text-mute">
                  {pageCount > 1 ? `Showing ${firstIndex + 1}–${firstIndex + pageLeases.length} of ${total} leases` : `${total} lease${total === 1 ? "" : "s"}`}
                </p>
                {pageCount > 1 && (
                  <nav aria-label="Lease pages" className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink hover:border-brand transition-colors duration-200 disabled:cursor-default disabled:opacity-40 disabled:hover:border-line"
                    >
                      <ChevronLeft size={16} aria-hidden />
                      Previous
                    </button>
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                      <button
                        key={number}
                        type="button"
                        onClick={() => setPage(number)}
                        aria-label={`Page ${number}`}
                        aria-current={number === currentPage ? "page" : undefined}
                        className={`grid size-10 cursor-pointer place-items-center rounded-xl text-sm font-semibold transition-colors duration-200 ${number === currentPage ? "bg-brand-dark text-white" : "text-ink hover:bg-surface"}`}
                      >
                        {number}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage === pageCount}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink hover:border-brand transition-colors duration-200 disabled:cursor-default disabled:opacity-40 disabled:hover:border-line"
                    >
                      Next
                      <ChevronRight size={16} aria-hidden />
                    </button>
                  </nav>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {toDelete && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-text">
          <button type="button" aria-label="Cancel" tabIndex={-1} onClick={() => !deleting && setToDelete(null)} className="absolute inset-0 animate-fade-in cursor-default bg-ink/40" />
          <div className="relative w-full animate-sheet-up rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:animate-pop-in md:rounded-3xl md:pb-6">
            <span className="grid size-12 place-items-center rounded-2xl bg-bad-bg text-bad">
              <Trash2 size={22} aria-hidden />
            </span>
            <h2 id="delete-title" className="mt-4 font-display text-xl font-semibold text-brand-dark">Delete this lease?</h2>
            <p id="delete-text" className="mt-2 text-mute">
              <b className="font-semibold text-ink">{toDelete.propertyAddress || toDelete.fileName}</b> and its report will be removed. This can’t be undone.
            </p>
            {deleteError && (
              <p role="alert" className="mt-3 rounded-xl bg-bad-bg px-3 py-2 text-sm font-medium text-bad">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setToDelete(null)}
                disabled={deleting}
                className="min-h-12 cursor-pointer rounded-xl border border-line bg-white px-5 font-semibold text-ink hover:bg-surface disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-bad-solid px-5 font-semibold text-white hover:bg-bad disabled:opacity-70"
              >
                {deleting ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Trash2 size={17} aria-hidden />}
                {deleting ? "Deleting…" : "Delete lease"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}