import { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { api, DocumentMetadata } from '../services/api';

interface DocumentPanelProps {
  documents: DocumentMetadata[];
  selectedDocIds: Set<string>;
  onToggleDocument: (docId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: (id: string) => void;
  isDeleting: string | null;
  onUploadSuccess: (document: DocumentMetadata) => void;
}

export function DocumentPanel({
  documents,
  selectedDocIds,
  onToggleDocument,
  onSelectAll,
  onDeselectAll,
  onDelete,
  isDeleting,
  onUploadSuccess,
}: DocumentPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DocumentMetadata | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentMetadata | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const result = await api.uploadDocument(file);
      onUploadSuccess(result.document);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handlePreview = async (doc: DocumentMetadata) => {
    setPreviewDoc(doc);
    setIsLoadingPreview(true);
    setPreviewContent('');
    
    try {
      const result = await api.getDocumentContent(doc.id);
      setPreviewContent(result.content);
    } catch (err) {
      setPreviewContent(`Error loading content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const allSelected = documents.length > 0 && selectedDocIds.size === documents.length;
  const noneSelected = selectedDocIds.size === 0;

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Documents
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                ({selectedDocIds.size}/{documents.length})
              </span>
            </h2>
            <label 
              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
              title="Upload document"
            >
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.txt,.md,.docx,.doc,.html,.htm,.xlsx,.xls,.pptx,.ppt,.jpg,.jpeg,.png"
                className="hidden"
                disabled={isUploading}
              />
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </label>
          </div>
          
          {/* Selection Controls */}
          <div className="flex gap-2 text-xs">
            <button
              onClick={onSelectAll}
              disabled={allSelected}
              className="px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Select all documents for context"
            >
              Select All
            </button>
            <button
              onClick={onDeselectAll}
              disabled={noneSelected}
              className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Deselect all documents"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="px-3 pt-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border border-dashed rounded-lg p-3 text-center transition-colors
              ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
              ${isUploading ? 'opacity-50' : ''}
            `}
          >
            <label className="cursor-pointer block">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.txt,.md,.docx,.doc,.html,.htm,.xlsx,.xls,.pptx,.ppt,.jpg,.jpeg,.png"
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs">Uploading...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Drop files or <span className="text-blue-600 dark:text-blue-400">browse</span>
                  </p>
                  <div className="flex flex-wrap justify-center gap-1">
                    <span className="px-1.5 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">PDF</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">Word</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">Excel</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded">PPT</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">TXT/MD</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">HTML</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded">Image</span>
                  </div>
                </div>
              )}
            </label>
          </div>
          
          {uploadError && (
            <p className="text-xs text-red-500 mt-2">{uploadError}</p>
          )}
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {documents.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
              No documents uploaded
            </p>
          ) : (
            documents.map((doc) => (
              <div 
                key={doc.id} 
                className={`
                  group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                  ${selectedDocIds.has(doc.id) 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                  }
                `}
                onClick={() => handlePreview(doc)}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedDocIds.has(doc.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleDocument(doc.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
                
                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate" title={doc.filename}>
                    {doc.filename}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatFileSize(doc.file_size)} • {doc.chunk_count} chunks
                  </p>
                </div>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(doc);
                  }}
                  disabled={isDeleting === doc.id}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-all"
                  title={`Delete ${doc.filename}`}
                >
                  {isDeleting === doc.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
        
        {/* Selection Info */}
        {documents.length > 0 && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {selectedDocIds.size === 0 
                ? '⚠️ No documents selected for context'
                : `✓ ${selectedDocIds.size} document${selectedDocIds.size > 1 ? 's' : ''} will be used as context`
              }
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-5 mx-4 max-w-sm w-full animate-slide-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Document</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Are you sure you want to delete this document?
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 mb-4 truncate" title={deleteConfirm.filename}>
              {deleteConfirm.filename}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              This will remove the document and all its indexed content. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="Cancel deletion"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                title="Permanently delete this document"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 min-w-0 mr-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {previewDoc.filename}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(previewDoc.file_size)} • {previewDoc.chunk_count} chunks
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : (
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  {previewContent}
                </pre>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocIds.has(previewDoc.id)}
                  onChange={() => onToggleDocument(previewDoc.id)}
                  className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
                <span>Include in context</span>
              </label>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
