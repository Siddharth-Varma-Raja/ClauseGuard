
import io
import logging
from typing import BinaryIO, Union

import pdfplumber

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_input: Union[bytes, BinaryIO]) -> str:
    """
    Extract plain text from a PDF supplied as raw bytes or a binary file-like stream.

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
    stream = io.BytesIO(pdf_input) if isinstance(pdf_input, (bytes, bytearray)) else pdf_input

    with pdfplumber.open(stream) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if text:
                pages_text.append(text)
            else:
                logger.debug("Page %d returned no text — possibly image-only.", page_number)

    if not pages_text:
        raise ValueError("The uploaded PDF contains no extractable text.")

    return "\n".join(pages_text)
