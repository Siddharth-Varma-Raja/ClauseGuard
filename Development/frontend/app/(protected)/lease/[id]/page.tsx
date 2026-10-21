"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, CircleX, FileSearchCorner, Loader2 } from "lucide-react";
import type { AnalysisResponse } from "@/lib/types";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import { ButtonLink } from "@/components/ui/Button";
import ReviewWorkspace from "@/components/ReviewWorkspace";

export default function LeaseReviewPage() {
    const { id } = useParams<{ id: string }>();
    const [result, setResult] = useState<AnalysisResponse | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        async function check() {
            const res = await fetch(`/api/leases/${id}`);
            if (res.status === 404) {
                setNotFound(true);
                return;
            }
            const data: AnalysisResponse = await res.json();
            setResult(data);

            if (data.status === "processing") {
                timer = setTimeout(check, 2000);
            }
        }

        check();
        return () => clearTimeout(timer);
    }, [id]);

    if (notFound) {
        return (
            <ErrorCard
                title="Lease not found"
                text="We couldn't find this lease. (The fake server forgets uploads when it restarts.)"
            />
        );
    }

    if (!result) {
        return <LoadingState label="Loading your lease…" />;
    }

    if (result.status === "failed") {
        return <ErrorCard title="We couldn't review this lease" text={result.error} />;
    }

    if (result.status === "processing") {
        return <ProcessingCard steps={result.steps} current={result.step} />;
    }

    return <ReviewWorkspace analysis={result.analysis} />;
}

const LINE_WIDTHS = [92, 78, 86, 64, 90, 72, 84, 58, 88, 70];

function ProcessingCard({ steps, current }: { steps: string[]; current: number }) {
    const progress = current / steps.length;
    const linesRead = Math.round(progress * LINE_WIDTHS.length);

    return (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <Card className="grid gap-8 overflow-hidden p-6 sm:grid-cols-[220px_1fr] sm:p-10">
                <div className="mx-auto w-full max-w-[220px] self-center rounded-lg border border-line bg-white p-5 shadow-[0_12px_32px_-12px_rgb(10_59_67/0.35)]">
                    <div className="mb-4 h-2.5 w-1/2 rounded-full bg-brand-dark/80" />
                    <div className="space-y-2.5">
                        {LINE_WIDTHS.map((width, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-colors duration-700 ${i < linesRead ? "bg-brand" : "bg-line"}`}
                                style={{ width: `${width}%` }}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <div className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                        <FileSearchCorner size={24} />
                    </div>
                    <h1 className="mt-5 font-display text-3xl font-semibold text-brand-dark">Reviewing your lease</h1>
                    <p className="mt-2 text-mute">This usually takes under a minute. Keep this page open.</p>

                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface">
                        <div
                            className="h-full rounded-full bg-brand transition-all duration-700"
                            style={{ width: `${Math.max(progress, 0.05) * 100}%` }}
                        />
                    </div>

                    <ol className="mt-6 space-y-4" aria-live="polite">
                        {steps.map((step, i) => {
                            const done = i < current;
                            const active = i === current;
                            return (
                                <li key={step} className="flex items-center gap-3">
                                    <span
                                        className={`grid size-7 shrink-0 place-items-center rounded-full ${done ? "bg-brand text-white" : active ? "bg-brand-soft text-brand" : "border border-line text-mute"
                                            }`}
                                    >
                                        {done ? <Check size={15} /> : active ? <Loader2 size={15} className="animate-spin" /> : i + 1}
                                    </span>
                                    <span className={done || active ? "font-medium text-ink" : "text-mute"}>{step}</span>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </Card>
        </div>
    );
}

function ErrorCard({ title, text }: { title: string; text: string }) {
    return (
        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
            <Card className="p-6 text-center sm:p-8">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-bad-bg text-bad">
                    <CircleX size={28} />
                </div>
                <h1 className="mt-5 font-display text-2xl font-semibold text-brand-dark">{title}</h1>
                <p className="mt-2 text-mute">{text}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <ButtonLink href="/lease/new">Upload another lease</ButtonLink>
                    <ButtonLink href="/lease" variant="secondary">
                        <ArrowLeft size={16} />
                        My leases
                    </ButtonLink>
                </div>
            </Card>
        </div>
    );
}