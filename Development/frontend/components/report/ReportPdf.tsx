import { Document, Font } from "@react-pdf/renderer";
import type { Analysis, StatusCounts } from "@/lib/notice-types";
import { dateTime, longDate, money } from "./pdf/parts";
import CoverPage from "./pdf/CoverPage";
import OverviewPage from "./pdf/OverviewPage";
import ClausesPage from "./pdf/ClausesPage";
import IssuesPage from "./pdf/IssuesPage";
import NextStepsPage from "./pdf/NextStepsPage";

Font.registerHyphenationCallback((word) => [word]);

export default function ReportPdf({ analysis, leaseName, end, userName, userEmail }: { analysis: Analysis; leaseName: string; end: string | null; userName: string; userEmail: string }) {
    const { clauses } = analysis;
    const total = clauses.length;
    const counts: StatusCounts = { red: 0, amber: 0, green: 0, grey: 0 };
    clauses.forEach((c) => counts[c.status]++);
    const flagged = (["red", "amber"] as const).flatMap((st) => clauses.filter((c) => c.status === st));
    const start = analysis.tenancyStart?.slice(0, 10) ?? null;
    const rent = analysis.monthlyRentCents;
    const deposit = analysis.depositCents;
    const over = rent != null && deposit != null && deposit > rent;
    const reportId = `CG-${analysis.id.slice(0, 8).toUpperCase()}`;
    const page = { reportId, leaseName };

    const facts: [string, string | null, string?][] = [
        ["Monthly rent", money(rent)],
        ["Deposit", money(deposit), over ? `${Math.round((deposit ?? 0) / (rent ?? 1))} months' rent. The limit is one month.` : undefined],
        ["Tenancy starts", start ? longDate(start) : null],
        ["Fixed term ends", end ? longDate(end) : null],
        ["Fixed term", analysis.termMonths ? `${analysis.termMonths} months` : null],
    ];

    const details: [string, string][] = [
        ["Prepared for", userEmail ? `${userName} (${userEmail})` : userName],
        ["Report ID", reportId],
        ["Lease checked on", dateTime(new Date(analysis.createdAt))],
        ["Report downloaded on", dateTime(new Date())],
        ["File name", analysis.fileName],
    ];
    if (start && end) details.push(["Tenancy dates", `${longDate(start)} to ${longDate(end)}`]);

    const contents = [
        { id: "overview", label: "Overview" },
        { id: "all", label: "Every clause in your lease" },
        ...(flagged.length > 0 ? [{ id: "issues", label: "Issues to raise with your landlord" }] : []),
        { id: "next", label: "What to do next and conclusion" },
    ];

    return (
        <Document title={`ClauseGuard report - ${leaseName}`} author="ClauseGuard">
            <CoverPage {...page} userName={userName} fileName={analysis.fileName} pageCount={analysis.pageCount} total={total} issues={flagged.length} details={details} contents={contents} />
            <OverviewPage {...page} createdAt={analysis.createdAt} pageCount={analysis.pageCount} total={total} counts={counts} facts={facts} />
            <ClausesPage {...page} clauses={clauses} />
            {flagged.length > 0 && <IssuesPage {...page} flagged={flagged} />}
            <NextStepsPage {...page} clauses={clauses} counts={counts} issues={flagged.length} />
        </Document>
    );
}