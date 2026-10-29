from fastapi import APIRouter, UploadFile, HTTPException, Request
import httpx
from app.core.rate_limit import limiter

from .schemas import NoticeSubmission, DiffRequest, ValidationResponse, ExtractionResponse

from app.services.document.extractor import extract_text 
from .diff_engine import TemplateDiffEngine

router = APIRouter(prefix="/notices", tags=["Notice Checker"])
diff_engine = TemplateDiffEngine()

RULES_ENGINE_URL = "http://rules_engine_service/evaluate"
TIMELINE_STORE_URL = "http://timeline_service/tenancies"

@router.post("/extract-notice", response_model=ExtractionResponse)
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

@router.post("/validate-and-commit")
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