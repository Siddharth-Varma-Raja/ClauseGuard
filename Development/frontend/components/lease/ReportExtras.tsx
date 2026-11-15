import Link from "next/link";
import { History, Info } from "lucide-react";
import Logo from "@/components/ui/Logo";
import type { Analysis } from "@/lib/notice-types";

export function PrintHeader({ analysis }: { analysis: Analysis }) {
    const today = new Date().toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });
    return (
        <div className="mb-6 hidden items-center justify-between border-b-2 border-brand-dark pb-4 print:flex">
            <Logo />
            <div className="text-right text-sm text-mute">
                <p className="font-semibold text-brand-dark">Lease report</p>
                <p>
                    Report CG-{analysis.id.slice(0, 8).toUpperCase()} · Created {today}
                </p>
            </div>
        </div>
    );
}

export function OlderVersionNote({ analysis }: { analysis: Analysis }) {
    const versions = analysis.versions ?? [];
    const latest = versions[versions.length - 1];
    if (!latest || latest.id === analysis.id) return null;
    return (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-warn-line bg-warn-bg px-4 py-3">
            <History size={18} className="shrink-0 text-warn" />
            <p className="min-w-0 flex-1 text-ink">
                This is an older version of your lease (Version {analysis.version}). Your landlord sent a newer one.
            </p>
            <Link href={`/lease/${latest.id}/report`} className="font-semibold text-brand-dark underline print:hidden">
                See the latest report
            </Link>
        </div>
    );
}

export function HelpBox() {
    return (
        <p className="mt-10 flex items-start justify-center gap-2 text-center text-sm text-mute">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>
                ClauseGuard gives automated, informational analysis. It is not legal advice.
            </span>
        </p>
    );
}