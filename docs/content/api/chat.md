# Chat API

Endpoints for sending messages and receiving AI-generated responses.

---

## Chat (Non-Streaming)

Send a message and receive a complete response.

### Request

```http
POST /api/chat
Content-Type: application/json
```

**Body:**

```json
{
  "message": "What is RAG?",
  "conversation_id": "conv_123",
  "document_ids": ["doc_1", "doc_2"]
}
```

| Field             | Type     | Required | Description                    |
| ----------------- | -------- | -------- | ------------------------------ |
| `message`         | string   | Yes      | User's question                |
| `conversation_id` | string   | No       | Continue existing conversation |
| `document_ids`    | string[] | No       | Filter to specific documents   |

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "response": "RAG (Retrieval-Augmented Generation) is a technique that combines...",
  "sources": [
    {
      "filename": "rag_introduction.pdf",
      "content": "RAG is a method that enhances LLM responses by..."
    },
    {
      "filename": "ml_concepts.docx",
      "content": "Retrieval-Augmented Generation combines..."
    }
  ],
  "conversation_id": "conv_123"
}
```

### Example

=== "cURL"

    ```bash
    curl -X POST http://localhost:8000/api/chat \
      -H "Content-Type: application/json" \
      -d '{
        "message": "What is RAG?",
        "document_ids": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
      }'
    ```

=== "JavaScript"

    ```javascript
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is RAG?',
        conversation_id: currentConversationId,
        document_ids: Array.from(selectedDocIds)
      })
    });

    const { response: answer, sources } = await response.json();
    ```

---

## Chat Stream

Send a message and receive a streaming response via Server-Sent Events (SSE).

### Request

```http
POST /api/chat/stream
Content-Type: application/json
```

**Body:** Same as non-streaming endpoint

```json
{
  "message": "Explain machine learning",
  "conversation_id": "conv_123",
  "document_ids": ["doc_1"]
}
```

### Response

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Stream:**

```
data: {"type": "token", "content": "Machine"}

data: {"type": "token", "content": " learning"}

data: {"type": "token", "content": " is"}

data: {"type": "token", "content": " a"}

...

data: {"type": "sources", "sources": [{"filename": "ml_basics.pdf", "content": "..."}]}

data: {"type": "conversation_id", "conversation_id": "conv_123"}

data: [DONE]
```

### Event Types

| Type              | Description           | Payload                                                   |
| ----------------- | --------------------- | --------------------------------------------------------- |
| `token`           | Single token from LLM | `{ "type": "token", "content": "word" }`                  |
| `sources`         | Retrieved documents   | `{ "type": "sources", "sources": [...] }`                 |
| `conversation_id` | Conversation ID       | `{ "type": "conversation_id", "conversation_id": "..." }` |
| `[DONE]`          | Stream complete       | Plain text, not JSON                                      |

### Example

=== "JavaScript"

    ```javascript
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Explain machine learning',
        document_ids: selectedDocIds
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            console.log('Stream complete');
            break;
          }

          const event = JSON.parse(data);

          if (event.type === 'token') {
            content += event.content;
            updateUI(content);
          } else if (event.type === 'sources') {
            displaySources(event.sources);
          }
        }
      }
    }
    ```

=== "Python"

    ```python
    import requests
    import json

    response = requests.post(
        'http://localhost:8000/api/chat/stream',
        json={'message': 'Explain machine learning'},
        stream=True
    )

    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data = line[6:]
                if data == '[DONE]':
                    break
                event = json.loads(data)
                if event['type'] == 'token':
                    print(event['content'], end='', flush=True)
    ```

---

## Document Filtering

When `document_ids` is provided, the RAG pipeline only searches within those documents.

### All Documents (Default)

```json
{
  "message": "What is AI?",
  "document_ids": null
}
```

Searches across **all** uploaded documents.

### Specific Documents

```json
{
  "message": "What is AI?",
  "document_ids": ["doc_1", "doc_2"]
}
```

Searches only within `doc_1` and `doc_2`.

### Use Cases

| Scenario                    | document_ids         |
| --------------------------- | -------------------- |
| General question            | `null` or omit       |
| Question about specific PDF | `["pdf_doc_id"]`     |
| Compare two documents       | `["doc_1", "doc_2"]` |
| Just uploaded image         | `["new_image_id"]`   |

---

## Conversation Context

When `conversation_id` is provided, the LLM receives conversation history for context.

### New Conversation

```json
{
  "message": "What is machine learning?"
}
```

Response includes a new `conversation_id`.

### Continue Conversation

```json
{
  "message": "Can you give me an example?",
  "conversation_id": "conv_123"
}
```

LLM sees previous messages and can provide contextual follow-up.

### How History is Used

```
System: You are a helpful assistant...

Context from documents:
[Retrieved chunks]

Conversation history:
Human: What is machine learning?
Assistant: Machine learning is...

Current question: Can you give me an example?
```

---

## Error Handling

### Errors

| Status | Error                  | Cause                   |
| ------ | ---------------------- | ----------------------- |
| `400`  | Message is required    | Empty message           |
| `404`  | Conversation not found | Invalid conversation_id |
| `500`  | Generation failed      | LLM error               |
| `503`  | Service unavailable    | Ollama not running      |

### Error Response

```json
{
  "detail": "Ollama service is not available. Please ensure Ollama is running."
}
```

---

## Data Models

### ChatRequest

```typescript
interface ChatRequest {
  message: string;
  conversation_id?: string;
  document_ids?: string[];
}
```

### ChatResponse

```typescript
interface ChatResponse {
  response: string;
  sources: SourceDocument[];
  conversation_id: string;
}
```

### SourceDocument

```typescript
interface SourceDocument {
  filename: string;
  content: string; // Truncated preview
}
```

### StreamEvent

```typescript
type StreamEvent =
  | { type: "token"; content: string }
  | { type: "sources"; sources: SourceDocument[] }
  | { type: "conversation_id"; conversation_id: string };
```
