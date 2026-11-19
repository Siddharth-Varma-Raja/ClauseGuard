import type { ActionGroup, ActionItem, ActionList, Clause } from "./notice-types";

export const ACTION_GROUPS: { key: ActionGroup; label: string; open: boolean }[] = [
  { key: "tenant_must", label: "You must", open: true },
  { key: "not_allowed", label: "Not allowed", open: true },
  { key: "charges", label: "Charges and fees", open: true },
  { key: "landlord_must", label: "Landlord must", open: false },
  { key: "landlord_may", label: "Landlord may (rights)", open: false },
  { key: "tenant_may", label: "You may (rights)", open: false },
  { key: "ending_lease", label: "Ending the lease", open: false },
  { key: "unpaid_rent", label: "If rent is not paid", open: false },
];

export function clauseNumber(number: string | number) {
  return String(number)
    .trim()
    .replace(/^clause\s+/i, "")
    .replace(/\.$/, "");
}

export function actionGroups(list: ActionList) {
  return ACTION_GROUPS.map((g) => ({ ...g, items: list[g.key] ?? [] })).filter((g) => g.items.length > 0);
}

export function actionCount(list: ActionList) {
  return actionGroups(list).reduce((sum, g) => sum + g.items.length, 0);
}

export function clauseFor(item: ActionItem, clauses: Clause[]) {
  return clauses.find((c) => clauseNumber(c.number) === clauseNumber(item.clause));
}
