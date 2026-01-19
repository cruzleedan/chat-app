# RAG Document Q&A - Backend

A FastAPI backend for document question-answering using RAG (Retrieval-Augmented Generation).

## Features

- 📄 Upload and index PDF, TXT, and MD files
- 🔍 Semantic search using ChromaDB
- 🤖 Question answering with Ollama (local LLM)
- 📚 Source citations in responses
- 🆓 100% free - runs locally, no API keys needed

## Prerequisites

### Install Ollama

1. Download from https://ollama.com or run:

   ```bash
   brew install ollama
   ```

2. Pull the required models:

   ```bash
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ```

3. Ollama runs automatically in the background. Verify with:
   ```bash
   ollama list
   ```

## Setup

### 1. Install Dependencies

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Default settings work out of the box with Ollama.

### 3. Run the Server

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Documents

| Method | Endpoint                | Description                 |
| ------ | ----------------------- | --------------------------- |
| POST   | `/api/documents/upload` | Upload and index a document |
| GET    | `/api/documents`        | List all indexed documents  |
| DELETE | `/api/documents/{id}`   | Delete a document           |

### Chat

| Method | Endpoint    | Description                    |
| ------ | ----------- | ------------------------------ |
| POST   | `/api/chat` | Ask a question about documents |

### Health

| Method | Endpoint  | Description  |
| ------ | --------- | ------------ |
| GET    | `/`       | Health check |
| GET    | `/health` | Health check |

## API Documentation

Once the server is running:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Settings and configuration
│   ├── api/
│   │   └── routes/
│   │       ├── documents.py # Document upload/management
│   │       └── chat.py      # Q&A endpoint
│   ├── core/
│   │   ├── document_processor.py  # PDF/text loading & chunking
│   │   ├── vectorstore.py         # ChromaDB management
│   │   └── rag.py                 # RAG pipeline
│   └── models/
│       └── schemas.py       # Pydantic models
├── data/
│   ├── uploads/             # Uploaded documents
│   └── chroma/              # ChromaDB storage
├── pyproject.toml
├── .env.example
└── README.md
```

## Configuration

Environment variables (set in `.env`):

| Variable                 | Default                  | Description                    |
| ------------------------ | ------------------------ | ------------------------------ |
| `OPENAI_API_KEY`         | -                        | Your OpenAI API key (required) |
| `OPENAI_MODEL`           | `gpt-4o-mini`            | Model for chat completion      |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Model for embeddings           |
| `CHUNK_SIZE`             | `1000`                   | Characters per chunk           |
| `CHUNK_OVERLAP`          | `200`                    | Overlap between chunks         |
| `TOP_K_RESULTS`          | `4`                      | Number of chunks to retrieve   |
