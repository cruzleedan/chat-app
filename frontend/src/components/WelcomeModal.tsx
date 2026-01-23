import { useState } from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
  isFirstVisit: boolean;
}

const features = [
  {
    icon: '📄',
    title: 'Upload Documents',
    description: 'Drag & drop or browse to upload PDF, Word, Excel, PowerPoint, text files, and images.',
  },
  {
    icon: '🔍',
    title: 'Ask Questions',
    description: 'Ask natural language questions and get AI-powered answers with source citations.',
  },
  {
    icon: '📋',
    title: 'Paste Images',
    description: 'Paste screenshots or images directly - OCR extracts text automatically for context.',
  },
  {
    icon: '💬',
    title: 'Conversation History',
    description: 'Your chats are saved automatically. Continue previous conversations anytime.',
  },
  {
    icon: '🎯',
    title: 'Filter Context',
    description: 'Select which documents to include as context for more focused answers.',
  },
  {
    icon: '⚡',
    title: 'Streaming Responses',
    description: 'Watch AI responses appear in real-time with streaming enabled.',
  },
];

export function WelcomeModal({ isOpen, onClose, onStartTour, isFirstVisit }: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('rag-welcome-dismissed', 'true');
    }
    onClose();
  };

  const handleStartTour = () => {
    if (dontShowAgain) {
      localStorage.setItem('rag-welcome-dismissed', 'true');
    }
    onStartTour();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white text-center">
          <div className="text-5xl mb-3">📚</div>
          <h1 className="text-2xl font-bold mb-2">Welcome to RAG Q&A</h1>
          <p className="text-blue-100">Your AI-powered document assistant</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">
            {isFirstVisit ? "Here's what you can do:" : 'Features Overview'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">{feature.icon}</span>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white text-sm">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Start */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Start
            </h3>
            <ol className="text-sm text-blue-700 dark:text-blue-200 space-y-1.5 ml-4">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span>Upload documents using the panel on the right</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span>Select which documents to use as context</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>Type your question and press Enter</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              Don't show this again
            </label>
            
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Skip
              </button>
              {isFirstVisit && (
                <button
                  onClick={handleStartTour}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Take a Tour
                </button>
              )}
              {!isFirstVisit && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Got it!
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
