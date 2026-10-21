from fastapi import APIRouter

from app.api.v1.endpoints.account import router as account_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.chat import router as chat_router
from app.api.v1.endpoints.docreview import router as docreview_router
from app.api.v1.endpoints.documents import router as documents_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(account_router)
router.include_router(documents_router, prefix="/documents")
router.include_router(docreview_router)
router.include_router(chat_router, prefix="/chat", tags=["Chat"])
