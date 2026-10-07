from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.firebase import verify_id_token
from app.database import get_db
from app.models.user import User

_bearer = HTTPBearer()


async def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        decoded = verify_id_token(creds.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase ID token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    firebase_uid: str = decoded["uid"]

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    request.state.current_user = user
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    from app.models.user import UserRole

    if user.role is not UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user
