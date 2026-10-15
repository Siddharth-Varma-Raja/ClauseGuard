import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class RegisterRequest(BaseModel):
    firebase_uid: str = Field(..., min_length=1, max_length=128)
    email: EmailStr
    display_name: str | None = Field(None, max_length=256)
    role: UserRole = UserRole.TENANT
    gdpr_consent: bool = Field(..., description="User must explicitly accept GDPR terms")


class ProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(None, max_length=256)
    phone_number: str | None = Field(None, max_length=32)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    firebase_uid: str
    email: str
    display_name: str | None
    phone_number: str | None
    role: UserRole
    is_active: bool
    gdpr_consent_at: datetime | None
    created_at: datetime
    updated_at: datetime


class GdprExportResponse(BaseModel):
    user: UserResponse
    exported_at: datetime


class MessageResponse(BaseModel):
    message: str
