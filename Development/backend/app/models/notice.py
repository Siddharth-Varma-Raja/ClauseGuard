import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class NoticeTypeEnum(str, enum.Enum):
    TERMINATION = "termination"
    RENT = "rent"
    ENTRY = "entry"
    OTHER = "other"


class NoticeVerdictEnum(str, enum.Enum):
    VALID = "valid"
    ATTENTION = "attention"
    INVALID = "invalid"
    INFO = "info"


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    notice_type: Mapped[str] = mapped_column(String(32), nullable=False)
    verdict: Mapped[str] = mapped_column(String(32), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    checks_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    key_dates_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    next_steps_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    answers_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", lazy="selectin")

    __table_args__ = (
        Index("ix_notices_user_id", "user_id"),
        Index("ix_notices_created_at", "created_at"),
    )
