import { useState, useEffect, useCallback, useRef } from 'react';
import { api, DocumentMetadata, SourceDocument } from './services/api';
import { Message } from './types';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { ConversationList } from './components/ConversationList';
import { DocumentPanel } from './components/DocumentPanel';
import { WelcomeModal } from './components/WelcomeModal';
import { FeatureTour } from './components/FeatureTour';

function App() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOnChat, setIsDraggingOnChat] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [useStreaming, setUseStreaming] = useState(true);
  const [conversationRefresh, setConversationRefresh] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [showDocsDialog, setShowDocsDialog] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return localStorage.getItem('rag-welcome-dismissed') !== 'true';
  });
  const [showFeatureTour, setShowFeatureTour] = useState(false);
  const [isFirstVisit] = useState(() => {
    return localStorage.getItem('rag-tour-completed') !== 'true';
  });
  const streamingContentRef = useRef('');
  const dragCounterRef = useRef(0);

  // Get documentation URL from environment variable
  const docsUrl = import.meta.env.VITE_DOCS_URL || 'http://localhost:8080';

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await api.listDocuments();
      setDocuments(response.documents);
      // Select all documents by default when first loaded
      setSelectedDocIds(new Set(response.documents.map(d => d.id)));
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadSuccess = (document: DocumentMetadata) => {
    setDocuments((prev) => [...prev, document]);
    // Auto-select newly uploaded documents
    setSelectedDocIds((prev) => new Set([...prev, document.id]));
  };

  const handleDelete = async (documentId: string) => {
    setIsDeleting(documentId);
    try {
      await api.deleteDocument(documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      // Remove from selection
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    } catch (error) {
      console.error('Failed to delete document:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleDocument = (documentId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedDocIds(new Set(documents.map(d => d.id)));
  };

  const handleDeselectAll = () => {
    setSelectedDocIds(new Set());
  };

  // File upload handler for drag-drop and paste
  const handleFileUpload = async (file: File): Promise<string | undefined> => {
    setIsUploading(true);
    try {
      const response = await api.uploadDocument(file);
      handleUploadSuccess(response.document);
      return response.document.id;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and drop handlers for center pane
  const handleChatDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOnChat(true);
    }
  };

  const handleChatDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingOnChat(false);
    }
  };

  const handleChatDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChatDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOnChat(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await handleFileUpload(file);
    }
  };

  // Handle image paste from ChatInput - returns document ID so it can be included in query
  const handleImagePaste = async (file: File): Promise<string | undefined> => {
    return await handleFileUpload(file);
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(undefined);
    streamingContentRef.current = '';
  };

  const handleSelectConversation = async (selectedConversationId: string) => {
    try {
      const conversation = await api.getConversation(selectedConversationId);
      setConversationId(selectedConversationId);
      setMessages(
        conversation.messages.map((m, index) => ({
          id: `${selectedConversationId}-${index}`,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp),
        }))
      );
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleSendMessage = async (content: string, additionalDocIds?: string[]) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    if (useStreaming) {
      await handleStreamingMessage(content, additionalDocIds);
    } else {
      await handleNonStreamingMessage(content, additionalDocIds);
    }
  };

  const handleStreamingMessage = async (content: string, additionalDocIds?: string[]) => {
    setIsStreaming(true);
    streamingContentRef.current = '';

    // Add placeholder for streaming message
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      let sources: SourceDocument[] = [];
      // Merge selectedDocIds with any additional doc IDs (e.g., from pasted images)
      const allDocIds = new Set(selectedDocIds);
      additionalDocIds?.forEach(id => allDocIds.add(id));
      const documentIds = allDocIds.size > 0 ? Array.from(allDocIds) : undefined;

      for await (const event of api.chatStream(content, conversationId, documentIds)) {
        if (event.type === 'token' && event.content) {
          streamingContentRef.current += event.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: streamingContentRef.current }
                : m
            )
          );
        } else if (event.type === 'sources' && event.sources) {
          sources = event.sources;
          if (event.conversation_id) {
            setConversationId(event.conversation_id);
          }
        } else if (event.type === 'error') {
          throw new Error(event.message || 'Stream error');
        }
      }

      // Final update with sources
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
              ...m,
              content: streamingContentRef.current,
              sources: sources.map((s) => ({
                content: s.content,
                filename: s.filename,
                page: s.page,
              })),
            }
            : m
        )
      );
      // Refresh conversation list to show new/updated conversation
      setConversationRefresh(prev => prev + 1);
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
              ...m,
              content: error instanceof Error ? error.message : 'An error occurred. Please try again.',
            }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNonStreamingMessage = async (content: string, additionalDocIds?: string[]) => {
    setIsLoading(true);

    try {
      // Merge selectedDocIds with any additional doc IDs (e.g., from pasted images)
      const allDocIds = new Set(selectedDocIds);
      additionalDocIds?.forEach(id => allDocIds.add(id));
      const documentIds = allDocIds.size > 0 ? Array.from(allDocIds) : undefined;
      const response = await api.chat(content, conversationId, documentIds);

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources.map((s) => ({
          content: s.content,
          filename: s.filename,
          page: s.page,
        })),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      // Refresh conversation list to show new/updated conversation
      setConversationRefresh(prev => prev + 1);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'An error occurred. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Left Sidebar - Conversations */}
      <div
        data-tour="conversations"
        className={`${leftSidebarOpen ? 'w-72' : 'w-0'
          } transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">📚 RAG Q&A</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Document Assistant</p>
        </div>

        <ConversationList
          currentConversationId={conversationId ?? null}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewChat}
          refreshTrigger={conversationRefresh}
        />

        {/* Settings */}
        <div data-tour="settings" className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={useStreaming}
                onChange={(e) => setUseStreaming(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <span>Streaming</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              {darkMode ? (
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        className="flex-1 flex flex-col min-w-0 relative"
        onDragEnter={handleChatDragEnter}
        onDragLeave={handleChatDragLeave}
        onDragOver={handleChatDragOver}
        onDrop={handleChatDrop}
      >
        {/* Drag Overlay */}
        {isDraggingOnChat && (
          <div className="absolute inset-0 z-50 bg-blue-500/20 dark:bg-blue-400/20 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg m-2">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-blue-500 dark:text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium text-blue-600 dark:text-blue-400">Drop files to upload</p>
              <p className="text-sm text-blue-500 dark:text-blue-300 mt-1">PDF, Word, Excel, PPT, TXT, MD, HTML, Images</p>
            </div>
          </div>
        )}

        {/* Uploading Indicator */}
        {isUploading && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Uploading document...</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Toggle conversations"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800 dark:text-white">Chat</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedDocIds.size > 0
                ? `${selectedDocIds.size} of ${documents.length} document${documents.length !== 1 ? 's' : ''} selected`
                : documents.length > 0
                  ? 'No documents selected for context'
                  : 'No documents uploaded'}
              {conversationId && ' • Conversation active'}
            </p>
          </div>
          {conversationId && (
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
              💬 Following up
            </span>
          )}
          <button
            data-tour="help"
            onClick={() => setShowWelcomeModal(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Help & Features"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowDocsDialog(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Documentation"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Toggle documents"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <ChatMessages messages={messages} isLoading={isLoading || isStreaming} />

        {/* Input */}
        <div data-tour="chat-input">
          <ChatInput
            onSend={handleSendMessage}
            onImagePaste={handleImagePaste}
            disabled={isLoading || isStreaming || selectedDocIds.size === 0}
          />
        </div>
      </div>

      {/* Right Sidebar - Documents */}
      <div
        data-tour="documents"
        className={`${rightSidebarOpen ? 'w-80' : 'w-0'
          } transition-all duration-300 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden`}
      >
        <div data-tour="doc-selection" className="h-full">
          <DocumentPanel
            documents={documents}
            selectedDocIds={selectedDocIds}
            isDeleting={isDeleting}
            onToggleDocument={handleToggleDocument}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onDelete={handleDelete}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      </div>

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onStartTour={() => {
          setShowWelcomeModal(false);
          setShowFeatureTour(true);
        }}
        isFirstVisit={isFirstVisit}
      />

      {/* Feature Tour */}
      <FeatureTour
        isActive={showFeatureTour}
        onComplete={() => setShowFeatureTour(false)}
      />

      {/* Documentation Dialog */}
      {showDocsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[90vw] h-[85vh] max-w-6xl flex flex-col overflow-hidden">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Documentation</h2>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  title="Open documentation in a new browser tab"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </a>
                <button
                  onClick={() => setShowDocsDialog(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Close"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Iframe Content */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-900">
              <iframe
                src={docsUrl}
                className="w-full h-full border-0"
                title="RAG Q&A Documentation"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
