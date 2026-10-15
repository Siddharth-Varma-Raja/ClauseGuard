
import io
import logging
from typing import BinaryIO, Union

import pdfplumber
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image

logger = logging.getLogger(__name__)

# ── Supported MIME types ──────────────────────────────────────────────────────

IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
    "image/bmp",
}

PDF_MIME_TYPES = {"application/pdf"}

ALL_SUPPORTED_MIME_TYPES = PDF_MIME_TYPES | IMAGE_MIME_TYPES


# ── Public API ────────────────────────────────────────────────────────────────


def extract_text(
    file_bytes: bytes,
    content_type: str,
) -> str:
    """
    Unified entry point — detects the file type and routes to the
    appropriate extraction method.

    Parameters
    ----------
    file_bytes:
        Raw bytes of the uploaded file.
    content_type:
        MIME type reported by the upload (e.g. ``"application/pdf"``
        or ``"image/jpeg"``).

    Returns
    -------
    str
        Full extracted text.

    Raises
    ------
    ValueError
        If no text could be extracted at all.
    """
    if content_type in PDF_MIME_TYPES:
        return extract_text_from_pdf(file_bytes)
    elif content_type in IMAGE_MIME_TYPES:
        return extract_text_from_image(file_bytes)
    else:
        raise ValueError(f"Unsupported content type: {content_type}")


# ── PDF extraction ────────────────────────────────────────────────────────────


def extract_text_from_pdf(pdf_input: Union[bytes, BinaryIO]) -> str:
    """
    Extract plain text from a PDF supplied as raw bytes or a binary stream.

    Strategy:
        1. Try ``pdfplumber`` first (fast, works for text-based PDFs).
        2. For pages where ``pdfplumber`` returns no text (scanned / image-only),
           fall back to OCR via Tesseract.

    Parameters
    ----------
    pdf_input:
        The binary content or stream of the uploaded PDF file.

    Returns
    -------
    str
        Full extracted text, pages separated by newlines.

    Raises
    ------
    ValueError
        If the PDF contains no extractable text at all.
    """
    pages_text: list[str] = []
    raw_bytes = pdf_input if isinstance(pdf_input, (bytes, bytearray)) else pdf_input.read()
    stream = io.BytesIO(raw_bytes)

    # Track which pages need OCR fallback
    ocr_needed_pages: list[int] = []  # 0-indexed

    with pdfplumber.open(stream) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if text and text.strip():
                pages_text.append(text)
            else:
                logger.info(
                    "Page %d returned no text from pdfplumber — will try OCR.",
                    page_number,
                )
                ocr_needed_pages.append(page_number - 1)  # 0-indexed for pdf2image
                pages_text.append(None)  # placeholder

    # ── OCR fallback for scanned pages ────────────────────────────────────
    if ocr_needed_pages:
        logger.info(
            "Running OCR on %d scanned page(s).", len(ocr_needed_pages)
        )
        try:
            # Convert only the pages that need OCR to images
            all_images = convert_from_bytes(raw_bytes, dpi=300)

            for page_idx in ocr_needed_pages:
                if page_idx < len(all_images):
                    ocr_text = pytesseract.image_to_string(all_images[page_idx])
                    if ocr_text and ocr_text.strip():
                        pages_text[page_idx] = ocr_text.strip()
                        logger.info(
                            "OCR extracted %d chars from page %d.",
                            len(ocr_text.strip()),
                            page_idx + 1,
                        )
                    else:
                        logger.warning(
                            "OCR returned no text for page %d.", page_idx + 1
                        )
        except Exception as exc:
            logger.exception("OCR fallback failed: %s", exc)
            # Don't raise — let the pipeline continue with whatever text we got

    # Remove None placeholders (pages where both pdfplumber and OCR failed)
    pages_text = [t for t in pages_text if t is not None]

    if not pages_text:
        raise ValueError(
            "The uploaded PDF contains no extractable text "
            "(neither text-based nor via OCR)."
        )

    return "\n".join(pages_text)


# ── Image extraction (OCR) ────────────────────────────────────────────────────


def extract_text_from_image(image_input: Union[bytes, BinaryIO]) -> str:
    """
    Extract text from an image file (JPEG, PNG, TIFF, WebP, BMP) using
    Tesseract OCR.

    This is the path used when a user uploads a photo of a lease or uses
    the in-app scanner to capture a document.

    Parameters
    ----------
    image_input:
        The binary content or stream of the uploaded image file.

    Returns
    -------
    str
        Extracted text from the image.

    Raises
    ------
    ValueError
        If OCR could not extract any text from the image.
    """
    stream = (
        io.BytesIO(image_input)
        if isinstance(image_input, (bytes, bytearray))
        else image_input
    )

    try:
        image = Image.open(stream)

        # Convert to RGB if needed (handles RGBA, palette mode, etc.)
        if image.mode not in ("L", "RGB"):
            image = image.convert("RGB")

        text = pytesseract.image_to_string(image)
    except Exception as exc:
        raise ValueError(f"Failed to process image for OCR: {exc}") from exc

    if not text or not text.strip():
        raise ValueError(
            "OCR could not extract any text from the uploaded image. "
            "Please ensure the document is clearly visible and well-lit."
        )

    return text.strip()
