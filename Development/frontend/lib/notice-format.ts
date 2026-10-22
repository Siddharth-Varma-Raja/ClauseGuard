export function todayIso() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

export function daysUntil(iso: string) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((Date.parse(iso) - Date.parse(todayIso())) / oneDay);
}

export function relativeDays(days: number) {
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    if (days === -1) return "yesterday";
    return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function fmtDate(iso: string) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

export function euro(amount: number) {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: string, style: "short" | "long" = "short") {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IE", {
        day: "numeric",
        month: style === "long" ? "long" : "short",
        year: "numeric",
    });
}

export function formatDateOrDateTime(value: string) {
    if (!value.includes("T")) return formatDate(value, "long");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-IE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}