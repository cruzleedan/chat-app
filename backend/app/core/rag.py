"""RAG pipeline for question answering."""

from typing import Dict, Generator, List, Optional
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.documents import Document

from app.config import settings
from app.core.vectorstore import vectorstore_manager
from app.core.conversation import conversation_manager, Conversation
from app.core.tone import Tone, build_system_prompt, resolve, temperature_for
from app.models.schemas import ChatResponse, SourceDocument


class RAGPipeline:
    """RAG pipeline for document question answering."""

    def __init__(self):
        """Initialize the RAG pipeline."""
        self._llms: Dict[float, ChatOllama] = {}

    def llm_for(self, tone: Optional[Tone]) -> ChatOllama:
        """The LLM for this tone. The tone sets the temperature; instances are cached per value."""
        temperature = temperature_for(
            resolve(tone), settings.llm_temperature, settings.llm_temperature_max
        )
        if temperature not in self._llms:
            self._llms[temperature] = ChatOllama(
                model=settings.llm_model,
                base_url=settings.ollama_host,
                temperature=temperature,
                num_predict=settings.llm_num_predict,
                top_k=settings.llm_top_k,
                top_p=settings.llm_top_p,
            )
        return self._llms[temperature]

    @staticmethod
    def _messages(context: str, history: str, question: str, tone: Optional[Tone]):
        """The chat messages: system (rules, style, context, history), then the question."""
        return [
            SystemMessage(content=build_system_prompt(context, history, tone)),
            HumanMessage(content=question),
        ]

    @staticmethod
    def _source_label(doc: Document, number: int) -> str:
        """`[Source 1: report.pdf, page 3]`. Only PDFs and slides have a meaningful page."""
        filename = doc.metadata.get("filename", "unknown")
        page = doc.metadata.get("page")
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        where = ""
        if isinstance(page, int):
            if extension == "pdf":
                where = f", page {page + 1}"  # PyPDF pages are zero-based
            elif extension in ("ppt", "pptx") and page > 0:
                where = f", slide {page}"
        return f"[Source {number}: {filename}{where}]"

    def _format_docs(self, docs: List[Document]) -> str:
        """Format documents into a single context string."""
        formatted = [
            f"{self._source_label(doc, i)}\n{doc.page_content}" for i, doc in enumerate(docs, 1)
        ]
        return "\n\n---\n\n".join(formatted)

    def _docs_to_sources(self, docs: List[Document]) -> List[SourceDocument]:
        """Convert Documents to SourceDocument schemas."""
        return [
            SourceDocument(
                content=doc.page_content[:500] + "..." if len(doc.page_content) > 500 else doc.page_content,
                filename=doc.metadata.get("filename", "unknown"),
                page=doc.metadata.get("page"),
                chunk_id=doc.metadata.get("chunk_id", "unknown"),
            )
            for doc in docs
        ]

    def query(
        self, 
        question: str, 
        conversation_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        tone: Optional[Tone] = None,
    ) -> tuple[ChatResponse, str]:
        """
        Process a question through the RAG pipeline.

        Args:
            question: The user's question
            conversation_id: Optional ID for conversation continuity
            document_ids: Optional list of document IDs to filter search
            tone: Optional tone profile (default: neutral)

        Returns:
            Tuple of (ChatResponse with answer and sources, conversation_id)
        """
        # Get or create conversation
        conversation = conversation_manager.get_or_create_conversation(conversation_id)
        
        # Retrieve relevant documents with optional filter
        retriever = vectorstore_manager.get_retriever(document_ids=document_ids)
        docs = retriever.invoke(question)

        if not docs:
            answer = "I couldn't find any relevant information in the uploaded documents to answer your question. Please make sure you've uploaded documents that contain information related to your question."
            conversation.add_message("user", question)
            conversation.add_message("assistant", answer)
            conversation_manager.update_conversation(conversation)
            return ChatResponse(
                answer=answer,
                sources=[],
                question=question,
                conversation_id=conversation.id,
            ), conversation.id

        # Get conversation history
        history = conversation.get_history_text(max_messages=6)

        messages = self._messages(self._format_docs(docs), history, question, tone)

        answer = self.llm_for(tone).invoke(messages).content
        
        # Update conversation history
        conversation.add_message("user", question)
        conversation.add_message("assistant", answer)
        conversation_manager.update_conversation(conversation)

        return ChatResponse(
            answer=answer,
            sources=self._docs_to_sources(docs),
            question=question,
            conversation_id=conversation.id,
        ), conversation.id

    def query_stream(
        self, 
        question: str, 
        conversation_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        tone: Optional[Tone] = None,
    ) -> Generator[tuple[str, Optional[List[SourceDocument]], str], None, None]:
        """
        Process a question with streaming response.

        Args:
            question: The user's question
            conversation_id: Optional ID for conversation continuity
            document_ids: Optional list of document IDs to filter search
            tone: Optional tone profile (default: neutral)

        Yields:
            Tuples of (token, sources_if_done, conversation_id)
            Sources are only yielded with the final token
        """
        # Get or create conversation
        conversation = conversation_manager.get_or_create_conversation(conversation_id)
        
        # Retrieve relevant documents with optional filter
        retriever = vectorstore_manager.get_retriever(document_ids=document_ids)
        docs = retriever.invoke(question)

        if not docs:
            answer = "I couldn't find any relevant information in the uploaded documents."
            conversation.add_message("user", question)
            conversation.add_message("assistant", answer)
            conversation_manager.update_conversation(conversation)
            yield answer, [], conversation.id
            return

        # Get conversation history
        history = conversation.get_history_text(max_messages=6)

        messages = self._messages(self._format_docs(docs), history, question, tone)

        # Stream the response
        full_response = []
        for chunk in self.llm_for(tone).stream(messages):
            token = chunk.content
            full_response.append(token)
            yield token, None, conversation.id
        
        # Update conversation history with complete response
        complete_answer = "".join(full_response)
        conversation.add_message("user", question)
        conversation.add_message("assistant", complete_answer)
        conversation_manager.update_conversation(conversation)
        
        # Yield sources at the end
        yield "", self._docs_to_sources(docs), conversation.id


# Global instance
rag_pipeline = RAGPipeline()
