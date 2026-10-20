from fastapi import APIRouter

from app.api.v1.endpoints.account import router as account_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.documents import router as documents_router

router = APIRouter()

router.include_router(auth_router)

router.include_router(account_router, prefix="/me")

router.include_router(documents_router, prefix="/analyses")
