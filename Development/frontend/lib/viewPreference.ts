export type ReviewView = "summary" | "lease";

const KEY = "clauseguard-default-lease-view";

export function loadDefaultLeaseView(): ReviewView {
  if (typeof window === "undefined") return "summary";
  try {
    const val = localStorage.getItem(KEY);
    return val === "lease" ? "lease" : "summary";
  } catch {
    return "summary";
  }
}

export function saveDefaultLeaseView(view: ReviewView) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, view);
  } catch {}
}

export const loadViewPreference = loadDefaultLeaseView;
export const saveViewPreference = saveDefaultLeaseView;
