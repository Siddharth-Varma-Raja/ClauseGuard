import { auth } from "./firebase";
import type {
  Analysis,
  AnalysisSummary,
  ChatMessage,
  NewTimelineEvent,
  Notice,
  NoticeInput,
  NoticeSummary,
  Preferences,
  TimelineEvent,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError(503, "The backend is not connected.");
  }

  const user = auth.currentUser;
  if (!user) throw new ApiError(401, "Please log in to continue.");

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${await user.getIdToken()}`);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.message ?? body?.detail ?? "Request failed. Please try again.");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await request<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// Leases
export const getAnalyses = () => request<AnalysisSummary[]>("/analyses");
export const getAnalysis = (id: string) => getOrNull<Analysis>(`/analyses/${encodeURIComponent(id)}`);

export function uploadLease(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{ id: string }>("/analyses", { method: "POST", body: form });
}

export function setClauseReviewed(analysisId: string, clauseId: string, reviewed: boolean) {
  return request<void>(`/analyses/${encodeURIComponent(analysisId)}/clauses/${encodeURIComponent(clauseId)}`, {
    method: "PATCH",
    body: JSON.stringify({ reviewed }),
  });
}

export const deleteAllAnalyses = () => request<void>("/analyses", { method: "DELETE" });

export async function askAboutClause(analysisId: string, clauseId: string, question: string, history: ChatMessage[]) {
  const result = await request<{ answer: string }>(
    `/analyses/${encodeURIComponent(analysisId)}/clauses/${encodeURIComponent(clauseId)}/questions`,
    { method: "POST", body: JSON.stringify({ question, history }) }
  );
  return result.answer;
}

// Landlord notices
export const getNotices = () => request<NoticeSummary[]>("/notices");
export const getNotice = (id: string) => getOrNull<Notice>(`/notices/${encodeURIComponent(id)}`);
export const checkNotice = (input: NoticeInput) =>
  request<{ id: string }>("/notices", { method: "POST", body: JSON.stringify(input) });

// Tenancy timeline
export const getEvents = () => request<TimelineEvent[]>("/events");
export const addEvent = (input: NewTimelineEvent) =>
  request<TimelineEvent>("/events", { method: "POST", body: JSON.stringify(input) });
export const setEventDone = (id: string, done: boolean) =>
  request<void>(`/events/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ done }) });
export const deleteEvent = (id: string) => request<void>(`/events/${encodeURIComponent(id)}`, { method: "DELETE" });

// User preferences and account data
export const getPreferences = () => request<Preferences>("/me/preferences");
export const updatePreferences = (changes: Partial<Preferences>) =>
  request<Preferences>("/me/preferences", { method: "PATCH", body: JSON.stringify(changes) });
export const deleteMyData = () => request<void>("/me", { method: "DELETE" });
