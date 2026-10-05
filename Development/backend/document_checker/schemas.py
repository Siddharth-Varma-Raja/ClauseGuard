from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List

class NoticeSubmission(BaseModel):
    tenancy_id: str
    notice_type: str = Field(..., pattern="^(TERMINATION|RENT_REVIEW)$")
    service_date: date
    proposed_effective_date: date
    reason_category: Optional[str] = None # e.g., LANDLORD_SELLING

class DiffRequest(BaseModel):
    user_draft_text: str

class ValidationResponse(BaseModel):
    is_valid: bool
    ocr_confidence: float
    detected_deviations: List[str]