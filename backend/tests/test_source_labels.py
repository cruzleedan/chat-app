"""Context labels no longer print `Page N/A` or `Page 0` (WORK-0004)."""

from langchain_core.documents import Document

from app.core.rag import RAGPipeline


def doc(filename, page=None):
    metadata = {"filename": filename}
    if page is not None:
        metadata["page"] = page
    return Document(page_content="body", metadata=metadata)


def test_markdown_and_text_have_no_page():
    assert RAGPipeline._source_label(doc("story.md", 0), 1) == "[Source 1: story.md]"
    assert RAGPipeline._source_label(doc("notes.txt"), 2) == "[Source 2: notes.txt]"


def test_pdf_pages_are_one_based_for_the_model():
    assert RAGPipeline._source_label(doc("report.pdf", 0), 1) == "[Source 1: report.pdf, page 1]"
    assert RAGPipeline._source_label(doc("report.pdf", 4), 3) == "[Source 3: report.pdf, page 5]"


def test_slides_use_slide_numbers():
    assert RAGPipeline._source_label(doc("deck.pptx", 7), 1) == "[Source 1: deck.pptx, slide 7]"


def test_never_prints_na_or_page_zero():
    for d in (doc("a.md", 0), doc("b.docx"), doc("c.xlsx", 0)):
        label = RAGPipeline._source_label(d, 1)
        assert "N/A" not in label and "page 0" not in label.lower()
