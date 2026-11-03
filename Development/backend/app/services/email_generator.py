import json
import logging
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)
client = genai.Client()

def generate_landlord_email(
    deviations: list[str], 
    landlord_name: str = "[Landlord Name]", 
    tenant_name: str = "[Your Name]", 
    address: str = "[Property Address]"
) -> dict:
    """
    Uses Gemini to draft a polite negotiation email to a landlord 
    regarding illegal or unfair clauses under Irish tenancy law.
    """
    issues_list = "\n".join([f"- {issue}" for issue in deviations])
    
    prompt = f"""
    Draft a polite, professional, and collaborative email from a tenant to a landlord negotiating terms in a residential lease agreement for a property in Ireland.
    
    The tenant wants to address the following flagged clauses and issues (which may conflict with Residential Tenancies Board (RTB) regulations):
    {issues_list}
    
    Details:
    - Landlord Name: {landlord_name}
    - Tenant Name: {tenant_name}
    - Property Address: {address}
    
    Tone: Constructive, respectful, firm on legal rights but aiming for a positive landlord-tenant relationship. Do not sound hostile or overly litigious.
    
    Return ONLY a JSON object with two keys:
    - "email_subject": A concise, professional subject line.
    - "email_body": The full text of the email draft, utilizing standard line breaks.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4 # Kept low for consistent, professional tone
            ),
        )
        return json.loads(response.text)
        
    except Exception as e:
        logger.error(f"Failed to generate email draft: {str(e)}")
        return {
            "email_subject": f"Discussion regarding lease agreement for {address}",
            "email_body": f"Dear {landlord_name},\n\nI am writing to discuss the lease agreement for {address}. I would like to review the following points with you:\n\n{issues_list}\n\nI look forward to discussing this further.\n\nBest regards,\n{tenant_name}"
        }