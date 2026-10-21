"""
Chat API Endpoint
====================
POST   /api/v1/chat/ask                  — Ask the ClauseGuard AI about a lease
GET    /api/v1/chat/history/{document_id} — Retrieve stored chat history for a document
DELETE /api/v1/chat/history/{document_id} — Clear chat history for a document
"""

import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai
from google.genai import types

from app.config import settings
from app.api.deps import get_current_user
from app.database import get_db
from app.models.chat import ChatMessage, ChatRole
from app.models.document import Document
from app.models.user import User
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatMessageBase,
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
)
from app.services.document.s3 import download_text_from_s3

logger = logging.getLogger(__name__)
router = APIRouter()


def get_genai_client() -> genai.Client:
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured in the backend .env file.",
        )
    return genai.Client(api_key=api_key)


async def retrieve_relevant_context(
    document_id: str,
    user_id: str,
    db: AsyncSession,
) -> str:
    """
    Fetches REDACTED lease text from S3 based on the document_id in the database,
    verifying that the document belongs to the requesting user.
    """
    try:
        result = await db.execute(
            select(Document).where(
                Document.id == document_id,
                Document.user_id == user_id,
                Document.is_deleted == False,  # noqa: E712
            )
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(
                status_code=404,
                detail=f"Document '{document_id}' not found.",
            )
        if doc.s3_key:
            lease_text = download_text_from_s3(doc.s3_key)
            return lease_text
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Could not retrieve lease text from S3 for document {document_id}: {e}")

    return ""


# ── POST /ask ──────────────────────────────────────────────────────────────────


@router.post("/ask", response_model=ChatResponse)
async def ask_clauseguard_bot(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        lease_context = await retrieve_relevant_context(request.document_id, current_user.id, db)

        system_instruction = (
            "You are the ClauseGuard AI Assistant, an expert in Irish tenancy law and lease agreements. "
            "You help tenants understand their leases and RTB (Residential Tenancies Board) rights. "
            "Answer questions based on the provided Lease Context and Irish tenancy law (Residential Tenancies Act). "
            "Cite relevant clauses or provisions from the lease when found. "
            "If a specific term is not in the lease, state what the document says (or omits) and provide the standard Irish RTB legal rule. "
            "Keep answers concise, clear, and helpful in plain English."
        )

        contents = []
        for msg in request.chat_history:
            role = "user" if msg.role == "user" else "model"
            contents.append(
                types.Content(role=role, parts=[types.Part.from_text(text=msg.content)])
            )

        prompt_with_context = (
            f"Lease Context:\n{lease_context if lease_context else '[No document found for this ID]'}\n\n"
            f"Question: {request.user_message}"
        )
        contents.append(
            types.Content(role="user", parts=[types.Part.from_text(text=prompt_with_context)])
        )

        client = get_genai_client()
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ),
        )

        reply_text = response.text

        # ── Persist both the user message and AI reply ─────────────────────────
        db.add(ChatMessage(
            document_id=request.document_id,
            user_id=current_user.id,
            role=ChatRole.USER,
            content=request.user_message,
        ))
        db.add(ChatMessage(
            document_id=request.document_id,
            user_id=current_user.id,
            role=ChatRole.MODEL,
            content=reply_text,
        ))
        await db.commit()

        return ChatResponse(reply=reply_text)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chatbot error: {str(e)}")
        raise HTTPException(status_code=500, detail="The chatbot is currently unavailable.")


# ── GET /history/{document_id} ─────────────────────────────────────────────────


@router.get("/history/{document_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full chat history for a document, ordered chronologically."""
    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.document_id == document_id,
            ChatMessage.user_id == current_user.id,
        )
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()

    return ChatHistoryResponse(
        document_id=document_id,
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
        total=len(messages),
    )


# ── DELETE /history/{document_id} ──────────────────────────────────────────────


@router.delete("/history/{document_id}")
async def clear_chat_history(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear all chat messages for a specific document."""
    result = await db.execute(
        select(ChatMessage).where(
            ChatMessage.document_id == document_id,
            ChatMessage.user_id == current_user.id,
        )
    )
    messages = result.scalars().all()
    for msg in messages:
        await db.delete(msg)
    await db.commit()

    return {"message": f"Cleared {len(messages)} chat messages for document {document_id}."}