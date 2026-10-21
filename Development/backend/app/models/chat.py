"""
Chat Message Model
====================
Stores conversation history between users and the ClauseGuard AI chatbot.
Each message is associated with a specific document.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ChatRole(str, enum.Enum):
    USER = "user"
    MODEL = "model"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    # ── Primary key ────────────────────────────────────────────────────────────
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # ── Foreign keys ───────────────────────────────────────────────────────────
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # ── Message content ────────────────────────────────────────────────────────
    role: Mapped[ChatRole] = mapped_column(
        Enum(ChatRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # ── Table-level indexes ────────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_chat_messages_document_id", "document_id"),
        Index("ix_chat_messages_user_id", "user_id"),
        Index("ix_chat_messages_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<ChatMessage id={self.id!r} role={self.role.value!r} doc={self.document_id!r}>"
