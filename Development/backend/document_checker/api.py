from fastapi import APIRouter, UploadFile, HTTPException
import httpx
from .schemas import NoticeSubmission, DiffRequest
from .ocr_service import OCRExtractor
from .diff_engine import TemplateDiffEngine

router = APIRouter(prefix="/document-checker", tags=["Notice Checker"])
ocr = OCRExtractor()
diff_engine = TemplateDiffEngine()

RULES_ENGINE_URL = "http://rules_engine_service/evaluate"
TIMELINE_STORE_URL = "http://timeline_service/tenancies"

@router.post("/extract-notice")
async def process_scanned_notice(file: UploadFile):
    """Handles the raw unstructured lease/notice upload."""
    content = await file.read()
    extraction = ocr.extract_dates_from_pdf(content)
    return {"status": "success", "data": extraction}

@router.post("/validate-and-commit")
async def validate_notice(submission: NoticeSubmission):
    async with httpx.AsyncClient() as client:
        rules_payload = {
            "notice_type": submission.notice_type,
            "service_date": submission.service_date.isoformat(),
            "proposed_date": submission.proposed_effective_date.isoformat()
        }
        rules_response = await client.post(RULES_ENGINE_URL, json=rules_payload)
        
        if rules_response.status_code != 200 or not rules_response.json().get("is_compliant"):
            raise HTTPException(status_code=400, detail="Notice violates statutory rules.")

    async with httpx.AsyncClient() as client:
        event_payload = {
            "event_type": f"{submission.notice_type}_SERVED",
            "effective_date": submission.service_date.isoformat(),
            "payload": submission.dict()
        }
        commit_response = await client.post(
            f"{TIMELINE_STORE_URL}/{submission.tenancy_id}/events", 
            json=event_payload
        )
        
        if commit_response.status_code != 201:
            raise HTTPException(status_code=500, detail="Failed to append to timeline.")

    return {"status": "Notice legally validated and appended to timeline."}