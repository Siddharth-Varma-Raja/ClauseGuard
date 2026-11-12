import type { Clause, Status, StatusCounts } from "@/lib/notice-types";

export const MEANING: Record<Status, string> = {
    red: "Goes against Irish tenancy law. Don't sign until it's fixed.",
    amber: "Allowed but unclear or unfair to you. Check with your landlord.",
    green: "A fair term found in most leases.",
    grey: "Definitions and standard wording. Nothing to do.",
};

export const LABEL: Record<Status, string> = {
    red: "High Risk",
    amber: "Medium Risk",
    green: "Low Risk",
    grey: "General wording",
};

export const BRIGHT: Record<Status, string> = {
    red: "#ff8f80",
    amber: "#f5c451",
    green: "#7fdca5",
    grey: "#b8c3cc",
};

export function heading(clause: Clause) {
    return clause.number && clause.number !== "0" ? `Clause ${clause.number}: ${clause.title}` : clause.title;
}

export const CARD = "rounded-[28px] border border-[#cfe1e2] bg-white shadow-[0_1px_2px_rgb(10_59_67/0.06),0_12px_32px_-16px_rgb(10_59_67/0.3)]";

export function plural(n: number, one: string, many: string) {
    return n === 1 ? one : many;
}

export function verdictOf(counts: StatusCounts, total: number) {
    const level: "red" | "amber" | "green" = counts.red > 0 ? "red" : counts.amber > 0 ? "amber" : "green";
    const verdict = level === "red" ? "Not yet." : level === "amber" ? "Yes, after a few questions." : "Yes, it looks fine.";
    const reason =
        level === "red"
            ? `${counts.red} ${plural(counts.red, "clause goes", "clauses go")} against Irish tenancy law. Ask your landlord to change ${plural(counts.red, "it", "them")} before you sign.`
            : level === "amber"
                ? `Nothing goes against Irish tenancy law, but ${counts.amber} ${plural(counts.amber, "clause is", "clauses are")} unclear or unfair to you.`
                : `We read all ${total} clauses and found nothing to raise with your landlord.`;
    return { level, verdict, reason };
}