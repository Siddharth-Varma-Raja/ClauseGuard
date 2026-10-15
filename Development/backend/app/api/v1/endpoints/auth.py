from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.core.firebase import get_firebase_user, revoke_refresh_tokens, send_password_reset_email
from app.core.rate_limit import limiter
from app.database import get_db
from app.models.user import AuditLog, User
from app.schemas.user import MessageResponse, RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.rate_limit_auth)
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    if not body.gdpr_consent:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="GDPR consent is required to create an account.",
        )

    result = await db.execute(select(User).where(User.firebase_uid == body.firebase_uid))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already registered.")

    try:
        get_firebase_user(body.firebase_uid)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase UID does not exist. Complete Firebase signup first.",
        )

    user = User(
        firebase_uid=body.firebase_uid,
        email=body.email,
        display_name=body.display_name,
        role=body.role,
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)

    db.add(
        AuditLog(
            actor_uid=body.firebase_uid,
            action="REGISTER",
            resource=f"user:{body.firebase_uid}",
            ip_address=_client_ip(request),
        )
    )

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/logout", response_model=MessageResponse)
@limiter.limit(settings.rate_limit_auth)
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    revoke_refresh_tokens(current_user.firebase_uid)

    db.add(
        AuditLog(
            actor_uid=current_user.firebase_uid,
            action="LOGOUT",
            resource=f"user:{current_user.firebase_uid}",
            ip_address=_client_ip(request),
        )
    )
    await db.commit()
    return MessageResponse(message="Session revoked. Please sign in again.")


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit(settings.rate_limit_auth)
async def forgot_password(
    request: Request,
    email: str,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    result = await db.execute(select(User).where(User.email == email))
    user: User | None = result.scalar_one_or_none()

    if user:
        try:
            link = send_password_reset_email(email)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to generate reset link. Try again later.",
            )

        db.add(
            AuditLog(
                actor_uid=user.firebase_uid,
                action="PASSWORD_RESET_REQUESTED",
                resource=f"user:{user.firebase_uid}",
                ip_address=_client_ip(request),
            )
        )
        await db.commit()

    return MessageResponse(
        message="If an account with that email exists, a reset link has been sent."
    )


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
