import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.core.firebase import revoke_refresh_tokens
from app.core.rate_limit import limiter
from app.database import get_db
from app.models.document import Document
from app.models.user import AuditLog, User
from app.schemas.user import GdprExportResponse, MessageResponse, ProfileUpdateRequest, UserResponse
from app.services.document.s3 import delete_from_s3

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/account", tags=["Account"])


@router.get("/me", response_model=UserResponse)
@limiter.limit(settings.rate_limit_api)
async def get_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
@limiter.limit(settings.rate_limit_api)
async def update_profile(
    request: Request,
    body: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    changed_fields: list[str] = []

    if body.display_name is not None:
        current_user.display_name = body.display_name
        changed_fields.append("display_name")

    if body.phone_number is not None:
        current_user.phone_number = body.phone_number
        changed_fields.append("phone_number")

    if changed_fields:
        current_user.updated_at = datetime.now(timezone.utc)
        db.add(
            AuditLog(
                actor_uid=current_user.firebase_uid,
                action="PROFILE_UPDATED",
                resource=f"user:{current_user.firebase_uid}",
                detail=f"fields={','.join(changed_fields)}",
                ip_address=_client_ip(request),
            )
        )
        await db.commit()
        await db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.delete("/me", response_model=MessageResponse)
@limiter.limit(settings.rate_limit_api)
async def delete_account(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    
    docs_result = await db.execute(
        select(Document).where(Document.user_id == current_user.id)
    )
    user_documents = docs_result.scalars().all()
    
    for doc in user_documents:
        if doc.s3_key:
            try:
                delete_from_s3(doc.s3_key)
            except Exception as e:
                logger.error(f"Failed to delete S3 file {doc.s3_key} during account deletion: {e}")
        
        doc.is_deleted = True
        doc.deleted_at = datetime.now(timezone.utc)

    current_user.is_active = False
    current_user.updated_at = datetime.now(timezone.utc)

    revoke_refresh_tokens(current_user.firebase_uid)

    db.add(
        AuditLog(
            actor_uid=current_user.firebase_uid,
            action="ACCOUNT_DEACTIVATED_AND_FILES_PURGED",
            resource=f"user:{current_user.firebase_uid}",
            ip_address=_client_ip(request),
        )
    )

    await db.commit()
    
    return MessageResponse(
        message="Account deactivated and associated files permanently wiped from storage."
    )


@router.get("/me/gdpr-export", response_model=GdprExportResponse)
@limiter.limit(settings.rate_limit_api)
async def gdpr_export(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GdprExportResponse:
    db.add(
        AuditLog(
            actor_uid=current_user.firebase_uid,
            action="GDPR_EXPORT",
            resource=f"user:{current_user.firebase_uid}",
            ip_address=_client_ip(request),
        )
    )
    await db.commit()

    return GdprExportResponse(
        user=UserResponse.model_validate(current_user),
        exported_at=datetime.now(timezone.utc),
    )


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"