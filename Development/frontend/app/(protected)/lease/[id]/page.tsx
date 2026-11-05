"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CircleX } from "lucide-react";
import Card from "@/components/ui/Card";
import type { Analysis, AnalysisStatus, UploadProgressEvent } from "@/lib/notice-types";
import LoadingState from "@/components/ui/LoadingState";
import { ButtonLink, Button } from "@/components/ui/Button";
import { errorMessage, getAnalysis, getAnalysisStatus } from "@/lib/api";
import ReviewWorkspace from "@/components/ReviewWorkspace";
import ProcessingCard from "@/components/lease/ProcessingCard";

type State =
  | { kind: "loading" }
  | { kind: "processing"; status: AnalysisStatus }
  | { kind: "ready"; analysis: Analysis }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

export default function LeaseReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const analysis = await getAnalysis(id);
        if (cancelled) return;

        if (!analysis) {
          setState({ kind: "not-found" });
          return;
        }

        if (analysis.processingStatus === "failed") {
          setState({
            kind: "error",
            message: "Document processing failed. Please ensure the uploaded file is a valid tenancy agreement and try again.",
          });
          return;
        }

        if (analysis.processingStatus === "processing" || analysis.processingStatus === "pending") {
          const statusRes = await getAnalysisStatus(id).catch(() => null);
          if (cancelled) return;
          setState({
            kind: "processing",
            status: statusRes || {
              id,
              status: "processing",
              processingStep: "analysing",
              processingProgress: 0.5,
              processingMessage: "Processing document…",
            },
          });
          return;
        }

        setState({ kind: "ready", analysis });
      } catch (err) {
        if (!cancelled) {
          setState({ kind: "error", message: errorMessage(err, "We couldn't load this lease.") });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  // Polling loop when in processing state
  useEffect(() => {
    if (state.kind !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const status = await getAnalysisStatus(id);
        if (status.status === "completed") {
          clearInterval(interval);
          setReloadKey((k) => k + 1);
        } else if (status.status === "failed") {
          clearInterval(interval);
          setState({
            kind: "error",
            message: "Document processing failed. Please try re-uploading a clearer scan.",
          });
        } else {
          setState({ kind: "processing", status });
        }
      } catch {
        // Temporary network glitch, ignore and retry next tick
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id, state.kind]);

  function retry() {
    setState({ kind: "loading" });
    setReloadKey((k) => k + 1);
  }

  if (state.kind === "loading") return <LoadingState label="Loading your lease…" />;

  if (state.kind === "processing") {
    const s = state.status;
    const progressEvent: UploadProgressEvent = {
      step: (s.processingStep as UploadProgressEvent["step"]) || "analysing",
      stepIndex: s.processingStepIndex ?? 4,
      progress: s.processingProgress ?? 0.7,
      message: s.processingMessage ?? "Processing document…",
      estimatedSeconds: s.estimatedSeconds ?? 35,
      estimatedSecondsRemaining: Math.max(5, (s.estimatedSeconds ?? 35) * (1 - (s.processingProgress ?? 0.7))),
    };

    return (
      <ProcessingCard
        event={progressEvent}
      />
    );
  }

  if (state.kind === "not-found") {
    return (
      <ErrorCard
        title="Lease not found"
        text="We couldn't find this lease. It may have been deleted, or the link may be wrong."
      />
    );
  }

  if (state.kind === "error") {
    return <ErrorCard title="We couldn't load this lease" text={state.message} onRetry={retry} />;
  }

  return <ReviewWorkspace analysis={state.analysis} />;
}

function ErrorCard({ title, text, onRetry }: { title: string; text: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <Card className="p-6 text-center sm:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-bad-bg text-bad">
          <CircleX size={28} />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-brand-dark">{title}</h1>
        <p className="mt-2 text-mute">{text}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry ? (
            <Button onClick={onRetry}>Try again</Button>
          ) : (
            <ButtonLink href="/lease/new">Upload another lease</ButtonLink>
          )}
          <ButtonLink href="/lease" variant="secondary">
            <ArrowLeft size={16} />
            My leases
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
