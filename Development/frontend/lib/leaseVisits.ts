const KEY = "clauseguard-lease-opened";

function readAll(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function markLeaseOpened(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [id]: Date.now() }));
  } catch {}
}

export function leaseOpenedTimes() {
  return readAll();
}

export function openedAgo(time: number | undefined) {
  if (!time) return "";
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return "Opened just now";
  if (minutes < 60) return `Opened ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Opened ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 45) return `Opened ${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  return `Opened ${months} month${months === 1 ? "" : "s"} ago`;
}
