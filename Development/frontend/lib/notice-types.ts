export type Status = "red" | "amber" | "green" | "grey";

export type StatusCounts = Record<Status, number>;

export type Confidence = "high" | "medium" | "low";

export type Source = {
  kind: string;
  title: string;
  url?: string;
  note?: string;
};

export type Clause = {
  id: string;
  number: string;
  title: string;
  text: string;
  page: number;
  status: Status;
  confidence: Confidence;
  explanation: string;
  reason: string;
  nextSteps: string[];
  sources: Source[];
  reviewed: boolean;
};

export type AnalysisSummary = {
  id: string;
  fileName: string;
  createdAt: string;
  propertyAddress: string | null;
  counts: StatusCounts;
};

export type Analysis = AnalysisSummary & {
  monthlyRentCents: number | null;
  depositCents: number | null;
  tenancyStart: string | null;
  termMonths: number | null;
  pageCount: number;
  clauses: Clause[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type NoticeType = "termination" | "rent" | "entry" | "other";

export type NoticeVerdict = "valid" | "attention" | "invalid" | "info";

export type NoticeCheck = {
  status: "pass" | "warn" | "fail" | "info";
  title: string;
  detail: string;
  source?: string;
};

export type NoticeSummary = {
  id: string;
  type: NoticeType;
  verdict: NoticeVerdict;
  summary: string;
  createdAt: string;
};

export type Notice = NoticeSummary & {
  checks: NoticeCheck[];
  keyDates: { label: string; date: string }[];
  nextSteps: string[];
};

export type NoticeInput = {
  type: NoticeType;
  answers: Record<string, string | boolean>;
};

export type EventKind = "event" | "deadline" | "rent";

export type TimelineEvent = {
  id: string;
  title: string;
  date: string;
  kind: EventKind;
  note: string;
  done: boolean;
};

export type NewTimelineEvent = Pick<TimelineEvent, "title" | "date" | "kind" | "note">;

export type Preferences = {
  explanationDetail: "simple" | "detailed";
  remindersEnabled: boolean;
};