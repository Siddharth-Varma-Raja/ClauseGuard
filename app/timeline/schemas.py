from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, AliasChoices


class EventBase(BaseModel):
    event_type: str = Field(
        ...,
        examples=["TENANCY_STARTED", "RENT_REVIEW_SERVED", "NOTICE_OF_TERMINATION_SERVED"],
    )
    effective_date: date
    payload: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    event_id: UUID
    tenancy_id: UUID
    sequence_number: int
    recorded_at: datetime

    # Public API field stays "metadata", but when building this model from
    # the ORM object (from_attributes=True), Pydantic needs to read the
    # SQLAlchemy column, which is named "event_metadata" to avoid colliding
    # with Base.metadata. Try that attribute name first; fall back to
    # "metadata" so this still works if constructed from a plain dict
    # (e.g. in tests).
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        validation_alias=AliasChoices("event_metadata", "metadata"),
    )


class ActiveRegime(BaseModel):
    regime_name: str
    is_rpz: bool
    minimum_duration_cycle_years: int
    statutory_copy_deadline_days: int


class TenancyStateSnapshot(BaseModel):
    tenancy_id: UUID
    as_of_date: date
    is_active: bool
    tenancy_start_date: Optional[date] = None
    current_rent_amount: Optional[Decimal] = None
    last_rent_review_date: Optional[date] = None
    last_notice_served_date: Optional[date] = None
    last_notice_type: Optional[str] = None
    total_months_active: int = 0
    active_regime: ActiveRegime
    historical_event_count: int


class WhatIfRequest(BaseModel):
    as_of_date: date
    hypothetical_event: EventCreate


class WhatIfResponse(BaseModel):
    projected_state: TenancyStateSnapshot
    applicable_statutory_rules: Dict[str, Any]
    required_notice_period_days: Optional[int] = None
    rtb_copy_deadline: Optional[date] = None
    warnings: List[str] = Field(default_factory=list)