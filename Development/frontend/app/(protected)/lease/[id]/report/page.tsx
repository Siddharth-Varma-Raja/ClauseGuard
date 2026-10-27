"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CircleX } from "lucide-react";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import { Button, ButtonLink } from "@/components/ui/Button";
import LeaseReport from "@/components/lease/LeaseReport";
import { errorMessage, getAnalysis } from "@/lib/api";
import type { Analysis } from "@/lib/notice-types";

type State =
    | { kind: "loading" }
    | { kind: "ready"; analysis: Analysis }
    | { kind: "not-found" }
    | { kind: "error"; message: string };

export default function LeaseReportPage() {
    const { id } = useParams<{ id: string }>();
    const [state, setState] = useState<State>({ kind: "loading" });
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        getAnalysis(id)
            .then((analysis) => !cancelled && setState(analysis ? { kind: "ready", analysis } : { kind: "not-found" }))
            .catch((err) => !cancelled && setState({ kind: "error", message: errorMessage(err, "We couldn't load this report.") }));
        return () => {
            cancelled = true;
        };
    }, [id, reloadKey]);

    function retry() {
        setState({ kind: "loading" });
        setReloadKey((k) => k + 1);
    }

    if (state.kind === "loading") return <LoadingState label="Loading your report…" />;

    if (state.kind === "ready") return <LeaseReport analysis={state.analysis} />;

    const notFound = state.kind === "not-found";
    return (
        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
            <Card className="p-6 text-center sm:p-8">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-bad-bg text-bad">
                    <CircleX size={28} />
                </div>
                <h1 className="mt-5 font-display text-2xl font-semibold text-brand-dark">
                    {notFound ? "Report not found" : "We couldn't load this report"}
                </h1>
                <p className="mt-2 text-mute">
                    {notFound ? "We couldn't find this lease. It may have been deleted, or the link may be wrong." : state.message}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {notFound ? <ButtonLink href="/lease/new">Upload another lease</ButtonLink> : <Button onClick={retry}>Try again</Button>}
                    <ButtonLink href="/lease" variant="secondary">
                        <ArrowLeft size={16} />
                        My leases
                    </ButtonLink>
                </div>
            </Card>
        </div>
    );
}
