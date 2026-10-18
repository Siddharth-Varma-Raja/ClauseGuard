import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types

from app.config import settings

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

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    document_id: str
    user_message: str
    chat_history: list[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str

def retrieve_relevant_context(document_id: str, query: str) -> str:
    """
    Fetches REDACTED lease text and IrishLegalBERT RTB laws.
    """
    redacted_lease_chunks = "..." 
    rtb_legal_chunks = "..."
    return f"Lease Context:\n{redacted_lease_chunks}\n\nLegal Context:\n{rtb_legal_chunks}"

@router.post("/ask", response_model=ChatResponse)
async def ask_clauseguard_bot(request: ChatRequest):
    try:
        
        context = retrieve_relevant_context(request.document_id, request.user_message)
        
        
        system_instruction = (
            "You are the ClauseGuard AI Assistant, having knowledge of Irish tenancy law. "
            "You help tenants understand their leases and RTB notices. "
            "You must base your answers ONLY on the provided Lease Context and Legal Context. "
            "If the context does not contain the answer, say 'I cannot verify that based on the provided document.' "
            "Keep answers concise, in plain English, and do not provide formal legal advice."
        )
        
        contents = []
        for msg in request.chat_history:
            contents.append(
                types.Content(role=msg.role, parts=[types.Part.from_text(text=msg.content)])
            )
            
        # Append the new user message WITH the context injected
        prompt_with_context = f"Context:\n{context}\n\nQuestion: {request.user_message}"
        contents.append(
            types.Content(role="user", parts=[types.Part.from_text(text=prompt_with_context)])
        )

        client = get_genai_client()
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=types.GenerateConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ) if hasattr(types, "GenerateConfig") else types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ),
        )
        
        return ChatResponse(reply=response.text)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chatbot error: {str(e)}")
        raise HTTPException(status_code=500, detail="The chatbot is currently unavailable.")