"""
Translation & Frontend Adapter Schemas
========================================
Pydantic V2 schemas configured with camelCase alias generation to
match the frontend TypeScript types in `frontend/lib/types.ts`.
"""

from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelBaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# ── Status and Counts ──────────────────────────────────────────────────────────

StatusType = Literal["red", "amber", "green", "grey"]
ConfidenceType = Literal["high", "medium", "low"]


class StatusCounts(CamelBaseModel):
    red: int = 0
    amber: int = 0
    green: int = 0
    grey: int = 0


# ── Clause & Analysis Schemas ──────────────────────────────────────────────────

class SourceItem(CamelBaseModel):
    kind: str
    title: str
    url: str | None = None
    note: str | None = None


class ClauseItem(CamelBaseModel):
    id: str
    number: str
    title: str
    text: str
    page: int = 1
    status: StatusType
    confidence: ConfidenceType = "high"
    explanation: str
    reason: str
    next_steps: list[str] = Field(default_factory=list)
    sources: list[SourceItem] = Field(default_factory=list)
    reviewed: bool = False


class AnalysisSummary(CamelBaseModel):
    id: str
    file_name: str
    created_at: str
    property_address: str | None = None
    counts: StatusCounts


class AnalysisDetail(AnalysisSummary):
    monthly_rent_cents: int | None = None
    deposit_cents: int | None = None
    tenancy_start: str | None = None
    term_months: int | None = None
    page_count: int = 1
    clauses: list[ClauseItem] = Field(default_factory=list)


class ClauseReviewedRequest(CamelBaseModel):
    reviewed: bool


class ClauseQuestionRequest(CamelBaseModel):
    question: str
    history: list[dict[str, Any]] = Field(default_factory=list)


class ClauseQuestionResponse(CamelBaseModel):
    answer: str


class UploadLeaseResponse(CamelBaseModel):
    id: str
    message: str = "Lease document uploaded and analyzed successfully."
    file_name: str
    file_size_bytes: int
    status: str
    s3_key: str | None = None
    char_count: int | None = None
    counts: StatusCounts | None = None


# ── Notice Schemas ─────────────────────────────────────────────────────────────

NoticeType = Literal["termination", "rent", "entry", "other"]
NoticeVerdict = Literal["valid", "attention", "invalid", "info"]
CheckStatus = Literal["pass", "warn", "fail", "info"]


class NoticeCheckItem(CamelBaseModel):
    status: CheckStatus
    title: str
    detail: str
    source: str | None = None


class NoticeKeyDateItem(CamelBaseModel):
    label: str
    date: str


class NoticeSummaryItem(CamelBaseModel):
    id: str
    type: NoticeType
    verdict: NoticeVerdict
    summary: str
    created_at: str


class NoticeDetail(NoticeSummaryItem):
    checks: list[NoticeCheckItem] = Field(default_factory=list)
    key_dates: list[NoticeKeyDateItem] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)


class NoticeInputRequest(CamelBaseModel):
    type: NoticeType
    answers: dict[str, Any] = Field(default_factory=dict)


class CreateNoticeResponse(CamelBaseModel):
    id: str


# ── Tenancy Timeline Schemas ───────────────────────────────────────────────────

EventKind = Literal["event", "deadline", "rent"]


class TimelineEventItem(CamelBaseModel):
    id: str
    title: str
    date: str
    kind: EventKind
    note: str = ""
    done: bool = False


class NewTimelineEventRequest(CamelBaseModel):
    title: str
    date: str
    kind: EventKind = "event"
    note: str = ""


class TimelineEventUpdateRequest(CamelBaseModel):
    done: bool


# ── User Preferences Schemas ───────────────────────────────────────────────────

ExplanationDetail = Literal["simple", "detailed"]


class PreferencesResponse(CamelBaseModel):
    explanation_detail: ExplanationDetail = "simple"
    reminders_enabled: bool = True


class PreferencesUpdateRequest(CamelBaseModel):
    explanation_detail: ExplanationDetail | None = None
    reminders_enabled: bool | None = None


# ── Account Profile Schemas ───────────────────────────────────────────────────

class UserProfileResponse(CamelBaseModel):
    id: str
    firebase_uid: str
    email: str
    display_name: str | None = None
    phone_number: str | None = None
    role: str
    is_active: bool = True
    created_at: str
