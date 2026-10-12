"""
PII / Clause Redaction Service  ← TEAMMATE'S IMPLEMENTATION GOES HERE
=======================================================================
This module is the single integration point for the redaction feature.

CONTRACT
--------
The pipeline calls exactly one public function:

    redact(raw_text: str) -> str

It must:
  • Accept the full extracted text from a PDF.
  • Return a redacted version of that text (sensitive PII / clauses
    replaced, masked, or removed).
  • Be *pure* — no side-effects, no I/O; just text in → text out.
  • Raise ``RedactionError`` on unrecoverable failure so the pipeline
    can surface a meaningful HTTP error instead of a raw traceback.

TEAMMATE INSTRUCTIONS
---------------------
1. Implement your logic inside `redact()`.
2. If you need helpers or sub-modules, add them inside
   ``app/services/document/`` and import them here.
3. Do NOT change the function signature — the pipeline depends on it.
4. If redaction is async, convert this module to async and update the
   ``await`` call in ``pipeline.py`` accordingly.
"""

import logging

logger = logging.getLogger(__name__)


class RedactionError(Exception):
    """Raised when redaction cannot be completed."""


def redact(raw_text: str) -> str:
    """
    Redact sensitive information from extracted PDF text.

    Parameters
    ----------
    raw_text:
        Plain text extracted from the original PDF.

    Returns
    -------
    str
        The redacted text, ready for storage in S3.

    Raises
    ------
    RedactionError
        If redaction fails for any reason.

    Notes
    -----
    *** THIS IS A STUB — implement the body below. ***
    The current implementation is a transparent pass-through so that
    the rest of the pipeline can be developed and tested independently.
    """
    # ------------------------------------------------------------------ #
    #  TODO (redaction teammate): replace the line below with your logic  #
    # ------------------------------------------------------------------ #
    logger.warning(
        "redact() is a stub — no redaction has been applied. "
        "Implement app/services/document/redactor.py before shipping."
    )
    redacted_text = raw_text  # ← replace this

    return redacted_text
