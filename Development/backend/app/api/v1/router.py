from fastapi import APIRouter

from app.api.v1.endpoints.account import router as account_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.dev_token import router as dev_token_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.docreview import router as docreview_router

router = APIRouter(prefix="/v1")
router.include_router(auth_router)
router.include_router(account_router)
router.include_router(documents_router)
router.include_router(dev_token_router)
router.include_router(docreview_router)
