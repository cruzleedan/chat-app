"""Document management API routes."""

import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.config import settings
from app.core.document_processor import document_processor
from app.core.vectorstore import vectorstore_manager
from app.core.logging import logger
from app.models.schemas import (
    DocumentDeleteResponse,
    DocumentListResponse,
    DocumentMetadata,
    DocumentUploadResponse,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and index a document.

    Supported file types: PDF, TXT, MD, DOCX, HTML
    """
    # Validate file
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    if not document_processor.is_supported(file.filename):
        logger.warning(f"Rejected unsupported file type: {file.filename}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Supported: {document_processor.SUPPORTED_EXTENSIONS}",
        )

    # Generate unique ID for this document
    document_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix.lower()

    # Save file to disk
    file_path = settings.upload_path / f"{document_id}{file_ext}"

    try:
        logger.info(f"📄 Processing upload: {file.filename}")
        content = await file.read()
        file_size = len(content)

        with open(file_path, "wb") as f:
            f.write(content)

        # Process and index the document
        chunks = document_processor.process_file(file_path, document_id, file.filename)
        vectorstore_manager.add_documents(chunks)

        logger.info(f"✅ Indexed {file.filename}: {len(chunks)} chunks created")

        # Create response metadata
        metadata = DocumentMetadata(
            id=document_id,
            filename=file.filename,
            file_type=file_ext,
            file_size=file_size,
            chunk_count=len(chunks),
            indexed_at=datetime.now(),
        )

        return DocumentUploadResponse(
            message=f"Document '{file.filename}' uploaded and indexed successfully",
            document=metadata,
        )

    except Exception as e:
        logger.error(f"❌ Failed to process {file.filename}: {e}", exc_info=True)
        # Clean up file if processing failed
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}",
        )


@router.get("", response_model=DocumentListResponse)
async def list_documents():
    """List all indexed documents."""
    docs = vectorstore_manager.list_documents()

    # Convert to response format
    documents = []
    for doc in docs:
        # Try to find the original file to get size
        file_size = 0
        for ext in document_processor.SUPPORTED_EXTENSIONS:
            file_path = settings.upload_path / f"{doc['document_id']}{ext}"
            if file_path.exists():
                file_size = file_path.stat().st_size
                file_type = ext
                break
        else:
            file_type = ".unknown"

        documents.append(
            DocumentMetadata(
                id=doc["document_id"],
                filename=doc["filename"],
                file_type=file_type,
                file_size=file_size,
                chunk_count=doc["chunk_count"],
                indexed_at=datetime.now(),  # We don't store this, so use now
            )
        )

    return DocumentListResponse(documents=documents, total=len(documents))


@router.get("/{document_id}/content")
async def get_document_content(document_id: str):
    """Get the content of a document."""
    # Check if document exists
    if not vectorstore_manager.document_exists(document_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found",
        )
    
    # Find and read the file
    for ext in document_processor.SUPPORTED_EXTENSIONS:
        file_path = settings.upload_path / f"{document_id}{ext}"
        if file_path.exists():
            try:
                # For text-based files, read directly
                if ext in {".txt", ".md"}:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    return {"content": content, "type": "text"}
                
                # For other files, use document processor to extract text
                documents = document_processor.load_document(file_path)
                content = "\n\n---\n\n".join([doc.page_content for doc in documents])
                return {"content": content, "type": "text"}
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to read document: {str(e)}",
                )
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Document file not found on disk",
    )


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
async def delete_document(document_id: str):
    """Delete a document from the index and disk."""
    # Check if document exists
    if not vectorstore_manager.document_exists(document_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found",
        )

    # Delete from vector store
    chunks_deleted = vectorstore_manager.delete_document(document_id)

    # Delete file from disk
    for ext in document_processor.SUPPORTED_EXTENSIONS:
        file_path = settings.upload_path / f"{document_id}{ext}"
        if file_path.exists():
            file_path.unlink()
            break

    return DocumentDeleteResponse(
        message=f"Document deleted successfully ({chunks_deleted} chunks removed)",
        document_id=document_id,
    )
