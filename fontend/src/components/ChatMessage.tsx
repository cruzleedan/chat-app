import { Message } from '../types';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
      <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`px-4 py-3 rounded-2xl relative ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          
          {/* Copy button for assistant messages */}
          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-600"
              title="Copy message"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}
        </div>
        
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
              title={showSources ? 'Hide sources' : 'Show sources'}
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${showSources ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${showSources ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-2">
                {message.sources.map((source, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs dark:bg-gray-800 dark:border-gray-600">
                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {source.filename}
                      {source.page !== null && ` (Page ${source.page + 1})`}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 line-clamp-3">{source.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <p className={`text-xs mt-1 ${isUser ? 'text-right' : 'text-left'} text-gray-400 dark:text-gray-500`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
