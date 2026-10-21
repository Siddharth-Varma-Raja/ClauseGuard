from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import date
from typing import Optional, List

class NoticeSubmission(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    tenancy_id: str
    notice_type: str = Field(..., pattern="^(TERMINATION|RENT_REVIEW|ENTRY)$")
    service_date: date
    proposed_effective_date: date
    reason_category: Optional[str] = None 

class DiffRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    user_draft_text: str

class ValidationResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    is_valid: bool
    ocr_confidence: float
    detected_deviations: List[str]