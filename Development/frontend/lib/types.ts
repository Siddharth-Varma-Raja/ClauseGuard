export type Status = "red" | "amber" | "green" | "grey";

export type Source = {
  title: string;
  url: string;
  type?: string;
  description?: string
};

export type Clause = {
  id: string;
  number: string;
  title: string;
  text: string;
  page: number;
  status: Status;
  explanation: string;
  whyItMatters: string;
  nextSteps: string[];
  sources: Source[];
};

export type LeaseAnalysis = {
  id: string;
  fileName: string;
  pageCount: number;
  clauses: Clause[];
};

export type AnalysisResponse =
  | { status: "processing"; step: number; steps: string[] }
  | { status: "done"; analysis: LeaseAnalysis }
  | { status: "failed"; error: string };


export type EventKind = "event" | "deadline" | "rent";
export type EventSource = "user" | "lease" | "notice"; 

export type TimelineEvent = {
  id: string;
  title: string;
  date: string;
  kind: EventKind;
  note: string;
  done: boolean;
  source: EventSource;
};

export type NewTimelineEvent = {
  title: string;
  date: string;
  kind: EventKind;
  note: string;
};

export type TimelineResponse = {
  events: TimelineEvent[]; 
  rent: { amount: number; from: string } | null;
};