# Document Processing

The Document Processor handles loading, extracting text, chunking, and embedding documents into the vector store.

## Supported Formats

| Format     | Extensions              | Library     | Notes                   |
| ---------- | ----------------------- | ----------- | ----------------------- |
| PDF        | `.pdf`                  | PyPDF       | Page-by-page extraction |
| Word       | `.docx`, `.doc`         | python-docx | Paragraphs and tables   |
| Excel      | `.xlsx`, `.xls`         | openpyxl    | All sheets, cell values |
| PowerPoint | `.pptx`, `.ppt`         | python-pptx | Slides and notes        |
| Images     | `.jpg`, `.jpeg`, `.png` | pytesseract | OCR text extraction     |
| Text       | `.txt`, `.md`           | Built-in    | Plain text              |
| HTML       | `.html`                 | Built-in    | Stripped tags           |

## Processing Pipeline

```mermaid
flowchart LR
    A[File Upload] --> B[Type Detection]
    B --> C[Loader Selection]
    C --> D[Text Extraction]
    D --> E[Text Chunking]
    E --> F[Embedding Generation]
    F --> G[ChromaDB Storage]
```

## Document Processor Class

```python
class DocumentProcessor:
    SUPPORTED_EXTENSIONS = {
        ".pdf", ".txt", ".md", ".html",
        ".docx", ".doc",
        ".xlsx", ".xls",
        ".pptx", ".ppt",
        ".jpg", ".jpeg", ".png",
    }

    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        self.vectorstore = Chroma(
            persist_directory="./data/chroma",
            embedding_function=self.embeddings,
            collection_name="documents"
        )
```

## Loaders by File Type

### PDF Loading

```python
def _load_pdf(self, file_path: Path) -> list[Document]:
    loader = PyPDFLoader(str(file_path))
    return loader.load()  # Returns one Document per page
```

### Word Document Loading

```python
def _load_docx(self, file_path: Path) -> list[Document]:
    from docx import Document as DocxDocument

    doc = DocxDocument(file_path)
    text_parts = []

    for paragraph in doc.paragraphs:
        if paragraph.text.strip():
            text_parts.append(paragraph.text)

    # Also extract tables
    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(cell.text for cell in row.cells)
            text_parts.append(row_text)

    return [Document(
        page_content="\n\n".join(text_parts),
        metadata={"source": str(file_path)}
    )]
```

### Excel Loading

```python
def _load_excel(self, file_path: Path) -> list[Document]:
    from openpyxl import load_workbook

    wb = load_workbook(file_path, data_only=True)
    documents = []

    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]
        rows = []

        for row in sheet.iter_rows(values_only=True):
            row_values = [str(cell) if cell else "" for cell in row]
            if any(row_values):
                rows.append(" | ".join(row_values))

        if rows:
            documents.append(Document(
                page_content=f"Sheet: {sheet_name}\n\n" + "\n".join(rows),
                metadata={"source": str(file_path), "sheet": sheet_name}
            ))

    return documents
```

### PowerPoint Loading

```python
def _load_pptx(self, file_path: Path) -> list[Document]:
    from pptx import Presentation

    prs = Presentation(file_path)
    slides_content = []

    for i, slide in enumerate(prs.slides, 1):
        slide_text = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                slide_text.append(shape.text)

        if slide_text:
            slides_content.append(f"Slide {i}:\n" + "\n".join(slide_text))

    return [Document(
        page_content="\n\n---\n\n".join(slides_content),
        metadata={"source": str(file_path)}
    )]
```

### Image Loading (OCR)

```python
def _load_image(self, file_path: Path) -> list[Document]:
    import pytesseract
    from PIL import Image

    image = Image.open(file_path)
    text = pytesseract.image_to_string(image)

    if not text.strip():
        text = "[Image contains no extractable text]"
    else:
        # Add context for LLM
        filename = file_path.name
        text = f"[The following text was extracted from an image file " \
               f"named '{filename}' using OCR:]\n\n{text}"

    return [Document(
        page_content=text,
        metadata={"source": str(file_path), "content_type": "image_ocr"}
    )]
```

## Text Chunking

Documents are split into smaller chunks for better retrieval precision.

### Chunking Strategy

```python
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,      # Target chunk size in characters
    chunk_overlap=200,    # Overlap between chunks
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""]  # Priority order
)
```

### Why These Settings?

| Parameter           | Value           | Rationale                                  |
| ------------------- | --------------- | ------------------------------------------ |
| `chunk_size=1000`   | ~200-250 tokens | Fits in context window, meaningful content |
| `chunk_overlap=200` | 20% overlap     | Preserves context across chunk boundaries  |
| `separators`        | Hierarchical    | Prefers paragraph > sentence > word breaks |

### Chunking Example

```
Original (2500 chars):
┌─────────────────────────────────────────────────────┐
│ Introduction paragraph...                           │
│                                                     │
│ Section 1: Details about topic A...                │
│                                                     │
│ Section 2: Details about topic B...                │
│                                                     │
│ Conclusion...                                       │
└─────────────────────────────────────────────────────┘

After chunking (chunk_size=1000, overlap=200):
┌─────────────────┐
│ Chunk 1         │ (chars 0-1000)
│ Intro + Sec 1   │
└────────┬────────┘
         │ overlap (200 chars)
    ┌────┴────────────┐
    │ Chunk 2         │ (chars 800-1800)
    │ Sec 1 + Sec 2   │
    └────────┬────────┘
             │ overlap
        ┌────┴────────────┐
        │ Chunk 3         │ (chars 1600-2500)
        │ Sec 2 + Concl   │
        └─────────────────┘
```

## Embedding Generation

Each chunk is converted to a 768-dimensional vector using the embedding model.

```python
# Using Ollama embeddings
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# Generate embedding for a single chunk
vector = embeddings.embed_query("What is RAG?")
# Returns: [0.123, -0.456, 0.789, ...] (768 dimensions)
```

## Metadata Storage

Each chunk is stored with metadata for filtering and attribution:

```python
{
    "id": "chunk_uuid",
    "document_id": "doc_uuid",
    "filename": "report.pdf",
    "content_type": "application/pdf",
    "chunk_index": 0,
    "source": "/path/to/report.pdf"
}
```

## Processing Flow Code

```python
async def process_document(self, file_path: Path, doc_id: str, filename: str):
    # 1. Load document
    documents = self.load_document(file_path)

    # 2. Chunk documents
    chunks = self.text_splitter.split_documents(documents)

    # 3. Add metadata to each chunk
    for i, chunk in enumerate(chunks):
        chunk.metadata.update({
            "document_id": doc_id,
            "filename": filename,
            "chunk_index": i,
        })

    # 4. Add to vector store (embeddings generated automatically)
    self.vectorstore.add_documents(chunks)

    return len(chunks)
```

## Error Handling

```python
def load_document(self, file_path: Path) -> list[Document]:
    ext = file_path.suffix.lower()

    if ext not in self.SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}")

    try:
        if ext == ".pdf":
            return self._load_pdf(file_path)
        elif ext in {".docx", ".doc"}:
            return self._load_docx(file_path)
        # ... other types
    except Exception as e:
        logger.error(f"Failed to process {file_path}: {e}")
        raise ProcessingError(f"Failed to process document: {str(e)}")
```

## Performance Considerations

| Aspect     | Optimization                            |
| ---------- | --------------------------------------- |
| Large PDFs | Process page-by-page, batch embeddings  |
| Many files | Async processing, queue system          |
| Memory     | Stream large files, don't load entirely |
| Embeddings | Batch API calls (32 chunks at a time)   |
