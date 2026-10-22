import type { Analysis, Clause } from "@/lib/notice-types";
import { STATUS, STATUS_ORDER } from "@/lib/status";

export function downloadReport(analysis: Analysis, clauses: Clause[]) {
    const line = "─".repeat(60);
    const euro = (cents: number | null) =>
        cents == null ? "—" : new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);

    const parts: string[] = [
        "CLAUSEGUARD LEASE REVIEW",
        line,
        `File:              ${analysis.fileName}`,
        `Checked on:        ${new Date(analysis.createdAt).toLocaleString("en-IE")}`,
        `Property:          ${analysis.propertyAddress ?? "—"}`,
        `Monthly rent:      ${euro(analysis.monthlyRentCents)}`,
        `Deposit:           ${euro(analysis.depositCents)}`,
        `Tenancy start:     ${analysis.tenancyStart ?? "—"}`,
        `Term:              ${analysis.termMonths ? `${analysis.termMonths} months` : "—"}`,
        "",
        "SUMMARY",
        ...STATUS_ORDER.map((s) => `  ${STATUS[s].label.padEnd(18)} ${clauses.filter((c) => c.status === s).length}`),
        "",
    ];

    for (const status of STATUS_ORDER) {
        for (const c of clauses.filter((clause) => clause.status === status)) {
            parts.push(
                line,
                `${c.number}. ${c.title}   [${STATUS[c.status].label}]   (page ${c.page})`,
                "",
                `"${c.text}"`,
                "",
                `What it means: ${c.explanation}`,
            );
            if (c.reason) parts.push(`Why it was flagged: ${c.reason}`);
            if (c.nextSteps.length) parts.push("What you can do:", ...c.nextSteps.map((s) => `  - ${s}`));
            if (c.sources.length) {
                parts.push("Sources:", ...c.sources.map((s) => `  - ${s.title}${s.note ? ` (${s.note})` : ""}${s.url ? ` ${s.url}` : ""}`));
            }
            parts.push("");
        }
    }

    parts.push(line, "ClauseGuard gives automated, informational analysis. It is not legal advice.");

    const blob = new Blob([parts.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ClauseGuard report - ${analysis.fileName.replace(/\.[^.]+$/, "")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}