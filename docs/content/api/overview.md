# API Overview

The RAG Document Q&A application exposes a RESTful API built with FastAPI.

## Base URL

```
http://localhost:8000/api
```

## Interactive Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## API Endpoints Summary

| Method            | Endpoint              | Description                  |
| ----------------- | --------------------- | ---------------------------- |
| **Documents**     |                       |                              |
| `POST`            | `/documents`          | Upload a document            |
| `GET`             | `/documents`          | List all documents           |
| `GET`             | `/documents/{id}`     | Get document details         |
| `DELETE`          | `/documents/{id}`     | Delete a document            |
| **Chat**          |                       |                              |
| `POST`            | `/chat`               | Send message (non-streaming) |
| `POST`            | `/chat/stream`        | Send message (streaming)     |
| **Conversations** |                       |                              |
| `GET`             | `/conversations`      | List all conversations       |
| `GET`             | `/conversations/{id}` | Get conversation details     |
| `POST`            | `/conversations`      | Create new conversation      |
| `DELETE`          | `/conversations/{id}` | Delete conversation          |

## Authentication

Currently, the API does not require authentication. For production deployment, consider adding:

- API key authentication
- JWT tokens
- OAuth2

## Common Headers

```http
Content-Type: application/json
Accept: application/json
```

For file uploads:

```http
Content-Type: multipart/form-data
```

## Response Format

### Success Response

```json
{
  "data": { ... },
  "message": "Success"
}
```

### Error Response

```json
{
  "detail": "Error description",
  "status_code": 400
}
```

## HTTP Status Codes

| Code  | Meaning                                  |
| ----- | ---------------------------------------- |
| `200` | Success                                  |
| `201` | Created                                  |
| `400` | Bad Request - Invalid input              |
| `404` | Not Found - Resource doesn't exist       |
| `422` | Validation Error - Invalid data format   |
| `500` | Internal Server Error                    |
| `503` | Service Unavailable - LLM not responding |

## Rate Limiting

No rate limiting is currently implemented. For production, consider:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/chat")
@limiter.limit("10/minute")
async def chat():
    ...
```

## CORS Configuration

The API allows cross-origin requests from the frontend:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## API Sections

- [Documents API](documents.md) - Upload, list, and manage documents
- [Chat API](chat.md) - Send messages and receive AI responses
- [Conversations API](conversations.md) - Manage chat history
