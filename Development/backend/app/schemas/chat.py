"""
Chat Pydantic Schemas
========================
Request / response models for the Chat API endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.chat import ChatRole


class ChatMessageBase(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    document_id: str
    user_message: str
    chat_history: list[ChatMessageBase] = []


class ChatResponse(BaseModel):
    reply: str


class ChatMessageResponse(BaseModel):
    """Single stored chat message."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    user_id: str
    role: ChatRole
    content: str
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    """Full chat history for a document."""
    document_id: str
    messages: list[ChatMessageResponse]
    total: int
