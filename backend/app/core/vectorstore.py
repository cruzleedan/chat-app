"""ChromaDB vector store management."""

from typing import Optional, List
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document

from app.config import settings


class VectorStoreManager:
    """Manages ChromaDB vector store operations."""

    COLLECTION_NAME = "documents"

    def __init__(self):
        """Initialize the vector store manager."""
        self._vectorstore: Optional[Chroma] = None
        self._embeddings: Optional[OllamaEmbeddings] = None
        self._client: Optional[chromadb.PersistentClient] = None

    @property
    def embeddings(self) -> OllamaEmbeddings:
        """Get or create embeddings instance."""
        if self._embeddings is None:
            self._embeddings = OllamaEmbeddings(
                model=settings.ollama_embedding_model,
                base_url=settings.ollama_base_url,
            )
        return self._embeddings

    @property
    def client(self) -> chromadb.PersistentClient:
        """Get or create ChromaDB client."""
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=str(settings.chroma_path),
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return self._client

    @property
    def vectorstore(self) -> Chroma:
        """Get or create the vector store."""
        if self._vectorstore is None:
            self._vectorstore = Chroma(
                client=self.client,
                collection_name=self.COLLECTION_NAME,
                embedding_function=self.embeddings,
            )
        return self._vectorstore

    def add_documents(self, documents: List[Document]) -> List[str]:
        """
        Add documents to the vector store.

        Args:
            documents: List of Document objects to add

        Returns:
            List of document IDs
        """
        ids = [doc.metadata.get("chunk_id", str(i)) for i, doc in enumerate(documents)]
        self.vectorstore.add_documents(documents, ids=ids)
        return ids

    def delete_document(self, document_id: str) -> int:
        """
        Delete all chunks belonging to a document.

        Args:
            document_id: The document ID to delete

        Returns:
            Number of chunks deleted
        """
        # Get the collection directly to perform filtered delete
        collection = self.client.get_collection(self.COLLECTION_NAME)

        # Find all chunks with this document_id
        results = collection.get(
            where={"document_id": document_id},
            include=["metadatas"],
        )

        if results["ids"]:
            collection.delete(ids=results["ids"])
            return len(results["ids"])

        return 0

    def similarity_search(
        self, query: str, k: Optional[int] = None
    ) -> List[Document]:
        """
        Search for similar documents.

        Args:
            query: Search query
            k: Number of results (defaults to settings.top_k_results)

        Returns:
            List of similar documents
        """
        k = k or settings.top_k_results
        return self.vectorstore.similarity_search(query, k=k)

    def get_retriever(self, k: Optional[int] = None, document_ids: Optional[List[str]] = None):
        """
        Get a retriever for use in chains.

        Args:
            k: Number of results to retrieve
            document_ids: Optional list of document IDs to filter by

        Returns:
            VectorStoreRetriever
        """
        k = k or settings.top_k_results
        search_kwargs = {"k": k}
        
        # Add document filter if specified
        if document_ids:
            search_kwargs["filter"] = {"document_id": {"$in": document_ids}}
        
        return self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs=search_kwargs,
        )

    def list_documents(self) -> List[dict]:
        """
        List all unique documents in the store.

        Returns:
            List of document metadata dictionaries
        """
        collection = self.client.get_collection(self.COLLECTION_NAME)

        # Get all documents
        results = collection.get(include=["metadatas"])

        # Group by document_id to get unique documents
        documents = {}
        for metadata in results["metadatas"]:
            doc_id = metadata.get("document_id")
            if doc_id and doc_id not in documents:
                documents[doc_id] = {
                    "document_id": doc_id,
                    "filename": metadata.get("filename", "unknown"),
                    "chunk_count": 0,
                }
            if doc_id:
                documents[doc_id]["chunk_count"] += 1

        return list(documents.values())

    def document_exists(self, document_id: str) -> bool:
        """Check if a document exists in the store."""
        collection = self.client.get_collection(self.COLLECTION_NAME)
        results = collection.get(
            where={"document_id": document_id},
            limit=1,
        )
        return len(results["ids"]) > 0


# Global instance
vectorstore_manager = VectorStoreManager()
