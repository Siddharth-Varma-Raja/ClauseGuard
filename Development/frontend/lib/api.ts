import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import type {
  NoticeInput,
  NoticeSummary,
  Preferences,
  TimelineEvent,
  Analysis,
  AnalysisSummary,
  ChatMessage,
  Clause,
  GdprExport,
  LandlordEmailDraft,
  NewTimelineEvent,
  Notice,
  UploadLeaseResponse,
  UserProfile,
} from "./notice-types";
import { SAMPLE_ANSWER, SAMPLE_UPDATED_ID, getSampleLease, isSampleId, sampleLandlordEmail } from "./sample-lease";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const API_ORIGIN = API_URL?.replace(/\/api$/, "");

const DEFAULT_TIMEOUT_MS = 90_000;
const UPLOAD_TIMEOUT_MS = 180_000;

export const LEASE_MAX_BYTES = 25 * 1024 * 1024;
export const LEASE_ACCEPT =
  ".pdf,.docx,.png,.jpg,.jpeg,.webp,.tif,.tiff,.bmp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/tiff,image/bmp";
const LEASE_EXTENSIONS = ["pdf", "docx", "png", "jpg", "jpeg", "webp", "tif", "tiff", "bmp"];

export function isAllowedLeaseFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return LEASE_EXTENSIONS.includes(extension);
}

const PROFILE_MISSING = "User profile not found.";
const ACCOUNT_DEACTIVATED = "Account is deactivated.";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  return error instanceof Error && error.message ? error.message : fallback;
}

type RequestOptions = RequestInit & {
  auth?: boolean;
  timeoutMs?: number;
};

async function send<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError(503, "The backend is not connected. Set NEXT_PUBLIC_API_URL in .env.local.");
  }

  const { auth: needsAuth = true, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  const headers = new Headers(init.headers);

  if (needsAuth) {
    const user = auth.currentUser;
    if (!user) throw new ApiError(401, "Please log in to continue.");
    headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  }
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError(408, "The server took too long to respond. Please try again.");
    }
    throw new ApiError(0, "We couldn't reach the ClauseGuard server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (typeof body?.message === "string" && body.message) ||
      (typeof body?.detail === "string" && body.detail) ||
      `Request failed (${response.status}). Please try again.`;
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await send<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.message === PROFILE_MISSING) {
      await ensureProfile();
      return send<T>(path, options);
    }
    if (error instanceof ApiError && error.status === 403 && error.message === ACCOUNT_DEACTIVATED) {
      await signOut(auth);
    }
    throw error;
  }
}

async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await request<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

const id = encodeURIComponent;

export function wakeBackend() {
  if (!API_ORIGIN) return;
  fetch(`${API_ORIGIN}/health`).catch(() => undefined);
}

if (typeof window !== "undefined") wakeBackend();

let profilePromise: Promise<void> | null = null;

export function ensureProfile(displayName?: string | null): Promise<void> {
  if (profilePromise) return profilePromise;

  profilePromise = (async () => {
    const user = auth.currentUser;
    if (!user) throw new ApiError(401, "Please log in to continue.");
    try {
      await send("/auth/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          firebase_uid: user.uid,
          email: user.email,
          display_name: displayName ?? user.displayName ?? null,
          gdpr_consent: true,
        }),
      });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 409)) throw error;
    }
  })().finally(() => {
    profilePromise = null;
  });

  return profilePromise;
}

export const getProfile = () => request<UserProfile>("/me");

export const getAnalyses = () => request<AnalysisSummary[]>("/analyses");

export const getAnalysis = (analysisId: string) =>
  isSampleId(analysisId) ? Promise.resolve(getSampleLease(analysisId)) : getOrNull<Analysis>(`/analyses/${id(analysisId)}`);

/**
 * Upload a lease document. Runs extraction, redaction, and analysis,
 * returning the completed analysis summary.
 */
export async function uploadLease(file: File): Promise<UploadLeaseResponse> {
  const form = new FormData();
  form.append("file", file);
  return request<UploadLeaseResponse>("/analyses", {
    method: "POST",
    body: form,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
}

export function uploadLeaseVersion(analysisId: string, file: File | null) {
  if (isSampleId(analysisId)) return Promise.resolve({ id: SAMPLE_UPDATED_ID });
  const form = new FormData();
  if (file) form.append("file", file);
  return request<UploadLeaseResponse>(`/analyses/${id(analysisId)}/versions`, { method: "POST", body: form, timeoutMs: UPLOAD_TIMEOUT_MS });
}

export async function generateLandlordEmail(analysisId: string, clauses: Clause[]): Promise<LandlordEmailDraft> {
  if (isSampleId(analysisId)) return sampleLandlordEmail(clauses);

  const result = await request<{ emailSubject?: string; emailBody?: string; email_subject?: string; email_body?: string }>(
    "/notices/generate-landlord-email",
    {
      method: "POST",
      body: JSON.stringify({
        detected_deviations: clauses.map((c) => `Clause ${c.number} (${c.title}): ${c.reason || c.explanation}`),
      }),
    },
  );

  return {
    subject: result.emailSubject ?? result.email_subject ?? "",
    body: result.emailBody ?? result.email_body ?? "",
  };
}

export function setClauseReviewed(analysisId: string, clauseId: string, reviewed: boolean) {
  if (isSampleId(analysisId)) return Promise.resolve();
  return request<void>(`/analyses/${id(analysisId)}/clauses/${id(clauseId)}`, {
    method: "PATCH",
    body: JSON.stringify({ reviewed }),
  });
}

export const deleteAllAnalyses = () => request<void>("/analyses", { method: "DELETE" });

export async function askAboutClause(analysisId: string, clauseId: string, question: string, history: ChatMessage[]) {
  if (isSampleId(analysisId)) return SAMPLE_ANSWER;
  const result = await request<{ answer: string }>(
    `/analyses/${id(analysisId)}/clauses/${id(clauseId)}/questions`,
    { method: "POST", body: JSON.stringify({ question, history }) },
  );
  return result.answer;
}

export async function askAboutLease(analysisId: string, question: string, history: ChatMessage[]) {
  if (isSampleId(analysisId)) return SAMPLE_ANSWER;
  const result = await request<{ answer: string }>(`/analyses/${id(analysisId)}/questions`, {
    method: "POST",
    body: JSON.stringify({ question, history }),
  });
  return result.answer;
}

export const getNotices = () => request<NoticeSummary[]>("/notices");
export const getNotice = (noticeId: string) => getOrNull<Notice>(`/notices/${id(noticeId)}`);
export const checkNotice = (input: NoticeInput) =>
  request<{ id: string }>("/notices", { method: "POST", body: JSON.stringify(input) });

export const getEvents = () => request<TimelineEvent[]>("/events");
export const addEvent = (input: NewTimelineEvent) =>
  request<TimelineEvent>("/events", { method: "POST", body: JSON.stringify(input) });
export const setEventDone = (eventId: string, done: boolean) =>
  request<void>(`/events/${id(eventId)}`, { method: "PATCH", body: JSON.stringify({ done }) });
export const deleteEvent = (eventId: string) => request<void>(`/events/${id(eventId)}`, { method: "DELETE" });

export async function updateEvent(original: TimelineEvent, changes: NewTimelineEvent) {
  const saved = await addEvent(changes);
  try {
    await deleteEvent(original.id);
  } catch (err) {
    await deleteEvent(saved.id).catch(() => undefined);
    throw err;
  }
  if (original.done) {
    await setEventDone(saved.id, true).catch(() => undefined);
    return { ...saved, done: true };
  }
  return saved;
}

export const getPreferences = () => request<Preferences>("/me/preferences");
export const updatePreferences = (changes: Partial<Preferences>) =>
  request<Preferences>("/me/preferences", { method: "PATCH", body: JSON.stringify(changes) });
export const exportMyData = () => request<GdprExport>("/me/gdpr-export");
export const deleteMyAccount = () => request<void>("/me", { method: "DELETE" });
export const deleteMyData = deleteMyAccount;