"use client";

import { useEffect, useState } from "react";
import { getTopics } from "./api";
import type { Clause } from "./notice-types";

export type Topic = { value: string; label: string };

export const TOPICS: Topic[] = [
  { value: "deposit", label: "Deposit" },
  { value: "notice_period", label: "Notice period" },
  { value: "rent_review", label: "Rent review" },
  { value: "termination", label: "Termination" },
  { value: "repairs", label: "Repairs" },
  { value: "access", label: "Landlord access" },
  { value: "fees", label: "Fees and charges" },
  { value: "waiver", label: "Waiver" },
  { value: "other", label: "General clause" },
];

let loaded: Topic[] | null = null;
let loading: Promise<Topic[]> | null = null;

function loadTopics() {
  if (loaded) return Promise.resolve(loaded);
  loading ??= getTopics()
    .then((list) => {
      const topics = list.filter((t) => t.key && t.title).map((t) => ({ value: t.key, label: t.title }));
      loaded = topics.length ? topics : TOPICS;
      return loaded;
    })
    .catch(() => {
      loading = null;
      return TOPICS;
    });
  return loading;
}

export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>(loaded ?? TOPICS);

  useEffect(() => {
    let live = true;
    loadTopics().then((list) => live && setTopics(list));
    return () => {
      live = false;
    };
  }, []);

  return topics;
}

export function topicLabel(value: string | null | undefined, topics: Topic[] = loaded ?? TOPICS) {
  if (!value) return "";
  const found = topics.find((t) => t.value === value) ?? TOPICS.find((t) => t.value === value);
  return found ? found.label : value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function clauseTopic(clause: Clause) {
  if (clause.topic) return clause.topic;
  return TOPICS.find((t) => t.label.toLowerCase() === clause.title.trim().toLowerCase())?.value ?? null;
}
