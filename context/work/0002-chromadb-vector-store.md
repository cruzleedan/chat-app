---
id: 0002
title: "ChromaDB as the vector store for document embeddings"
status: accepted
kind: infra
opened: 2026-08-01
decided: 2026-08-01
branch: ~
supersedes: ~
superseded-by: ~
---

# WORK-0002 — ChromaDB as the vector store for document embeddings

| | |
|---|---|
| **Opened** | 2026-08-01 |
| **Status** | accepted |
| **Kind** | infra |
| **Supersedes** | — |
| **Superseded by** | — |

## Problem

The RAG pipeline needs a vector store to persist and query document embeddings.
The store must run locally (no cloud services), integrate with LangChain, and be
simple to operate in Docker.

## Decision

Use **ChromaDB** (`langchain-chroma`) as the vector store. Data is persisted to
the `backend/data/` directory, which is mounted as a Docker volume.

## Options considered

| Option | Pros | Cons | Chosen? |
|---|---|---|---|
| ChromaDB | Simple setup; runs in-process or as server; native LangChain integration; persists to disk | Not designed for production-scale (millions of vectors) | ✓ |
| pgvector | Postgres extension; reuse existing DB | Requires postgres setup; more operational complexity for this use case | ✗ |
| Pinecone | Managed, scalable | Cloud-only; costs money; data leaves server | ✗ |
| FAISS | Fast, in-memory | No persistence out of the box; must serialize manually | ✗ |

## Consequences

**Positive:**
- Zero additional infrastructure — runs inside the backend container
- Persistent across container restarts via Docker volume mount

**Negative / Trade-offs accepted:**
- `backend/data/` directory must be preserved — **deleting it loses all indexed
  documents** and requires re-uploading and re-indexing
- Not suitable for large-scale (>100k documents) workloads

**Risks / Open questions:**
- None outstanding.

## Definition of done

- [x] ChromaDB data directory mounted as Docker volume in `docker-compose.yml`
- [x] Re-indexing procedure documented (re-upload through the API)

## Log

- 2026-08-01 accepted — decision made at project inception; migrated from
  ADR-0002 to this work item format

## Implementation Notes

- ChromaDB data directory: `backend/data/` (mounted as Docker volume in `docker-compose.yml`)
- **Do not delete `data/` without backing it up first**
- If ChromaDB is corrupted, restart the backend container — it will reinitialize
- Re-index by re-uploading documents through the API

---

> **For AI agents:** Do NOT implement this work item unless status is
> `accepted` or `building`. If status is `proposed`, surface it to the user
> for a decision before writing any code. If status is `superseded`, follow
> the item in `superseded-by` instead — do NOT implement the pattern
> described here. If you are about to contradict an `accepted`, `building`,
> `shipped`, or `operating` item, stop and surface it to the user before
> proceeding.
