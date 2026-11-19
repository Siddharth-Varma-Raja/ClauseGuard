"""
Tests for the PDF extraction flow (app/services/document/extractor.py).

Document AI is mocked: every OCR request returns "OCR <marker>" per page, so the
tests can check which pages were sent to OCR, in which chunks, and that the
text comes back on the right page. PDFs are built in memory, no files needed.
"""
import io
import re

import pypdf
import pytest
from google.api_core import exceptions as gexc
from google.cloud import documentai
from PIL import Image, ImageDraw
from pypdf.annotations import FreeText

from app.services.analysis.demo import analyse_text
from app.services.document import extractor as ex

LEASE_LINES = [
    "1.{n} The Tenant shall pay the monthly rent of EUR 1500 on the first day of each month.",
    "1.{n} The Landlord shall register the tenancy with the Residential Tenancies Board.",
    "1.{n} The Tenant shall keep the interior of the dwelling in good repair, fair wear and tear excepted.",
]


# ── PDF builders ──────────────────────────────────────────────────────────────

def _esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def text_pdf(pages: list[list[str]]) -> bytes:
    """A minimal PDF whose pages carry a real text layer (Helvetica, one line each)."""
    objs = ["<< /Type /Catalog /Pages 2 0 R >>", None, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    kids = []
    for lines in pages:
        stream = "BT /F1 10 Tf 12 TL 40 800 Td " + " ".join(f"({_esc(l)}) Tj T*" for l in lines) + " ET"
        objs.append(f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream")
        content_no = len(objs)
        objs.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
                    f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_no} 0 R >>")
        kids.append(f"{len(objs)} 0 R")
    objs[1] = f"<< /Type /Pages /Kids [{' '.join(kids)}] /Count {len(kids)} >>"
    out, offsets = io.BytesIO(), []
    out.write(b"%PDF-1.4\n")
    for i, body in enumerate(objs, start=1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n{body}\nendobj\n".encode("latin-1"))
    xref = out.tell()
    out.write(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode())
    for off in offsets:
        out.write(f"{off:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return out.getvalue()


def lease_page(n: int, lines: int = 30) -> list[str]:
    return [f"SECTION {n}. TERMS OF THE TENANCY"] + [LEASE_LINES[i % 3].format(n=i + 1) for i in range(lines)]


def scanned_pdf(markers: list[str]) -> bytes:
    """Image-only pages (no text layer), each showing its marker."""
    imgs = []
    for m in markers:
        img = Image.new("RGB", (400, 500), "white")
        ImageDraw.Draw(img).text((20, 20), m, fill="black")
        imgs.append(img)
    buf = io.BytesIO()
    imgs[0].save(buf, format="PDF", save_all=True, append_images=imgs[1:])
    return buf.getvalue()


def merge(*parts: tuple[bytes, list[int]]) -> bytes:
    w = pypdf.PdfWriter()
    for data, idx in parts:
        r = pypdf.PdfReader(io.BytesIO(data))
        for i in idx:
            w.add_page(r.pages[i])
    buf = io.BytesIO()
    w.write(buf)
    return buf.getvalue()


# ── Fake Document AI ──────────────────────────────────────────────────────────

class FakeOCR:
    """Stands in for _process_online; records chunk sizes."""

    def __init__(self, empty: bool = False):
        self.calls: list[int] = []
        self.empty = empty

    def __call__(self, content: bytes, mime_type: str) -> documentai.Document:
        reader = pypdf.PdfReader(io.BytesIO(content))
        self.calls.append(len(reader.pages))
        text, pages = "", []
        for i, _ in enumerate(reader.pages):
            page_text = "" if self.empty else f"OCR page {len(self.calls)}-{i} of chunk\n"
            start = len(text)
            text += page_text
            pages.append(documentai.Document.Page(layout=documentai.Document.Page.Layout(
                text_anchor=documentai.Document.TextAnchor(text_segments=[
                    documentai.Document.TextAnchor.TextSegment(start_index=start, end_index=len(text))
                ]))))
        return documentai.Document(text=text, pages=pages)


@pytest.fixture
def ocr(monkeypatch):
    fake = FakeOCR()
    monkeypatch.setattr(ex, "_process_online", fake)
    return fake


def pages_of(text: str) -> list[str]:
    return text.split("\f")


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_text_pdf_never_calls_ocr(ocr):
    pdf = text_pdf([lease_page(n) for n in range(1, 32)])
    out = ex.extract_text(pdf, "application/pdf")
    assert ocr.calls == []
    assert len(pages_of(out)) == 31
    assert "SECTION 31." in pages_of(out)[30]


def test_text_layer_keeps_line_breaks_for_clause_splitting(ocr):
    # Regression: pypdf's default mode returned one line per page -> 14 clauses
    # instead of hundreds. Layout mode must keep one clause per line.
    pdf = text_pdf([lease_page(n) for n in range(1, 4)])
    out = ex.extract_text(pdf, "application/pdf")
    assert all(len(p.splitlines()) >= 30 for p in pages_of(out))
    assert len(analyse_text(out)["clauses"]) >= 60


def test_page_numbers_reach_the_analysis(ocr):
    out = ex.extract_text(text_pdf([lease_page(n) for n in range(1, 6)]), "application/pdf")
    a = analyse_text(out)
    assert a["pageCount"] == 5
    assert max(c["page"] for c in a["clauses"]) == 5


def test_extraction_plan_reports_pages_and_ocr_pages(ocr):
    plans = []
    ex.extract_text(text_pdf([lease_page(n) for n in range(1, 4)]), "application/pdf", on_plan=lambda *a: plans.append(a))
    ex.extract_text(scanned_pdf([f"page {i}" for i in range(5)]), "application/pdf", on_plan=lambda *a: plans.append(a))
    assert plans == [(3, 0), (5, 5)]


def test_failing_plan_callback_does_not_break_extraction(ocr):
    def broken(*_):
        raise RuntimeError("boom")
    out = ex.extract_text(text_pdf([lease_page(1)]), "application/pdf", on_plan=broken)
    assert "SECTION 1." in out


def test_scanned_pdf_is_ocrd_in_parallel_chunks_of_15(ocr):
    pdf = scanned_pdf([f"page {i}" for i in range(31)])
    out = ex.extract_text(pdf, "application/pdf")
    assert sorted(ocr.calls, reverse=True) == [15, 15, 1]
    assert len(pages_of(out)) == 31
    assert all(p.startswith("OCR page") for p in pages_of(out))


def test_mixed_pdf_only_ocrs_the_scanned_pages(ocr):
    text = text_pdf([lease_page(n) for n in range(1, 6)])
    scans = scanned_pdf(["scan a", "scan b"])
    pdf = merge((text, [0, 1]), (scans, [0, 1]), (text, [2, 3, 4]))
    out = pages_of(ex.extract_text(pdf, "application/pdf"))
    assert ocr.calls == [2]
    assert [p.startswith("OCR page") for p in out] == [False, False, True, True, False, False, False]
    assert out[4].startswith("SECTION 3.")


def test_scanned_page_with_typed_footer_still_goes_to_ocr(ocr):
    footer = text_pdf([["Smith and Co Letting Agents Ltd, 12 Main Street, Dublin 2 | Ref LA-2026-0042 | Page 4 of 31"]])
    scan = pypdf.PdfReader(io.BytesIO(scanned_pdf(["body text"])))
    page = scan.pages[0]
    page.merge_page(pypdf.PdfReader(io.BytesIO(footer)).pages[0])
    w = pypdf.PdfWriter()
    w.add_page(page)
    buf = io.BytesIO()
    w.write(buf)
    out = ex.extract_text(buf.getvalue(), "application/pdf")
    assert ocr.calls == [1]
    assert out.startswith("OCR page")


def test_page_with_filled_annotation_goes_to_ocr_and_keeps_its_value(ocr):
    w = pypdf.PdfWriter(clone_from=io.BytesIO(text_pdf([lease_page(1)])))
    w.add_annotation(0, FreeText(text="Monthly rent EUR 1850. Tenant Jane Doe.", rect=(50, 50, 400, 90)))
    buf = io.BytesIO()
    w.write(buf)
    out = ex.extract_text(buf.getvalue(), "application/pdf")
    assert ocr.calls == [1]
    # The fake OCR (like a real render of a field with no appearance) misses
    # the value, so the safety net must append it.
    assert "Jane Doe" in out


def test_password_protected_pdf_gives_clear_error(ocr):
    w = pypdf.PdfWriter(clone_from=io.BytesIO(text_pdf([lease_page(1)])))
    w.encrypt(user_password="secret", owner_password="owner")
    buf = io.BytesIO()
    w.write(buf)
    with pytest.raises(ex.PdfPasswordError, match="password-protected"):
        ex.extract_text(buf.getvalue(), "application/pdf")
    assert ocr.calls == []


def test_owner_only_encrypted_pdf_opens_normally(ocr):
    w = pypdf.PdfWriter(clone_from=io.BytesIO(text_pdf([lease_page(1)])))
    w.encrypt(user_password="", owner_password="owner")
    buf = io.BytesIO()
    w.write(buf)
    out = ex.extract_text(buf.getvalue(), "application/pdf")
    assert out.startswith("SECTION 1.")
    assert ocr.calls == []


def _broken_pdf() -> bytes:
    good = text_pdf([lease_page(1)])
    return good[: len(good) // 2]


def test_unreadable_short_pdf_is_read_by_one_sync_ocr_call(monkeypatch):
    monkeypatch.setattr(ex, "extract_text_sync", lambda data, mime: "sync text")
    monkeypatch.setattr(ex, "extract_text_large_document", lambda *a: pytest.fail("batch must not run"))
    assert ex.extract_text(_broken_pdf(), "application/pdf") == "sync text"


def test_unreadable_long_pdf_falls_back_to_batch_with_unique_name(monkeypatch):
    def too_many_pages(data, mime):
        raise gexc.InvalidArgument('Document pages exceed the limit: 15 got 40 [reason: "PAGE_LIMIT_EXCEEDED"]')

    seen = {}

    def fake_batch(data, mime, name):
        seen["name"] = name
        return "batch text"

    monkeypatch.setattr(ex, "extract_text_sync", too_many_pages)
    monkeypatch.setattr(ex, "extract_text_large_document", fake_batch)
    assert ex.extract_text(_broken_pdf(), "application/pdf") == "batch text"
    assert re.fullmatch(r"fallback-[0-9a-f-]{36}\.pdf", seen["name"])  # unique, never "upload.bin"


def test_damaged_pdf_fails_fast_with_clear_message(monkeypatch):
    def damaged(data, mime):
        raise gexc.InvalidArgument("Unable to process document")

    monkeypatch.setattr(ex, "extract_text_sync", damaged)
    monkeypatch.setattr(ex, "extract_text_large_document", lambda *a: pytest.fail("batch must not run"))
    with pytest.raises(ValueError, match="damaged"):
        ex.extract_text(_broken_pdf(), "application/pdf")


def test_blank_pdf_raises_instead_of_returning_empty(monkeypatch):
    monkeypatch.setattr(ex, "_process_online", FakeOCR(empty=True))
    with pytest.raises(ValueError, match="No text"):
        ex.extract_text(scanned_pdf([""]), "application/pdf")


def test_ocr_retries_quota_errors_then_succeeds(monkeypatch):
    attempts = {"n": 0}

    class Client:
        def processor_path(self, *a):
            return "projects/p/locations/eu/processors/x"

        def process_document(self, request, timeout):
            attempts["n"] += 1
            if attempts["n"] < 3:
                raise gexc.ResourceExhausted("quota")
            return documentai.ProcessResponse(document=documentai.Document(text="ok"))

    monkeypatch.setattr(ex, "_docai_client", lambda location: Client())
    monkeypatch.setattr(ex, "_docai_settings", lambda: ("p", "eu", "x"))
    monkeypatch.setattr(ex.time, "sleep", lambda s: None)
    assert ex._process_online(b"%PDF", "application/pdf").text == "ok"
    assert attempts["n"] == 3


def test_ocr_does_not_retry_invalid_requests(monkeypatch):
    attempts = {"n": 0}

    class Client:
        def processor_path(self, *a):
            return "x"

        def process_document(self, request, timeout):
            attempts["n"] += 1
            raise gexc.InvalidArgument("page limit")

    monkeypatch.setattr(ex, "_docai_client", lambda location: Client())
    monkeypatch.setattr(ex, "_docai_settings", lambda: ("p", "eu", "x"))
    with pytest.raises(gexc.InvalidArgument):
        ex._process_online(b"%PDF", "application/pdf")
    assert attempts["n"] == 1
