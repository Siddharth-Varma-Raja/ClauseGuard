
const TIME_ZONE = "Europe/Dublin";

export function formatEuro(cents: number | null) {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    cents / 100
  );
}

export function formatDate(value: string | null, style: "short" | "long" = "short") {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return date.toLocaleDateString("en-IE", {
    day: "numeric",
    month: style,
    year: "numeric",
    timeZone: TIME_ZONE,
  });
}

export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysUntil(isoDate: string) {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const target = new Date(`${isoDate}T00:00:00Z`).getTime();
  const today = new Date(`${todayIso()}T00:00:00Z`).getTime();
  return Math.round((target - today) / ONE_DAY);
}

export function relativeDays(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function formatFileSize(bytes: number) {
  const MB = 1024 * 1024;
  return bytes < MB ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / MB).toFixed(1)} MB`;
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function isoToDisplay(iso: string): string {
  if (!iso || iso.length !== 10) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function displayToIso(display: string): string {
  if (!display || display.length !== 10) return "";
  const [day, month, year] = display.split("/");
  return `${year}-${month}-${day}`;
}

export function isValidDisplayDate(display: string): boolean {
  if (!display || display.length !== 10) return false;
  const [dayStr, monthStr, yearStr] = display.split("/");
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function passwordScore(password: string) {
  const rules = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/];
  return rules.filter((rule) => rule.test(password)).length;
}
