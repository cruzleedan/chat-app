# Chat App — Project Guide

RAG (Retrieval-Augmented Generation) document Q&A application.  
**Live at:** `chat-app.cruzleedan.work`

---

## Stack

- **Backend:** Python · FastAPI · ChromaDB (vector store) · Ollama
- **Frontend:** React · Vite · Tailwind CSS · Nginx
- **LLM:** Uses `shared-ollama` service — `llama3.2` for generation, `nomic-embed-text` for embeddings
- **Networks:** `caddy-network` (web facing) + `shared-ollama-network` (LLM access)

---

## Directory Structure

```
chat-app/
├── backend/
│   ├── app/                   # FastAPI application
│   ├── data/                  # ChromaDB vector store (persisted)
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/                   # React source
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── docker-compose.override.yml
```

---

## Critical Dependencies

- **Requires `ollama-service` to be running first.** The backend connects to
  `http://shared-ollama:11434`. If Ollama is down, the chat API will fail.
- `data/` directory contains the ChromaDB vector store. **Do not delete it** — it
  holds indexed document embeddings. Back it up before any storage changes.

---

## Common Commands

```bash
# Start (from chat-app/)
docker compose up -d

# Logs
docker logs -f rag-backend
docker logs -f rag-frontend

# Rebuild after code changes
docker compose up -d --build

# Restart the backend (Compose service name; does not re-index documents)
docker compose restart backend
```

---

## Conventions

- Backend is Python/FastAPI — use `pyproject.toml` for dependencies
- ChromaDB data is persisted in `data/` — mount this in Docker
- Embeddings model: `nomic-embed-text` | Generation model: `llama3.2`
- Do not hardcode the Ollama URL — use env var `OLLAMA_BASE_URL`

## Checklist for New Code

- [ ] `OLLAMA_BASE_URL` read from environment (not hardcoded)
- [ ] `data/` volume is preserved across container restarts
- [ ] Both backend and frontend can be rebuilt with `docker compose up -d --build`

---

## Context

Architectural decisions and proposals live in `context/work/`. Release
conventions are in `context/RELEASING.md`. Log framework friction (not code
bugs) in `context/friction.md`.
