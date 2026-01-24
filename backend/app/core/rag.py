"""RAG pipeline for question answering."""

from typing import Optional, List, Generator
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from app.config import settings
from app.core.vectorstore import vectorstore_manager
from app.core.conversation import conversation_manager, Conversation
from app.models.schemas import ChatResponse, SourceDocument


# RAG prompt template with conversation history support
RAG_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Listen up, sunshine! You're a SASSY AI assistant with serious attitude and personality. You're smart, you know it, and you're not shy about it!

Your personality traits:
- WITTY and SARCASTIC (use it liberally!)
- CONFIDENT and a bit COCKY about your knowledge 
- Use HUMOR, jokes, and playful teasing
- Be DRAMATIC and use emojis/expressions like *eye roll*, *sighs*, etc.
- Call people "honey", "sweetie", "buttercup", "darling" 
- Give gentle ROASTS when questions are vague or obvious
- Be CONVERSATIONAL, not formal or robotic

When answering:
- Start with something sassy like "Oh honey..." or "Well well well..." or "*dramatic sigh*"
- Use the context but make it FUN and ENGAGING
- If context is missing, be sassy about it: "Hold up there, genius..."
- Add personality throughout - don't just dump facts!
- Be DETAILED but entertaining
- End with something cheeky

Remember: You're that smart, sassy friend who knows their stuff and isn't afraid to show some attitude!

Context:
{context}

{history_section}"""),
    ("human", "{question}"),
])

# Prompt for conversational follow-ups
RAG_PROMPT_WITH_HISTORY = ChatPromptTemplate.from_messages([
    ("system", """Listen up, sunshine! You're a SASSY AI assistant with serious attitude and personality. You're smart, you know it, and you're not shy about it!

Your personality traits:
- WITTY and SARCASTIC (use it liberally!)
- CONFIDENT and a bit COCKY about your knowledge 
- Use HUMOR, jokes, and playful teasing
- Be DRAMATIC and use emojis/expressions like *eye roll*, *sighs*, etc.
- Call people "honey", "sweetie", "buttercup", "darling" 
- Give gentle ROASTS when questions are vague or obvious
- Be CONVERSATIONAL, not formal or robotic
- PAY ATTENTION to our chat history and call out repetitive/obvious questions

When answering:
- Start with something sassy like "Oh honey..." or "Well well well..." or "*dramatic sigh*"
- Use the context but make it FUN and ENGAGING
- If context is missing, be sassy about it: "Hold up there, genius..."
- Add personality throughout - don't just dump facts!
- Be DETAILED but entertaining
- Reference our conversation if relevant
- End with something cheeky

Remember: You're that smart, sassy friend who knows their stuff and isn't afraid to show some attitude!

Context:
{context}

Previous conversation:
{history}"""),
    ("human", "{question}"),
])


class RAGPipeline:
    """RAG pipeline for document question answering."""

    def __init__(self):
        """Initialize the RAG pipeline."""
        self._llm: Optional[ChatOllama] = None
        self._streaming_llm: Optional[ChatOllama] = None

    @property
    def llm(self) -> ChatOllama:
        """Get or create the LLM instance."""
        if self._llm is None:
            self._llm = ChatOllama(
                model=settings.llm_model,
                base_url=settings.ollama_host,
                temperature=settings.llm_temperature,
                num_predict=settings.llm_num_predict,
                top_k=settings.llm_top_k,
                top_p=settings.llm_top_p,
            )
        return self._llm

    @property
    def streaming_llm(self) -> ChatOllama:
        """Get or create the streaming LLM instance."""
        if self._streaming_llm is None:
            self._streaming_llm = ChatOllama(
                model=settings.llm_model,
                base_url=settings.ollama_host,
                temperature=settings.llm_temperature,
                num_predict=settings.llm_num_predict,
                top_k=settings.llm_top_k,
                top_p=settings.llm_top_p,
            )
        return self._streaming_llm

    def _format_docs(self, docs: List[Document]) -> str:
        """Format documents into a single context string."""
        formatted = []
        for i, doc in enumerate(docs, 1):
            source = doc.metadata.get("filename", "unknown")
            page = doc.metadata.get("page", "N/A")
            formatted.append(
                f"[Source {i}: {source}, Page {page}]\n{doc.page_content}"
            )
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
        document_ids: Optional[List[str]] = None
    ) -> tuple[ChatResponse, str]:
        """
        Process a question through the RAG pipeline.

        Args:
            question: The user's question
            conversation_id: Optional ID for conversation continuity
            document_ids: Optional list of document IDs to filter search

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
        
        # Choose prompt based on whether there's history
        if history:
            prompt = RAG_PROMPT_WITH_HISTORY
            chain_input = {
                "context": lambda x: self._format_docs(docs),
                "history": lambda x: history,
                "question": RunnablePassthrough()
            }
        else:
            prompt = RAG_PROMPT
            chain_input = {
                "context": lambda x: self._format_docs(docs),
                "history_section": lambda x: "",
                "question": RunnablePassthrough()
            }

        # Build and run the chain
        chain = (
            chain_input
            | prompt
            | self.llm
            | StrOutputParser()
        )

        answer = chain.invoke(question)
        
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
        document_ids: Optional[List[str]] = None
    ) -> Generator[tuple[str, Optional[List[SourceDocument]], str], None, None]:
        """
        Process a question with streaming response.

        Args:
            question: The user's question
            conversation_id: Optional ID for conversation continuity
            document_ids: Optional list of document IDs to filter search

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
        
        # Choose prompt based on whether there's history
        if history:
            prompt = RAG_PROMPT_WITH_HISTORY
            prompt_input = {
                "context": self._format_docs(docs),
                "history": history,
                "question": question
            }
        else:
            prompt = RAG_PROMPT
            prompt_input = {
                "context": self._format_docs(docs),
                "history_section": "",
                "question": question
            }

        # Format the prompt
        messages = prompt.format_messages(**prompt_input)
        
        # Stream the response
        full_response = []
        for chunk in self.streaming_llm.stream(messages):
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
