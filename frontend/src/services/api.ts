// Generate API URL dynamically based on current domain
const API_BASE_URL = `${window.location.origin}/api`;

export interface DocumentMetadata {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  indexed_at: string;
}

export interface SourceDocument {
  content: string;
  filename: string;
  page: number | null;
  chunk_id: string;
}

export interface ChatResponse {
  answer: string;
  sources: SourceDocument[];
  question: string;
  conversation_id?: string;
}

export type TonePreset = 'neutral' | 'concise' | 'friendly' | 'playful' | 'sassy' | 'custom';

export interface Tone {
  preset: TonePreset;
  formality: 'casual' | 'balanced' | 'formal';
  length: 'brief' | 'standard' | 'detailed';
  humor: 'none' | 'light' | 'lots';
  format: 'prose' | 'bullets';
  note: string;
}

export interface TonePresetInfo {
  id: Exclude<TonePreset, 'custom'>;
  label: string;
  description: string;
  formality: Tone['formality'];
  length: Tone['length'];
  humor: Tone['humor'];
  format: Tone['format'];
}

export interface ToneConfig {
  default: Tone;
  presets: TonePresetInfo[];
  options: Record<'formality' | 'length' | 'humor' | 'format', string[]>;
  note_max_length: number;
}

export interface DocumentListResponse {
  documents: DocumentMetadata[];
  total: number;
}

export interface StreamEvent {
  type: 'token' | 'sources' | 'done' | 'error';
  content?: string;
  sources?: SourceDocument[];
  conversation_id?: string;
  message?: string;
}

export interface ConversationInfo {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  preview?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: ConversationMessage[];
}

// FastAPI sends a string for most errors and a list of problems for a 422.
function formatDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d && typeof d === 'object' && 'msg' in d ? String(d.msg) : String(d))).join('; ');
  }
  return '';
}

export const api = {
  async uploadDocument(file: File): Promise<{ message: string; document: DocumentMetadata }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  },

  async listDocuments(): Promise<DocumentListResponse> {
    const response = await fetch(`${API_BASE_URL}/documents`);

    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    return response.json();
  },

  async deleteDocument(documentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Delete failed');
    }
  },

  async getDocumentContent(documentId: string): Promise<{ content: string; type: string }> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/content`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get document content');
    }

    return response.json();
  },

  async getToneConfig(): Promise<ToneConfig> {
    const response = await fetch(`${API_BASE_URL}/chat/tone`);

    if (!response.ok) {
      throw new Error('Failed to fetch tone options');
    }

    return response.json();
  },

  async chat(
    question: string,
    conversationId?: string,
    documentIds?: string[],
    tone?: Tone
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, conversation_id: conversationId, document_ids: documentIds, tone }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(formatDetail(error.detail) || 'Chat request failed');
    }

    return response.json();
  },

  async *chatStream(
    question: string,
    conversationId?: string,
    documentIds?: string[],
    tone?: Tone
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, conversation_id: conversationId, document_ids: documentIds, tone }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(formatDetail(error.detail) || 'Stream request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data as StreamEvent;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  },

  async listConversations(): Promise<{ conversations: ConversationInfo[]; total: number }> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations`);

    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }

    return response.json();
  },

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch conversation');
    }

    return response.json();
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Delete failed');
    }
  },
};
