from fastapi import APIRouter, UploadFile, HTTPException, Request, Depends, Response, status
import httpx
from app.core.rate_limit import limiter
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.database_models import LeaseAnalysis, Clause, User

from app.services.document.extractor import extract_text 
from .diff_engine import TemplateDiffEngine

from app.services.email_generator import generate_landlord_email
from app.services.rag_engine import query_lease_context 

from .schemas import (
    NoticeSubmission, 
    DiffRequest, 
    ValidationResponse, 
    ExtractionResponse,
    EmailDraftRequest,
    EmailDraftResponse,
    AnalysisSummary,
    LeaseRenameRequest,
    ChatRequest,
    ChatResponse
)

# --- ROUTERS ---
notices_router = APIRouter(prefix="/notices", tags=["Notice Checker"])
analyses_router = APIRouter(prefix="/analyses", tags=["Analyses Dashboard"])

diff_engine = TemplateDiffEngine()

RULES_ENGINE_URL = "http://rules_engine_service/evaluate"
TIMELINE_STORE_URL = "http://timeline_service/tenancies"

# ==========================================
# NOTICES ENDPOINTS
# ==========================================

@notices_router.post("/extract-notice", response_model=ExtractionResponse)
@limiter.limit("5/minute")
async def process_scanned_notice(request: Request, file: UploadFile):
    """
    Handles the raw unstructured lease/notice upload.
    Extracts text using GCP Document AI and verifies document type.
    """
    content = await file.read()
    
    try:
        raw_text = extract_text(content, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail={"message": f"Extraction failed: {str(e)}"})

    is_valid_lease, confidence, matched_keywords = diff_engine.is_lease(raw_text)
    
    if not is_valid_lease:
        raise HTTPException(
            status_code=400, 
            detail={
                "message": "The uploaded document does not appear to be a residential lease agreement. Please check the file and try again.",
                "confidence_score": confidence,
                "found_keywords": matched_keywords
            }
        )

    return ExtractionResponse(
        status="success",
        message="Lease verified successfully.",
        confidence_score=confidence,
        extracted_text=raw_text
    )

@notices_router.post("/validate-and-commit")
@limiter.limit("5/minute")
async def validate_notice(request: Request, submission: NoticeSubmission):
    async with httpx.AsyncClient() as client:
        rules_payload = {
            "notice_type": submission.notice_type,
            "service_date": submission.service_date.isoformat(),
            "proposed_date": submission.proposed_effective_date.isoformat()
        }
        rules_response = await client.post(RULES_ENGINE_URL, json=rules_payload)
        
        if rules_response.status_code != 200 or not rules_response.json().get("is_compliant"):
            raise HTTPException(status_code=400, detail={"message": "Notice violates statutory rules."})

    async with httpx.AsyncClient() as client:
        event_payload = {
            "event_type": f"{submission.notice_type}_SERVED",
            "effective_date": submission.service_date.isoformat(),
            "payload": submission.model_dump(mode='json') 
        }
        commit_response = await client.post(
            f"{TIMELINE_STORE_URL}/{submission.tenancy_id}/events", 
            json=event_payload
        )
        
        if commit_response.status_code != 201:
            raise HTTPException(status_code=500, detail={"message": "Failed to append to timeline."})

    return {"message": "Notice legally validated and appended to timeline."}

@notices_router.post("/generate-landlord-email", response_model=EmailDraftResponse)
@limiter.limit("5/minute")
async def draft_landlord_email(request: Request, submission: EmailDraftRequest):
    """Generates a polite negotiation email based on found lease flaws."""
    if not submission.detected_deviations:
        raise HTTPException(status_code=400, detail="No deviations provided to discuss.")
        
    try:
        draft_json = generate_landlord_email(
            deviations=submission.detected_deviations,
            landlord_name=submission.landlord_name,
            tenant_name=submission.tenant_name,
            address=submission.property_address
        )
        return draft_json
    except Exception as e:
        raise HTTPException(status_code=500, detail={"message": f"Failed to generate draft: {str(e)}"})

# ==========================================
# ANALYSES DASHBOARD ENDPOINTS
# ==========================================

@analyses_router.get("", response_model=List[AnalysisSummary])
async def get_analyses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns the newest leases first, grouping clause statuses."""
    query = (
        select(
            LeaseAnalysis.id,
            LeaseAnalysis.display_name,
            LeaseAnalysis.created_at,
            func.count(Clause.id).filter(Clause.status.in_(['RED', 'AMBER'])).label('flagged_count'),
            func.count(Clause.id).filter(Clause.is_reviewed == True).label('reviewed_count')
        )
        .outerjoin(Clause, LeaseAnalysis.id == Clause.analysis_id)
        .where(LeaseAnalysis.user_id == current_user.id)
        .group_by(LeaseAnalysis.id, LeaseAnalysis.display_name, LeaseAnalysis.created_at)
        .order_by(desc(LeaseAnalysis.created_at)) 
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        AnalysisSummary(
            id=str(row.id),
            display_name=row.display_name,
            created_at=row.created_at,
            flagged_count=row.flagged_count,
            reviewed_count=row.reviewed_count
        ) for row in rows
    ]

@analyses_router.patch("/{analysis_id}", response_model=AnalysisSummary)
async def rename_lease(
    analysis_id: str, 
    request: LeaseRenameRequest, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates the display name of a specific lease analysis."""
    query = select(LeaseAnalysis).where(
        LeaseAnalysis.id == analysis_id, 
        LeaseAnalysis.user_id == current_user.id
    )
    result = await db.execute(query)
    lease = result.scalar_one_or_none()
    
    if not lease:
        raise HTTPException(status_code=404, detail="Lease analysis not found")
        
    lease.display_name = request.display_name
    await db.commit()
    await db.refresh(lease)
    
    return AnalysisSummary(
        id=str(lease.id),
        display_name=lease.display_name,
        created_at=lease.created_at,
        flagged_count=0,
        reviewed_count=0
    )

@analyses_router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lease(
    analysis_id: str, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a specific lease and cascades to clauses/questions."""
    query = select(LeaseAnalysis).where(
        LeaseAnalysis.id == analysis_id, 
        LeaseAnalysis.user_id == current_user.id
    )
    result = await db.execute(query)
    lease = result.scalar_one_or_none()
    
    if not lease:
        raise HTTPException(status_code=404, detail="Lease analysis not found")
        
    await db.delete(lease)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@analyses_router.post("/{analysis_id}/questions", response_model=ChatResponse)
async def ask_general_question(
    analysis_id: str, 
    request: ChatRequest, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Handles general chat queries against the specific lease document."""
    query = select(LeaseAnalysis).where(
        LeaseAnalysis.id == analysis_id, 
        LeaseAnalysis.user_id == current_user.id
    )
    result = await db.execute(query)
    lease = result.scalar_one_or_none()
    
    if not lease:
        raise HTTPException(status_code=404, detail="Lease analysis not found")

    try:
        answer = await query_lease_context(
            analysis_id=analysis_id,
            question=request.question,
            history=[msg.model_dump() for msg in request.history]
        )
        return ChatResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")