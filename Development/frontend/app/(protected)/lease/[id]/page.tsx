"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CircleX } from "lucide-react";
import Card from "@/components/ui/Card";
import type { Analysis } from "@/lib/notice-types";
import LoadingState from "@/components/ui/LoadingState";
import { ButtonLink, Button } from "@/components/ui/Button";
import { errorMessage, getAnalysis } from "@/lib/api";
import ReviewWorkspace from "@/components/ReviewWorkspace";


type State =
    | { kind: "loading" }
    | { kind: "ready"; analysis: Analysis }
    | { kind: "not-found" }
    | { kind: "error"; message: string };

export default function LeaseReviewPage() {
    const { id } = useParams<{ id: string }>();
    const [state, setState] = useState<State>({ kind: "loading" });
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        getAnalysis(id)
            .then((analysis) => !cancelled && setState(analysis ? { kind: "ready", analysis } : { kind: "not-found" }))
            .catch((err) => !cancelled && setState({ kind: "error", message: errorMessage(err, "We couldn't load this lease.") }));
        return () => {
            cancelled = true;
        };
    }, [id, reloadKey]);

    function retry() {
        setState({ kind: "loading" });
        setReloadKey((k) => k + 1);
    }

    if (state.kind === "loading") return <LoadingState label="Loading your lease…" />;

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