def read_pdf(path):
    """Return one text string per page."""
    import pdfplumber
    with pdfplumber.open(path) as pdf:
        return [(p.extract_text() or "") for p in pdf.pages]


def needs_ocr(pages, min_chars_per_page=50):
    total = sum(len(p.strip()) for p in pages)
    return total < min_chars_per_page * max(1, len(pages))