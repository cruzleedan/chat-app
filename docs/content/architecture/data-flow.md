# Data Flow

This document describes how data flows through the RAG Document Q&A application for key operations.

---

## Document Upload Flow

When a user uploads a document, it goes through several processing stages before becoming searchable.

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as FastAPI
    participant DP as Document Processor
    participant FS as File System
    participant VS as ChromaDB
    participant EMB as Embeddings

    U->>F: Drop/Select file
    F->>F: Validate file type
    F->>API: POST /api/documents (multipart)

    API->>FS: Save file to uploads/
    API->>DP: Process document

    DP->>DP: Load file (PDF/DOCX/etc)
    DP->>DP: Extract text content
    DP->>DP: Split into chunks

    loop For each chunk
        DP->>EMB: Generate embedding
        EMB-->>DP: 768-dim vector
        DP->>VS: Store chunk + embedding
    end

    DP-->>API: Processing complete
    API-->>F: Document metadata
    F-->>U: Show in document list
```

### Stage Details

#### 1. File Upload

```
Frontend → Backend
- HTTP POST multipart/form-data
- File size validation (default: 50MB max)
- File type validation (extension check)
```

#### 2. File Storage

```
Backend
- Generate UUID for document
- Save to: data/uploads/{uuid}.{ext}
- Store original filename in metadata
```

#### 3. Text Extraction

```
Document Processor
- PDF: PyPDF extracts page by page
- DOCX: python-docx extracts paragraphs
- Images: pytesseract OCR
- Excel: openpyxl extracts cell values
```

#### 4. Chunking

```
Text Splitter (RecursiveCharacterTextSplitter)
- chunk_size: 1000 characters
- chunk_overlap: 200 characters
- Preserves sentence boundaries when possible
```

#### 5. Embedding & Storage

```
ChromaDB
- Embedding model: nomic-embed-text
- Vector dimensions: 768
- Metadata: document_id, filename, chunk_index
```

---

## Chat Query Flow

When a user sends a question, RAG retrieves relevant context and generates a response.

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as FastAPI
    participant RAG as RAG Pipeline
    participant VS as ChromaDB
    participant LLM as Ollama LLM

    U->>F: Type question + Enter
    F->>F: Add user message to UI
    F->>API: POST /api/chat/stream

    API->>RAG: Query with filters

    RAG->>VS: Semantic search
    Note over RAG,VS: query + document_ids filter
    VS-->>RAG: Top K relevant chunks

    RAG->>RAG: Build context string
    RAG->>RAG: Construct prompt

    RAG->>LLM: Generate (streaming)

    loop Token by token
        LLM-->>RAG: Token
        RAG-->>API: SSE event
        API-->>F: data: {"type":"token",...}
        F-->>U: Append to response
    end

    RAG-->>API: Sources
    API-->>F: data: {"type":"sources",...}
    F-->>U: Show source documents

    API-->>F: data: [DONE]
    F->>F: Save to conversation
```

### Query Processing Details

#### 1. Semantic Search

```python
# ChromaDB query with filtering
results = collection.query(
    query_texts=[user_question],
    n_results=4,  # Top 4 chunks
    where={"document_id": {"$in": selected_doc_ids}}  # Optional filter
)
```

#### 2. Context Building

```python
context = "\n\n---\n\n".join([
    f"Source: {doc.metadata['filename']}\n{doc.page_content}"
    for doc in retrieved_docs
])
```

#### 3. Prompt Construction

```python
prompt = f"""Use the following context to answer the question.
If you cannot answer based on the context, say so.

Context:
{context}

Question: {user_question}

Answer:"""
```

#### 4. Streaming Response

```python
async for chunk in llm.astream(prompt):
    yield {"type": "token", "content": chunk}
```

---

## Document Filtering Flow

When users select specific documents, queries are filtered to only those documents.

```mermaid
flowchart TD
    A[User selects documents] --> B[Frontend stores selectedDocIds]
    B --> C[User sends question]
    C --> D[Include document_ids in request]
    D --> E[Backend receives query]
    E --> F{document_ids provided?}
    F -->|Yes| G[ChromaDB query with $in filter]
    F -->|No| H[ChromaDB query all documents]
    G --> I[Return filtered results]
    H --> I
```

### Filter Implementation

```typescript
// Frontend: Track selected documents
const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

// Include in API call
const response = await api.chat(
  message,
  conversationId,
  selectedDocIds.size > 0 ? Array.from(selectedDocIds) : undefined,
);
```

```python
# Backend: Apply filter
if document_ids:
    filter_dict = {"document_id": {"$in": document_ids}}
else:
    filter_dict = None

results = self.vectorstore.similarity_search(
    query,
    k=4,
    filter=filter_dict
)
```

---

## Conversation Persistence Flow

Conversations are automatically saved and can be resumed across sessions.

```mermaid
sequenceDiagram
    participant F as Frontend
    participant API as FastAPI
    participant CM as Conversation Manager
    participant FS as File System

    Note over F,FS: On first message
    F->>API: POST /api/conversations
    API->>CM: Create new conversation
    CM->>FS: Save to conversations/{id}.json
    CM-->>API: Conversation ID
    API-->>F: conversation_id

    Note over F,FS: On each message
    F->>API: POST /api/chat (with conv_id)
    API->>CM: Append message
    CM->>FS: Update JSON file

    Note over F,FS: On page load
    F->>API: GET /api/conversations
    API->>CM: List conversations
    CM->>FS: Read all JSON files
    CM-->>API: Conversation list
    API-->>F: Display in sidebar
```

### Conversation Structure

```json
{
  "id": "conv_a1b2c3d4",
  "title": "Questions about RAG",
  "created_at": "2024-01-18T10:00:00Z",
  "updated_at": "2024-01-18T10:05:00Z",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "What is RAG?",
      "timestamp": "2024-01-18T10:00:00Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": "RAG (Retrieval-Augmented Generation) is...",
      "timestamp": "2024-01-18T10:00:05Z",
      "sources": [{ "filename": "rag_intro.pdf", "content": "..." }]
    }
  ]
}
```

---

## Image Paste Flow (with OCR)

When a user pastes an image, it's processed with OCR and immediately included in the query.

```mermaid
sequenceDiagram
    participant U as User
    participant CI as ChatInput
    participant F as App
    participant API as FastAPI
    participant DP as Document Processor
    participant OCR as Pytesseract

    U->>CI: Ctrl+V (paste image)
    CI->>CI: Detect image in clipboard
    CI->>CI: Convert to File object
    CI->>F: onImagePaste(file)

    F->>API: POST /api/documents
    API->>DP: Process image
    DP->>OCR: Extract text
    OCR-->>DP: Extracted text
    DP->>DP: Add image context prefix
    DP-->>API: Document ID
    API-->>F: document_id

    F->>F: Add to selectedDocIds

    U->>CI: Type question + Enter
    CI->>F: onSend(message, [newDocId])
    F->>API: POST /api/chat (with image doc_id)

    Note over API: RAG includes OCR text in context
```

### OCR Text Format

```
[The following text was extracted from an image file named 'screenshot.png'
using OCR (Optical Character Recognition). This is the visible text content
from that image:]

# RAG Document Q&A App
Build a full-stack application...
```

---

## Data Flow Summary

| Operation   | Frontend → Backend | Processing              | Storage               |
| ----------- | ------------------ | ----------------------- | --------------------- |
| Upload      | Multipart file     | Extract → Chunk → Embed | ChromaDB + Filesystem |
| Query       | JSON request       | Retrieve → Generate     | -                     |
| Stream      | SSE connection     | Token-by-token          | -                     |
| Filter      | document_ids array | $in filter              | -                     |
| Save Chat   | JSON request       | Append message          | JSON file             |
| Load Chats  | GET request        | Read files              | JSON files            |
| Paste Image | Multipart file     | OCR → Chunk → Embed     | ChromaDB + Filesystem |

---

## Error Handling Flow

```mermaid
flowchart TD
    A[API Request] --> B{Validation}
    B -->|Invalid| C[400 Bad Request]
    B -->|Valid| D{Processing}
    D -->|File Error| E[500 Internal Error]
    D -->|LLM Error| F[503 Service Unavailable]
    D -->|Success| G[200 OK]

    C --> H[Frontend shows error toast]
    E --> H
    F --> H
    G --> I[Frontend updates UI]
```

```typescript
// Frontend error handling
try {
  const response = await api.uploadDocument(file);
  handleSuccess(response);
} catch (error) {
  if (error.response?.status === 400) {
    showToast("Invalid file type");
  } else if (error.response?.status === 503) {
    showToast("AI service unavailable");
  } else {
    showToast("Upload failed");
  }
}
```
