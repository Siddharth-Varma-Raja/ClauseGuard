"""Remaining-time estimates match the timings they were calibrated on."""
import pytest

from app.services.document import estimate as est


def test_ocr_time_grows_in_waves_of_four_chunks():
    assert est.ocr_seconds(0) == 0
    assert est.ocr_seconds(3) == pytest.approx(4.0)     # measured 3.3 s
    assert est.ocr_seconds(31) == pytest.approx(10.0)   # 15/15/1 in parallel; measured 10.4 s
    assert est.ocr_seconds(60) == pytest.approx(10.0)   # 4 chunks still fit in one wave
    assert est.ocr_seconds(61) == pytest.approx(20.0)   # a fifth chunk needs a second wave


def test_text_pdf_estimate_is_in_the_measured_range():
    # 31-page text PDF took 1.6-3.0 s on Cloud Run.
    assert 1.6 <= est.from_extraction_plan(pages=31, ocr_pages=0) <= 3.0


def test_scanned_pages_raise_the_estimate():
    text_only = est.from_extraction_plan(pages=31, ocr_pages=0)
    scanned = est.from_extraction_plan(pages=31, ocr_pages=31)
    assert scanned > text_only + 9


def test_estimates_shrink_as_steps_finish():
    chars = 31 * est.CHARS_PER_PAGE
    assert est.after_extract_seconds(chars) > est.after_redact_seconds() > est.ANALYSE_SECONDS > 0
