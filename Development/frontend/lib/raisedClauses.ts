import type { Clause } from "./notice-types";
import { isSampleId } from "./sample-lease";

export type RaisedClauses = {
  sentAt: string;
  clauses: { number: string; title: string }[];
};

const sampleRaised = new Map<string, RaisedClauses>();

function keyFor(analysisId: string) {
  return `clauseguard-raised-${analysisId}`;
}

export function loadRaised(analysisId: string): RaisedClauses | null {
  if (isSampleId(analysisId)) return sampleRaised.get(analysisId) ?? null;
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(keyFor(analysisId));
    return saved ? (JSON.parse(saved) as RaisedClauses) : null;
  } catch {
    return null;
  }
}

export function saveRaised(analysisId: string, clauses: Clause[]) {
  const raised: RaisedClauses = {
    sentAt: new Date().toISOString(),
    clauses: clauses.map((c) => ({ number: c.number, title: c.title })),
  };

  if (isSampleId(analysisId)) {
    sampleRaised.set(analysisId, raised);
    return raised;
  }

  try {
    localStorage.setItem(keyFor(analysisId), JSON.stringify(raised));
  } catch {}
  return raised;
}
