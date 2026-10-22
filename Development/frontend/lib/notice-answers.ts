import type { NoticeAnswers, NoticeType } from "./notice-types";

export type BuildResult = { ok: true; answers: NoticeAnswers } | { ok: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function checked(form: FormData, name: string) {
  return form.get(name) === "on";
}

function money(form: FormData, name: string) {
  const value = Number(text(form, name));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function dayStamp(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((dayStamp(toIso) - dayStamp(fromIso)) / DAY_MS);
}

export function wholeMonthsBetween(fromIso: string, toIso: string) {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return Math.max(0, months);
}

function termination(form: FormData): BuildResult {
  const tenancyStart = text(form, "tenancyStart");
  const serviceDate = text(form, "serviceDate");
  const terminationDate = text(form, "terminationDate");
  if (!tenancyStart || !serviceDate || !terminationDate) return { ok: false, error: "Please fill in all three dates." };
  if (daysBetween(tenancyStart, serviceDate) < 0) return { ok: false, error: "The notice date can't be before your tenancy started." };
  if (daysBetween(serviceDate, terminationDate) <= 0) return { ok: false, error: "The end date must be after the date on the notice." };

  return {
    ok: true,
    answers: {
      durationMonths: wholeMonthsBetween(tenancyStart, serviceDate),
      noticeDays: daysBetween(serviceDate, terminationDate),
      isWritten: checked(form, "isWritten"),
      isSigned: checked(form, "isSigned"),
      reason: text(form, "reason") || "other", 
      hasStatutoryDeclaration: checked(form, "hasStatutoryDeclaration"),
      copySentToRtb: checked(form, "copySentToRtb"),
      serviceDate,
      terminationDate,
      tenancyStart,
      mentionsRtbDisputeRights: checked(form, "disputeRights"),
    },
  };
}

function rent(form: FormData): BuildResult {
  const currentRent = money(form, "currentRent");
  const newRent = money(form, "newRent");
  const serviceDate = text(form, "serviceDate");
  const effectiveDate = text(form, "effectiveDate");
  const lastReviewDate = text(form, "lastReviewDate");
  if (currentRent === null || newRent === null) return { ok: false, error: "Enter both rent amounts as numbers above 0." };
  if (!serviceDate || !effectiveDate) return { ok: false, error: "Enter the date on the letter and the date the new rent starts." };
  if (daysBetween(serviceDate, effectiveDate) < 0) return { ok: false, error: "The new rent can't start before the date on the letter." };
  if (lastReviewDate && daysBetween(lastReviewDate, effectiveDate) < 0) {
    return { ok: false, error: "The last rent change must be before the new rent starts." };
  }

  const answers: NoticeAnswers = {
    currentRent,
    newRent,
    noticeDays: daysBetween(serviceDate, effectiveDate),
    inRpz: checked(form, "inRpz"),
    hasThreeComparables: checked(form, "hasThreeComparables"),
    noticeDate: serviceDate,
    effectiveDate,
  };
  if (lastReviewDate) answers.monthsSinceLastReview = wholeMonthsBetween(lastReviewDate, effectiveDate);
  return { ok: true, answers };
}

function entry(form: FormData): BuildResult {
  const toldAt = text(form, "toldAt");
  const visitAt = text(form, "visitAt");
  if (!toldAt || !visitAt) return { ok: false, error: "Enter when you were told and when the visit is." };
  const hours = Math.floor((new Date(visitAt).getTime() - new Date(toldAt).getTime()) / (60 * 60 * 1000));
  if (Number.isNaN(hours)) return { ok: false, error: "Those dates don't look right." };
  if (hours < 0) return { ok: false, error: "The visit can't be before you were told about it." };

  return {
    ok: true,
    answers: {
      hoursNotice: hours,
      isEmergency: checked(form, "isEmergency"),
      entryDate: visitAt,
      toldAt,
      timeAgreedWithTenant: checked(form, "agreedTime"),
    },
  };
}

function other(form: FormData): BuildResult {
  const description = text(form, "description");
  if (!description) return { ok: false, error: "Tell us what the letter says." };
  return { ok: true, answers: { description } };
}

export function buildNoticeAnswers(type: NoticeType, form: FormData): BuildResult {
  if (type === "termination") return termination(form);
  if (type === "rent") return rent(form);
  if (type === "entry") return entry(form);
  return other(form);
}
