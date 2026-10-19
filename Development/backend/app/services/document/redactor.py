import re
import logging
import spacy

logger = logging.getLogger(__name__)

try:
    nlp = spacy.load("en_core_web_lg")
except OSError:
    try:
        nlp = spacy.load("en_core_web_sm")
        logger.info("Using fallback spaCy model 'en_core_web_sm'")
    except OSError:
        logger.error("No spaCy model found. Please run: python -m spacy download en_core_web_sm")
        nlp = None

class RedactionError(Exception):
    pass

def _regex_redact(text: str) -> str:
    """Redacts structured PII using regex patterns specific to the Irish context."""
    
    
    iban_pattern = r'\bIE\d{2}\s?[A-Z]{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b|\bIE\d{20}\b'
    text = re.sub(iban_pattern, '[REDACTED_IBAN]', text)

    
    pps_pattern = r'\b\d{7}[A-Za-z]{1,2}\b'
    text = re.sub(pps_pattern, '[REDACTED_PPS]', text)
    
   
    phone_pattern = r'\b(?:\+353|0)(?:\s|-|\.)?\d{1,2}(?:\s|-|\.)?\d{3}(?:\s|-|\.)?\d{4}\b'
    text = re.sub(phone_pattern, '[REDACTED_PHONE]', text)
    
    
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    text = re.sub(email_pattern, '[REDACTED_EMAIL]', text)
    

    eircode_pattern = r'\b(?:[AC-FHKNPRTV-Y][0-9]{2}|D6W)[ -]?[0-9AC-FHKNPRTV-Y]{4}\b'
    dublin_zone_pattern = r'\bDublin\s\d{1,2}\b'
    text = re.sub(eircode_pattern, '[REDACTED_ADDRESS]', text)
    text = re.sub(dublin_zone_pattern, '[REDACTED_ADDRESS]', text, flags=re.IGNORECASE)
    
    
    irish_passport_pattern = r'\b[A-Z]{2}\d{7}\b'
    text = re.sub(irish_passport_pattern, '[REDACTED_PASSPORT]', text)
    
    international_passport_pattern = r'\b(?=.*[0-9])[A-Z0-9]{6,9}\b'
    text = re.sub(international_passport_pattern, '[REDACTED_PASSPORT]', text, flags=re.IGNORECASE)
    
    return text

def _ner_redact(text: str) -> str:
    """Redacts unstructured PII (Names, Addresses) using spaCy NER."""
    if nlp is None:
        raise RedactionError("NER model not loaded.")
        
    doc = nlp(text)
    redacted_text = text
    
    for ent in reversed(doc.ents):
        if ent.label_ == "PERSON":
            redacted_text = redacted_text[:ent.start_char] + '[REDACTED_NAME]' + redacted_text[ent.end_char:]
        elif ent.label_ in ["GPE", "LOC", "FAC"]:
            redacted_text = redacted_text[:ent.start_char] + '[REDACTED_ADDRESS]' + redacted_text[ent.end_char:]
            
    return redacted_text

def redact(raw_text: str) -> str:
    if not isinstance(raw_text, str):
        raise RedactionError("Input to redact() must be a string.")
    try:
        text_regex_redacted = _regex_redact(raw_text)
        final_text = _ner_redact(text_regex_redacted)
        return final_text
    except Exception as e:
        logger.exception("An unexpected error occurred during redaction.")
        raise RedactionError(f"Redaction failed: {str(e)}") from e