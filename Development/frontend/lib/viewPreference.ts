export type ReviewView = "summary" | "lease";

const KEY = "clauseguard-review-view";

export function loadViewPreference(): ReviewView {
  try {
    return localStorage.getItem(KEY) === "lease" ? "lease" : "summary";
  } catch {
    return "summary";
  }
}

export function saveViewPreference(view: ReviewView) {
  try {
    localStorage.setItem(KEY, view);
  } catch {
    // Nothing to do: the switch still works for this visit
  }
}
