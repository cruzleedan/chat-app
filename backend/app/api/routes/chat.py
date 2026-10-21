"""Chat API routes for RAG Q&A."""

import json
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.rag import rag_pipeline
from app.core.vectorstore import vectorstore_manager
from app.core.conversation import conversation_manager
from app.core.logging import logger
from app.core.tone import presets_payload
from app.models.schemas import (
    ChatRequest, 
    ChatResponse, 
    ConversationListResponse, 
    ConversationInfo
)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/tone")
async def tone_options():
    """The tone presets and options, so the UI does not hard-code them."""
    return presets_payload()


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Ask a question about the uploaded documents.

    The system will:
    1. Search for relevant document chunks
    2. Use them as context for the LLM
    3. Generate an answer with source citations
    4. Maintain conversation history if conversation_id is provided
    """
    # Check if there are any documents indexed
    docs = vectorstore_manager.list_documents()
    if not docs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No documents have been uploaded yet. Please upload documents first.",
        )

    try:
        logger.info(f"💬 Question: {request.question[:100]}...")
        response, conversation_id = rag_pipeline.query(
            request.question, 
            request.conversation_id,
            request.document_ids,
            request.tone,
        )
        logger.info(f"✅ Generated response with {len(response.sources)} sources")
        return response
    except Exception as e:
        logger.error(f"❌ Chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process question: {str(e)}",
        )


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Ask a question with streaming response (Server-Sent Events).
    
    Returns tokens as they are generated, with sources at the end.
    """
    # Check if there are any documents indexed
    docs = vectorstore_manager.list_documents()
    if not docs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No documents have been uploaded yet. Please upload documents first.",
        )

    logger.info(f"🔄 Streaming question: {request.question[:100]}...")

    def generate():
        """Generator for SSE stream."""
        try:
            for token, sources, conv_id in rag_pipeline.query_stream(
                request.question,
                request.conversation_id,
                request.document_ids,
                request.tone,
            ):
                if sources is not None:
                    # Final message with sources
                    data = {
                        "type": "sources",
                        "sources": [s.model_dump() for s in sources],
                        "conversation_id": conv_id
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                    logger.info(f"✅ Stream complete with {len(sources)} sources")
                elif token:
                    # Token chunk
                    data = {"type": "token", "content": token}
                    yield f"data: {json.dumps(data)}\n\n"
            
            # Send done signal
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error(f"❌ Stream error: {e}", exc_info=True)
            error_data = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations():
    """List all active conversations."""
    conversations = conversation_manager.list_conversations()
    return ConversationListResponse(
        conversations=[ConversationInfo(**c) for c in conversations],
        total=len(conversations)
    )


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a full conversation with all messages."""
    messages = conversation_manager.get_conversation_messages(conversation_id)
    if messages is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )
    conv = conversation_manager.get_conversation(conversation_id)
    return {
        "id": conversation_id,
        "title": conv.title if conv else "Unknown",
        "messages": messages,
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation by ID."""
    success = conversation_manager.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )
    return {"message": f"Conversation {conversation_id} deleted", "success": True}
