# Conversations API

Endpoints for managing chat conversation history.

---

## List Conversations

Retrieve all saved conversations.

### Request

```http
GET /api/conversations
```

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "conversations": [
    {
      "id": "conv_a1b2c3d4",
      "title": "Questions about RAG",
      "created_at": "2024-01-18T10:00:00Z",
      "updated_at": "2024-01-18T10:30:00Z",
      "message_count": 6
    },
    {
      "id": "conv_e5f6g7h8",
      "title": "Machine learning basics",
      "created_at": "2024-01-17T14:00:00Z",
      "updated_at": "2024-01-17T14:45:00Z",
      "message_count": 4
    }
  ]
}
```

### Example

=== "cURL"

    ```bash
    curl http://localhost:8000/api/conversations
    ```

=== "JavaScript"

    ```javascript
    const response = await fetch('/api/conversations');
    const { conversations } = await response.json();

    conversations.forEach(conv => {
      console.log(`${conv.title} (${conv.message_count} messages)`);
    });
    ```

---

## Get Conversation

Retrieve a specific conversation with all messages.

### Request

```http
GET /api/conversations/{conversation_id}
```

**Path Parameters:**

| Parameter         | Type   | Description     |
| ----------------- | ------ | --------------- |
| `conversation_id` | string | Conversation ID |

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "id": "conv_a1b2c3d4",
  "title": "Questions about RAG",
  "created_at": "2024-01-18T10:00:00Z",
  "updated_at": "2024-01-18T10:30:00Z",
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
      "content": "RAG (Retrieval-Augmented Generation) is a technique...",
      "timestamp": "2024-01-18T10:00:05Z",
      "sources": [
        {
          "filename": "rag_intro.pdf",
          "content": "RAG combines retrieval..."
        }
      ]
    },
    {
      "id": "msg_3",
      "role": "user",
      "content": "How does it work?",
      "timestamp": "2024-01-18T10:01:00Z"
    },
    {
      "id": "msg_4",
      "role": "assistant",
      "content": "RAG works in several steps...",
      "timestamp": "2024-01-18T10:01:08Z",
      "sources": [
        {
          "filename": "rag_intro.pdf",
          "content": "The RAG pipeline..."
        }
      ]
    }
  ]
}
```

### Errors

| Status | Error                  | Cause                   |
| ------ | ---------------------- | ----------------------- |
| `404`  | Conversation not found | Invalid conversation_id |

### Example

=== "cURL"

    ```bash
    curl http://localhost:8000/api/conversations/conv_a1b2c3d4
    ```

=== "JavaScript"

    ```javascript
    const conversationId = 'conv_a1b2c3d4';
    const response = await fetch(`/api/conversations/${conversationId}`);
    const conversation = await response.json();

    // Load messages into chat UI
    setMessages(conversation.messages);
    ```

---

## Create Conversation

Create a new empty conversation.

### Request

```http
POST /api/conversations
Content-Type: application/json
```

**Body:**

```json
{
  "title": "New chat about documents"
}
```

| Field   | Type   | Required | Description                                    |
| ------- | ------ | -------- | ---------------------------------------------- |
| `title` | string | No       | Conversation title (auto-generated if omitted) |

### Response

```http
HTTP/1.1 201 Created
Content-Type: application/json
```

```json
{
  "id": "conv_i9j0k1l2",
  "title": "New chat about documents",
  "created_at": "2024-01-18T11:00:00Z",
  "updated_at": "2024-01-18T11:00:00Z",
  "messages": []
}
```

### Example

=== "cURL"

    ```bash
    curl -X POST http://localhost:8000/api/conversations \
      -H "Content-Type: application/json" \
      -d '{"title": "Research questions"}'
    ```

---

## Delete Conversation

Remove a conversation and all its messages.

### Request

```http
DELETE /api/conversations/{conversation_id}
```

**Path Parameters:**

| Parameter         | Type   | Description     |
| ----------------- | ------ | --------------- |
| `conversation_id` | string | Conversation ID |

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "message": "Conversation deleted successfully"
}
```

### Errors

| Status | Error                  | Cause                   |
| ------ | ---------------------- | ----------------------- |
| `404`  | Conversation not found | Invalid conversation_id |

### Example

=== "cURL"

    ```bash
    curl -X DELETE http://localhost:8000/api/conversations/conv_a1b2c3d4
    ```

=== "JavaScript"

    ```javascript
    const conversationId = 'conv_a1b2c3d4';

    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      // Remove from UI
      setConversations(prev =>
        prev.filter(c => c.id !== conversationId)
      );
    }
    ```

---

## Automatic Title Generation

When a conversation is created through the chat endpoint without an explicit title, the title is automatically generated from the first user message.

### Example

**First message:** "What are the key benefits of using RAG for document Q&A?"

**Generated title:** "What are the key benefits of..."

The title is truncated to ~50 characters with ellipsis.

---

## Storage Format

Conversations are stored as JSON files in `data/conversations/`:

```
data/conversations/
├── conv_a1b2c3d4.json
├── conv_e5f6g7h8.json
└── conv_i9j0k1l2.json
```

### File Structure

```json
{
  "id": "conv_a1b2c3d4",
  "title": "Questions about RAG",
  "created_at": "2024-01-18T10:00:00Z",
  "updated_at": "2024-01-18T10:30:00Z",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "What is RAG?",
      "timestamp": "2024-01-18T10:00:00Z"
    }
  ]
}
```

---

## Data Models

### Conversation

```typescript
interface Conversation {
  id: string;
  title: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  messages: Message[];
}
```

### ConversationSummary

```typescript
interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}
```

### Message

```typescript
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO 8601
  sources?: SourceDocument[]; // Only for assistant messages
}
```

### ConversationListResponse

```typescript
interface ConversationListResponse {
  conversations: ConversationSummary[];
}
```
