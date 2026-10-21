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