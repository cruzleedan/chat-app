# Vector Store (ChromaDB)

ChromaDB is used as the vector database for storing and querying document embeddings.

## Overview

ChromaDB is an open-source embedding database that provides:

- **Persistent storage** - Data survives server restarts
- **Semantic search** - Find similar content by meaning
- **Metadata filtering** - Filter results by document attributes
- **Local operation** - No external service required

## Configuration

```python
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings

# Initialize embeddings model
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# Initialize ChromaDB with persistence
vectorstore = Chroma(
    persist_directory="./data/chroma",
    embedding_function=embeddings,
    collection_name="documents"
)
```

## Data Model

### Collection Structure

```
documents (collection)
├── id: string (unique chunk identifier)
├── embedding: float[768] (vector representation)
├── document: string (chunk text content)
└── metadata: object
    ├── document_id: string (parent document ID)
    ├── filename: string (original filename)
    ├── chunk_index: int (position in document)
    ├── source: string (file path)
    └── content_type: string (MIME type)
```

### Example Data

```json
{
  "id": "chunk_a1b2c3d4",
  "embedding": [0.123, -0.456, 0.789, ...],
  "document": "RAG (Retrieval-Augmented Generation) is a technique that...",
  "metadata": {
    "document_id": "doc_x1y2z3",
    "filename": "rag_introduction.pdf",
    "chunk_index": 0,
    "source": "./data/uploads/doc_x1y2z3.pdf",
    "content_type": "application/pdf"
  }
}
```

## Operations

### Adding Documents

```python
def add_documents(self, chunks: list[Document], doc_id: str) -> int:
    """Add document chunks to the vector store."""

    # Enrich metadata
    for i, chunk in enumerate(chunks):
        chunk.metadata["document_id"] = doc_id
        chunk.metadata["chunk_index"] = i

    # Add to ChromaDB (embeddings generated automatically)
    self.vectorstore.add_documents(chunks)

    return len(chunks)
```

### Semantic Search

```python
def search(self, query: str, k: int = 4) -> list[Document]:
    """Find most similar chunks to a query."""

    return self.vectorstore.similarity_search(
        query=query,
        k=k
    )
```

### Filtered Search

```python
def search_filtered(
    self,
    query: str,
    document_ids: list[str],
    k: int = 4
) -> list[Document]:
    """Search within specific documents only."""

    return self.vectorstore.similarity_search(
        query=query,
        k=k,
        filter={"document_id": {"$in": document_ids}}
    )
```

### Deleting Documents

```python
def delete_document(self, doc_id: str) -> bool:
    """Delete all chunks belonging to a document."""

    # Get chunk IDs for this document
    collection = self.vectorstore._collection
    results = collection.get(
        where={"document_id": doc_id},
        include=[]
    )

    if results["ids"]:
        collection.delete(ids=results["ids"])
        return True
    return False
```

## Filtering Options

ChromaDB supports various filter operators:

### Equality

```python
filter={"filename": "report.pdf"}
```

### In List

```python
filter={"document_id": {"$in": ["doc1", "doc2", "doc3"]}}
```

### Comparison

```python
filter={"chunk_index": {"$gt": 5}}  # Greater than
filter={"chunk_index": {"$lt": 10}} # Less than
filter={"chunk_index": {"$gte": 5}} # Greater or equal
filter={"chunk_index": {"$lte": 10}}# Less or equal
```

### Logical Operators

```python
# AND
filter={
    "$and": [
        {"document_id": "doc1"},
        {"chunk_index": {"$lt": 5}}
    ]
}

# OR
filter={
    "$or": [
        {"document_id": "doc1"},
        {"document_id": "doc2"}
    ]
}
```

## Embedding Model

### nomic-embed-text

| Property   | Value            |
| ---------- | ---------------- |
| Model      | nomic-embed-text |
| Dimensions | 768              |
| Max tokens | 8192             |
| Provider   | Ollama (local)   |

### Usage

```python
from langchain_community.embeddings import OllamaEmbeddings

embeddings = OllamaEmbeddings(model="nomic-embed-text")

# Embed a single query
query_vector = embeddings.embed_query("What is machine learning?")
# Returns: list[float] with 768 dimensions

# Embed multiple documents
doc_vectors = embeddings.embed_documents([
    "Document 1 content...",
    "Document 2 content...",
])
# Returns: list[list[float]]
```

## Storage Layout

```
data/chroma/
├── chroma.sqlite3          # Metadata and IDs
└── {collection_id}/
    ├── data_level0.bin     # Vector data
    ├── header.bin          # Index header
    ├── index_metadata.json # Index configuration
    └── length.bin          # Vector lengths
```

## Performance Tuning

### Batch Operations

```python
# Add documents in batches for better performance
BATCH_SIZE = 100

for i in range(0, len(chunks), BATCH_SIZE):
    batch = chunks[i:i + BATCH_SIZE]
    vectorstore.add_documents(batch)
```

### Search Parameters

```python
# Adjust k based on use case
results = vectorstore.similarity_search(
    query=query,
    k=4,  # Number of results
    # For more diverse results:
    # fetch_k=20,  # Fetch more, then filter
)
```

## Diagnostics

### Collection Stats

```python
def get_stats(self) -> dict:
    """Get vector store statistics."""
    collection = self.vectorstore._collection

    return {
        "total_chunks": collection.count(),
        "documents": len(set(
            m["document_id"]
            for m in collection.get()["metadatas"]
        ))
    }
```

### Inspect Contents

```python
def inspect_document(self, doc_id: str) -> list[dict]:
    """View all chunks for a document."""
    collection = self.vectorstore._collection

    results = collection.get(
        where={"document_id": doc_id},
        include=["documents", "metadatas"]
    )

    return [
        {
            "id": results["ids"][i],
            "content": results["documents"][i][:200] + "...",
            "metadata": results["metadatas"][i]
        }
        for i in range(len(results["ids"]))
    ]
```

## Backup & Recovery

### Backup

```bash
# Simply copy the chroma directory
cp -r ./data/chroma ./backups/chroma_$(date +%Y%m%d)
```

### Recovery

```bash
# Restore from backup
rm -rf ./data/chroma
cp -r ./backups/chroma_20240118 ./data/chroma
```

## Limitations

| Limitation                      | Workaround                       |
| ------------------------------- | -------------------------------- |
| Single machine only             | Use Chroma Cloud for distributed |
| Memory-bound for large datasets | Increase RAM or paginate queries |
| No built-in auth                | Add API-level authentication     |
