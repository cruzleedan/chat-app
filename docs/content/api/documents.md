# Documents API

Endpoints for uploading, listing, and managing documents.

---

## Upload Document

Upload a file to be processed and indexed for RAG.

### Request

```http
POST /api/documents
Content-Type: multipart/form-data
```

**Form Data:**

| Field  | Type | Required | Description                 |
| ------ | ---- | -------- | --------------------------- |
| `file` | File | Yes      | The document file to upload |

**Supported File Types:**

- PDF (`.pdf`)
- Word (`.docx`, `.doc`)
- Excel (`.xlsx`, `.xls`)
- PowerPoint (`.pptx`, `.ppt`)
- Text (`.txt`, `.md`)
- HTML (`.html`)
- Images (`.jpg`, `.jpeg`, `.png`)

**Max File Size:** 50MB

### Response

```http
HTTP/1.1 201 Created
Content-Type: application/json
```

```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "filename": "report.pdf",
    "content_type": "application/pdf",
    "size": 1048576,
    "chunk_count": 15,
    "uploaded_at": "2024-01-18T10:30:00Z"
  }
}
```

### Errors

| Status | Error             | Cause                        |
| ------ | ----------------- | ---------------------------- |
| `400`  | Invalid file type | Unsupported extension        |
| `400`  | File too large    | Exceeds 50MB limit           |
| `500`  | Processing failed | Error during text extraction |

### Example

=== "cURL"

    ```bash
    curl -X POST http://localhost:8000/api/documents \
      -F "file=@/path/to/document.pdf"
    ```

=== "JavaScript"

    ```javascript
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const response = await fetch('/api/documents', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    console.log(result.document.id);
    ```

=== "Python"

    ```python
    import requests

    with open('document.pdf', 'rb') as f:
        response = requests.post(
            'http://localhost:8000/api/documents',
            files={'file': f}
        )

    print(response.json()['document']['id'])
    ```

---

## List Documents

Retrieve all uploaded documents.

### Request

```http
GET /api/documents
```

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "documents": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "filename": "report.pdf",
      "content_type": "application/pdf",
      "size": 1048576,
      "chunk_count": 15,
      "uploaded_at": "2024-01-18T10:30:00Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "filename": "notes.txt",
      "content_type": "text/plain",
      "size": 2048,
      "chunk_count": 3,
      "uploaded_at": "2024-01-18T11:00:00Z"
    }
  ]
}
```

### Example

=== "cURL"

    ```bash
    curl http://localhost:8000/api/documents
    ```

=== "JavaScript"

    ```javascript
    const response = await fetch('/api/documents');
    const { documents } = await response.json();

    documents.forEach(doc => {
      console.log(`${doc.filename} (${doc.chunk_count} chunks)`);
    });
    ```

---

## Get Document Details

Retrieve details for a specific document.

### Request

```http
GET /api/documents/{document_id}
```

**Path Parameters:**

| Parameter     | Type   | Description          |
| ------------- | ------ | -------------------- |
| `document_id` | string | UUID of the document |

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "report.pdf",
  "content_type": "application/pdf",
  "size": 1048576,
  "chunk_count": 15,
  "uploaded_at": "2024-01-18T10:30:00Z"
}
```

### Errors

| Status | Error              | Cause               |
| ------ | ------------------ | ------------------- |
| `404`  | Document not found | Invalid document_id |

### Example

=== "cURL"

    ```bash
    curl http://localhost:8000/api/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890
    ```

---

## Delete Document

Remove a document and all its chunks from the system.

### Request

```http
DELETE /api/documents/{document_id}
```

**Path Parameters:**

| Parameter     | Type   | Description          |
| ------------- | ------ | -------------------- |
| `document_id` | string | UUID of the document |

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "message": "Document deleted successfully"
}
```

### What Gets Deleted

1. Document metadata from store
2. All chunks from ChromaDB vector store
3. Original file from uploads directory

### Errors

| Status | Error              | Cause                         |
| ------ | ------------------ | ----------------------------- |
| `404`  | Document not found | Invalid document_id           |
| `500`  | Deletion failed    | File system or database error |

### Example

=== "cURL"

    ```bash
    curl -X DELETE http://localhost:8000/api/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890
    ```

=== "JavaScript"

    ```javascript
    const documentId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      console.log('Document deleted');
    }
    ```

---

## Data Models

### DocumentMetadata

```typescript
interface DocumentMetadata {
  id: string; // UUID
  filename: string; // Original filename
  content_type: string; // MIME type
  size: number; // File size in bytes
  chunk_count: number; // Number of chunks created
  uploaded_at: string; // ISO 8601 timestamp
}
```

### UploadResponse

```typescript
interface UploadResponse {
  message: string;
  document: DocumentMetadata;
}
```

### DocumentListResponse

```typescript
interface DocumentListResponse {
  documents: DocumentMetadata[];
}
```
