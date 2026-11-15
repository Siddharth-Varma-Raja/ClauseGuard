import type { Analysis, Clause, Status } from "./notice-types";
import type { RaisedClauses } from "./raisedClauses";

export type ChangeKind = "fixed" | "better" | "open" | "new" | "worse" | "changed";

export type ClauseChange = {
  key: string;
  before: Clause | null;
  after: Clause | null;
  kind: ChangeKind;
  label: string;
  raised: boolean;
};

export type DiffPart = {
  text: string;
  changed: boolean;
};

const RISK: Record<Status, number> = { red: 3, amber: 2, green: 1, grey: 0 };

function normalise(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function wordOverlap(a: string, b: string) {
  const first = new Set(normalise(a).split(" "));
  const second = new Set(normalise(b).split(" "));
  const shared = [...first].filter((word) => second.has(word)).length;
  return shared / Math.max(first.size, second.size, 1);
}

function matchClauses(previous: Clause[], current: Clause[]) {
  const pairs = new Map<string, Clause>();
  const free = new Set(current);

  function take(test: (before: Clause, after: Clause) => boolean) {
    for (const before of previous) {
      if (pairs.has(before.id)) continue;
      const found = [...free].find((after) => test(before, after));
      if (found) {
        pairs.set(before.id, found);
        free.delete(found);
      }
    }
  }

  take((before, after) => normalise(before.text) === normalise(after.text));
  take((before, after) => normalise(before.title) === normalise(after.title));
  take((before, after) => wordOverlap(before.text, after.text) >= 0.5);

  return { pairs, added: [...free] };
}

function isFlagged(clause: Clause) {
  return clause.status === "red" || clause.status === "amber";
}

function describeEdit(before: Clause, after: Clause): Pick<ClauseChange, "kind" | "label"> {
  const difference = RISK[before.status] - RISK[after.status];
  if (difference > 0 && !isFlagged(after)) return { kind: "fixed", label: "Fixed" };
  if (difference > 0) return { kind: "better", label: "Improved" };
  if (difference < 0) return { kind: "worse", label: "Got worse" };
  return { kind: "changed", label: "Reworded" };
}

export function compareLeases(previous: Analysis, current: Analysis, raised: RaisedClauses | null) {
  const { pairs, added } = matchClauses(previous.clauses, current.clauses);
  const raisedTitles = new Set((raised?.clauses ?? []).map((c) => normalise(c.title)));
  const changes: ClauseChange[] = [];
  let unchanged = 0;

  for (const before of previous.clauses) {
    const after = pairs.get(before.id) ?? null;
    const wasRaised = raisedTitles.has(normalise(before.title));

    if (!after) {
      const flagged = isFlagged(before);
      changes.push({ key: before.id, before, after, kind: flagged ? "fixed" : "changed", label: "Removed", raised: wasRaised });
    } else if (normalise(before.text) !== normalise(after.text)) {
      changes.push({ key: before.id, before, after, ...describeEdit(before, after), raised: wasRaised });
    } else if (wasRaised) {
      changes.push({ key: before.id, before, after, kind: "open", label: "No change", raised: true });
    } else {
      unchanged += 1;
    }
  }

  for (const after of added) {
    changes.push({ key: after.id, before: null, after, kind: isFlagged(after) ? "new" : "changed", label: "New clause", raised: false });
  }

  return { changes, unchanged };
}

function splitWords(text: string) {
  return text.split(/(\s+)/).filter(Boolean);
}

export function diffWords(beforeText: string, afterText: string) {
  const before = splitWords(beforeText);
  const after = splitWords(afterText);
  const table = Array.from({ length: before.length + 1 }, () => new Array<number>(after.length + 1).fill(0));

  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const beforeParts: DiffPart[] = [];
  const afterParts: DiffPart[] = [];
  let i = 0;
  let j = 0;

  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      beforeParts.push({ text: before[i], changed: false });
      afterParts.push({ text: after[j], changed: false });
      i += 1;
      j += 1;
    } else if (j < after.length && (i >= before.length || table[i][j + 1] >= table[i + 1][j])) {
      afterParts.push({ text: after[j], changed: true });
      j += 1;
    } else {
      beforeParts.push({ text: before[i], changed: true });
      i += 1;
    }
  }

  return { before: beforeParts, after: afterParts };
}
