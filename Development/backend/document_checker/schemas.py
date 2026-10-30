from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import date, datetime
from typing import Optional, List, Any

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

class ExtractionResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    status: str
    message: str
    confidence_score: float
    extracted_text: str


class EmailDraftRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    landlord_name: Optional[str] = "[Landlord Name]"
    tenant_name: Optional[str] = "[Your Name]"
    property_address: Optional[str] = "[Property Address]"
    detected_deviations: List[str]

class EmailDraftResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    email_subject: str
    email_body: str

class AnalysisSummary(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    id: str
    display_name: str
    created_at: datetime
    flagged_count: int
    reviewed_count: int

class LeaseRenameRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    display_name: str

class ChatMessage(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    role: str 
    content: str

class ChatRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    question: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    answer: str