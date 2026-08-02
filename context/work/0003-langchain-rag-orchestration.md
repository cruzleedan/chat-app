---
id: 0003
title: "LangChain as the RAG orchestration framework"
status: accepted
kind: infra
opened: 2026-08-01
decided: 2026-08-01
branch: ~
supersedes: ~
superseded-by: ~
---

# WORK-0003 — LangChain as the RAG orchestration framework

| | |
|---|---|
| **Opened** | 2026-08-01 |
| **Status** | accepted |
| **Kind** | infra |
| **Supersedes** | — |
| **Superseded by** | — |

## Problem

The RAG pipeline requires: document loading (PDF, DOCX, XLSX, PPTX, HTML),
text chunking, embedding generation, vector storage, retrieval, and LLM
prompting — all stitched together. This is multi-step orchestration that benefits
from a framework abstraction.

## Decision

Use **LangChain** (`langchain`, `langchain-core`, `langchain-community`,
`langchain-ollama`, `langchain-chroma`) to orchestrate the full RAG pipeline.

## Options considered

| Option | Pros | Cons | Chosen? |
|---|---|---|---|
| LangChain | All loaders, splitters, vectorstores, LLM adapters in one ecosystem; mature; Ollama + Chroma integrations exist | Can be complex/over-abstracted; breaking changes between versions | ✓ |
| Manual implementation | Full control; no dependency on LangChain | Build document loaders, chunking, retrieval logic from scratch | ✗ |
| LlamaIndex | Strong RAG focus | Less community tooling for Ollama at time of decision | ✗ |

## Consequences

**Positive:**
- Document loaders for PDF, DOCX, XLSX, PPTX, HTML, images (pytesseract) are all
  provided by `langchain-community`
- Swapping Ollama models or ChromaDB for another vector store requires only config
  changes, not code rewrites

**Negative / Trade-offs accepted:**
- LangChain's API surface changes frequently — pin dependency versions carefully
- Abstractions make it harder to debug what SQL/embeddings are actually being run

**Risks / Open questions:**
- None outstanding.

## Definition of done

- [x] Document loading uses `langchain-community` loaders for all supported formats
- [x] `pypdf`, `docx2txt`, `python-pptx`, `beautifulsoup4`, `pytesseract` installed
      in the Docker image

## Log

- 2026-08-01 accepted — decision made at project inception; migrated from
  ADR-0003 to this work item format

## Implementation Notes

- Document loading handled by `langchain-community` loaders (PDF → `PyPDFLoader`,
  DOCX → `Docx2txtLoader`, etc.)
- Text splitting: `RecursiveCharacterTextSplitter`
- Embeddings: `langchain-ollama` → `OllamaEmbeddings`
- Vector store: `langchain-chroma` → `Chroma`
- LLM: `langchain-ollama` → `ChatOllama`
- `pypdf`, `docx2txt`, `python-pptx`, `beautifulsoup4`, `pytesseract` are required
  for document loading — they are installed in the Docker image

---

> **For AI agents:** Do NOT implement this work item unless status is
> `accepted` or `building`. If status is `proposed`, surface it to the user
> for a decision before writing any code. If status is `superseded`, follow
> the item in `superseded-by` instead — do NOT implement the pattern
> described here. If you are about to contradict an `accepted`, `building`,
> `shipped`, or `operating` item, stop and surface it to the user before
> proceeding.
