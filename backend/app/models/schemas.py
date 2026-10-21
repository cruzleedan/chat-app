"""Pydantic schemas for API request/response models."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.core.tone import Tone


# ============== Document Schemas ==============

class DocumentMetadata(BaseModel):
    """Metadata for an indexed document."""

    id: str = Field(..., description="Unique document identifier")
    filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="File extension/type")
    file_size: int = Field(..., description="File size in bytes")
    chunk_count: int = Field(..., description="Number of chunks created")
    indexed_at: datetime = Field(..., description="When the document was indexed")


class DocumentListResponse(BaseModel):
    """Response for listing documents."""

    documents: List[DocumentMetadata]
    total: int


class DocumentUploadResponse(BaseModel):
    """Response after uploading a document."""

    message: str
    document: DocumentMetadata


class DocumentDeleteResponse(BaseModel):
    """Response after deleting a document."""

    message: str
    document_id: str


# ============== Chat Schemas ==============

class ChatRequest(BaseModel):
    """Request for asking a question."""

    question: str = Field(..., min_length=1, description="The question to ask")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for follow-up questions")
    document_ids: Optional[List[str]] = Field(None, description="List of document IDs to search in (if None, search all)")
    tone: Optional[Tone] = Field(None, description="How the answer should sound (default: neutral)")


class SourceDocument(BaseModel):
    """A source document chunk used in the response."""

    content: str = Field(..., description="The text content of the chunk")
    filename: str = Field(..., description="Source filename")
    page: Optional[int] = Field(None, description="Page number if applicable")
    chunk_id: str = Field(..., description="Unique chunk identifier")


class ChatResponse(BaseModel):
    """Response to a chat question."""

    answer: str = Field(..., description="The generated answer")
    sources: List[SourceDocument] = Field(
        default_factory=list, description="Source documents used"
    )
    question: str = Field(..., description="The original question")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for follow-up questions")


class ConversationInfo(BaseModel):
    """Information about a conversation."""
    
    id: str = Field(..., description="Conversation ID")
    title: str = Field("New Conversation", description="Conversation title")
    message_count: int = Field(..., description="Number of messages in conversation")
    created_at: str = Field(..., description="When conversation was created")
    updated_at: str = Field(..., description="When conversation was last updated")
    preview: Optional[str] = Field(None, description="Preview of the first message")


class ConversationListResponse(BaseModel):
    """Response listing all conversations."""
    
    conversations: List[ConversationInfo]
    total: int


# ============== Health Check ==============

class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    version: str = "0.2.0"
