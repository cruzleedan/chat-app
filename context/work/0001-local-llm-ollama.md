---
id: 0001
title: "Local-first LLM inference via shared Ollama service"
status: accepted
kind: infra
opened: 2026-08-01
decided: 2026-08-01
branch: ~
supersedes: ~
superseded-by: ~
---

# WORK-0001 — Local-first LLM inference via shared Ollama service

| | |
|---|---|
| **Opened** | 2026-08-01 |
| **Status** | accepted |
| **Kind** | infra |
| **Supersedes** | — |
| **Superseded by** | — |

## Problem

The RAG chat app needs an LLM for document Q&A and text embeddings. Options
include cloud API services (OpenAI, Anthropic) or local inference. This is a
homelab project where cost, data privacy, and offline capability matter.

## Decision

All LLM inference uses the **shared Ollama service** (`shared-ollama` container
on `shared-ollama-network`). No cloud LLM API keys are required or used.

- **Generation:** `llama3.2` via `http://shared-ollama:11434`
- **Embeddings:** `nomic-embed-text` via `http://shared-ollama:11434`

## Options considered

| Option | Pros | Cons | Chosen? |
|---|---|---|---|
| Ollama (local) | Free; data stays on d3; works offline; shared across projects | Slower inference than cloud; model quality ceiling vs GPT-4 | ✓ |
| OpenAI API | Best quality; fast | Per-token cost; data leaves the server; requires internet | ✗ |
| Hugging Face Inference API | Free tier | Rate limits; data leaves server | ✗ |

## Consequences

**Positive:**
- Zero API costs
- Documents never leave the homelab server
- Ollama service is shared with `receipt-parser-app` and other future LLM projects

**Negative / Trade-offs accepted:**
- Inference speed is CPU-bound on d3 — slow for large documents
- `llama3.2` quality is below GPT-4; complex reasoning tasks may produce poor results
- App is non-functional if `ollama-service` is down

**Risks / Open questions:**
- None outstanding.

## Definition of done

- [x] Backend reads Ollama URL from `OLLAMA_BASE_URL` env var (not hardcoded)
- [x] Backend joins `shared-ollama-network` via `docker-compose.yml`

## Log

- 2026-08-01 accepted — decision made at project inception; migrated from
  ADR-0001 to this work item format

## Implementation Notes

- Connect to Ollama at `http://shared-ollama:11434` (do **not** hardcode this —
  read from `OLLAMA_BASE_URL` env var)
- The backend service joins `shared-ollama-network` via `docker-compose.yml`
- To change model: update `OLLAMA_MODEL` and `OLLAMA_EMBED_MODEL` env vars;
  ensure the model is pulled on the shared-ollama container first:
  ```bash
  docker exec shared-ollama ollama pull <model-name>
  ```

---

> **For AI agents:** Do NOT implement this work item unless status is
> `accepted` or `building`. If status is `proposed`, surface it to the user
> for a decision before writing any code. If status is `superseded`, follow
> the item in `superseded-by` instead — do NOT implement the pattern
> described here. If you are about to contradict an `accepted`, `building`,
> `shipped`, or `operating` item, stop and surface it to the user before
> proceeding.
