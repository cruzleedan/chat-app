"""Conversation memory management for chat history."""

from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
import uuid
import json

from app.config import settings


@dataclass
class Message:
    """A single message in a conversation."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict:
        return {"role": self.role, "content": self.content, "timestamp": self.timestamp}
    
    @classmethod
    def from_dict(cls, data: Dict) -> "Message":
        return cls(role=data["role"], content=data["content"], timestamp=data.get("timestamp", datetime.now().isoformat()))


@dataclass
class Conversation:
    """A conversation with history."""
    id: str
    title: str = "New Conversation"
    messages: List[Message] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def add_message(self, role: str, content: str) -> Message:
        """Add a message to the conversation."""
        message = Message(role=role, content=content)
        self.messages.append(message)
        self.updated_at = datetime.now().isoformat()
        
        # Auto-generate title from first user message
        if self.title == "New Conversation" and role == "user":
            self.title = content[:50] + ("..." if len(content) > 50 else "")
        
        return message
    
    def get_history_text(self, max_messages: int = 10) -> str:
        """Get conversation history as formatted text."""
        recent = self.messages[-max_messages:] if len(self.messages) > max_messages else self.messages
        history_parts = []
        for msg in recent:
            prefix = "Human" if msg.role == "user" else "Assistant"
            history_parts.append(f"{prefix}: {msg.content}")
        return "\n".join(history_parts)
    
    def get_messages_for_prompt(self, max_messages: int = 10) -> List[Dict[str, str]]:
        """Get recent messages formatted for LLM prompt."""
        recent = self.messages[-max_messages:] if len(self.messages) > max_messages else self.messages
        return [{"role": msg.role, "content": msg.content} for msg in recent]
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "title": self.title,
            "messages": [m.to_dict() for m in self.messages],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "Conversation":
        conv = cls(
            id=data["id"],
            title=data.get("title", "New Conversation"),
            created_at=data.get("created_at", datetime.now().isoformat()),
            updated_at=data.get("updated_at", datetime.now().isoformat()),
        )
        conv.messages = [Message.from_dict(m) for m in data.get("messages", [])]
        return conv


class ConversationManager:
    """Manages multiple conversations with persistent JSON storage."""
    
    def __init__(self, max_conversations: int = 100):
        """Initialize the conversation manager."""
        self._conversations: Dict[str, Conversation] = {}
        self._max_conversations = max_conversations
        self._storage_path = Path(settings.chroma_path).parent / "conversations.json"
        self._load_conversations()
    
    def _load_conversations(self):
        """Load conversations from disk."""
        if self._storage_path.exists():
            try:
                with open(self._storage_path, "r") as f:
                    data = json.load(f)
                    for conv_data in data.get("conversations", []):
                        conv = Conversation.from_dict(conv_data)
                        self._conversations[conv.id] = conv
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Warning: Could not load conversations: {e}")
    
    def _save_conversations(self):
        """Save conversations to disk."""
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "conversations": [conv.to_dict() for conv in self._conversations.values()]
        }
        with open(self._storage_path, "w") as f:
            json.dump(data, f, indent=2)
    
    def create_conversation(self) -> Conversation:
        """Create a new conversation."""
        # Clean up old conversations if we're at capacity
        if len(self._conversations) >= self._max_conversations:
            self._cleanup_old_conversations()
        
        conversation_id = str(uuid.uuid4())
        conversation = Conversation(id=conversation_id)
        self._conversations[conversation_id] = conversation
        self._save_conversations()
        return conversation
    
    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get a conversation by ID."""
        return self._conversations.get(conversation_id)
    
    def get_or_create_conversation(self, conversation_id: Optional[str] = None) -> Conversation:
        """Get existing conversation or create a new one."""
        if conversation_id and conversation_id in self._conversations:
            return self._conversations[conversation_id]
        return self.create_conversation()
    
    def update_conversation(self, conversation: Conversation):
        """Save an updated conversation."""
        self._conversations[conversation.id] = conversation
        self._save_conversations()
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        if conversation_id in self._conversations:
            del self._conversations[conversation_id]
            self._save_conversations()
            return True
        return False
    
    def list_conversations(self) -> List[Dict]:
        """List all conversations with metadata."""
        return [
            {
                "id": conv.id,
                "title": conv.title,
                "message_count": len(conv.messages),
                "created_at": conv.created_at,
                "updated_at": conv.updated_at,
                "preview": conv.messages[0].content[:100] if conv.messages else None,
            }
            for conv in sorted(
                self._conversations.values(),
                key=lambda c: c.updated_at,
                reverse=True
            )
        ]
    
    def get_conversation_messages(self, conversation_id: str) -> Optional[List[Dict]]:
        """Get all messages for a conversation."""
        conv = self._conversations.get(conversation_id)
        if conv:
            return [m.to_dict() for m in conv.messages]
        return None
    
    def _cleanup_old_conversations(self):
        """Remove oldest conversations when at capacity."""
        if not self._conversations:
            return
        
        # Sort by updated_at and keep only the most recent half
        sorted_convs = sorted(
            self._conversations.items(),
            key=lambda x: x[1].updated_at
        )
        
        # Remove the oldest half
        to_remove = len(sorted_convs) // 2
        for conv_id, _ in sorted_convs[:to_remove]:
            del self._conversations[conv_id]
        
        self._save_conversations()


# Global instance
conversation_manager = ConversationManager()
