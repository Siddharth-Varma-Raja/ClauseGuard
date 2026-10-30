"""Ask about a whole lease: "what is wrong in this lease?"

POST /api/analyses/{analysis_id}/questions
Answers from the saved ClauseGuard results (rule engine output), explained in plain English by Gemini.
"""
import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from google.genai import types
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.translation_router import get_genai_client
from app.database import get_db
from app.models.document import Document
from app.models.review import DocumentReview
from app.models.user import User
from app.schemas.translation import ClauseQuestionRequest, ClauseQuestionResponse
from app.services.analysis.lease_chat import answer_question

logger = logging.getLogger(__name__)
router = APIRouter()

MODEL_NAME = "gemini-3.8-flash"


async def _ask_gemini(system_instruction: str, turns: list[tuple[str, str]]) -> str:
    contents = [types.Content(role=role, parts=[types.Part.from_text(text=text)]) for role, text in turns]
    client = get_genai_client()
    response = await asyncio.to_thread(
        client.models.generate_content,
        model=MODEL_NAME,
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=system_instruction, temperature=0.2),
    )
    return response.text or ""


@router.post("/analyses/{analysis_id}/questions", response_model=ClauseQuestionResponse, tags=["Analyses"])
async def ask_about_lease(
    analysis_id: str,
    body: ClauseQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClauseQuestionResponse:
    """Answer a question about the whole lease from its saved check results."""
    if not body.question.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question must not be empty.")
    result = await db.execute(
        select(DocumentReview)
        .join(Document, DocumentReview.document_id == Document.id)
        .where(
            DocumentReview.document_id == analysis_id,
            Document.user_id == current_user.id,
            Document.is_deleted == False,  # noqa: E712
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")

    async def ask_model(system_instruction, turns):
        try:
            return await _ask_gemini(system_instruction, turns)
        except Exception as e:  # the answer falls back to the saved results
            logger.error(f"Lease question model error: {e}")
            return ""

    answer = await answer_question(review, body.question, ask_model, body.history)
    return ClauseQuestionResponse(answer=answer)
