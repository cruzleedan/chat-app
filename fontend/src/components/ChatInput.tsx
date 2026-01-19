import { useState, FormEvent, KeyboardEvent, useRef, useEffect, ClipboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string, additionalDocIds?: string[]) => void;
  onImagePaste?: (file: File) => Promise<string | undefined>; // Returns document ID
  disabled?: boolean;
  isUploading?: boolean;
}

export function ChatInput({ onSend, onImagePaste, disabled, isUploading }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [message]);

  // Clean up image preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setPastedImage(file);
          setImagePreview(URL.createObjectURL(file));
        }
        break;
      }
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setPastedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isUploadingImage || isUploading) return;
    
    // If there's a pasted image, upload it first and wait for completion
    if (pastedImage && onImagePaste) {
      setIsUploadingImage(true);
      try {
        const newDocId = await onImagePaste(pastedImage);
        handleRemoveImage();
        
        // Small delay to ensure the document is indexed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Now send the message with the new document ID explicitly included
        if (message.trim() && !disabled) {
          onSend(message.trim(), newDocId ? [newDocId] : undefined);
          setMessage('');
        }
      } catch (error) {
        console.error('Image upload failed:', error);
      } finally {
        setIsUploadingImage(false);
      }
      return;
    }
    
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isUploadingImage || isUploading) return;
      
      // If there's a pasted image, upload it first and wait for completion
      if (pastedImage && onImagePaste) {
        setIsUploadingImage(true);
        try {
          const newDocId = await onImagePaste(pastedImage);
          handleRemoveImage();
          
          // Small delay to ensure the document is indexed
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Now send the message with the new document ID explicitly included
          if (message.trim() && !disabled) {
            onSend(message.trim(), newDocId ? [newDocId] : undefined);
            setMessage('');
          }
        } catch (error) {
          console.error('Image upload failed:', error);
        } finally {
          setIsUploadingImage(false);
        }
        return;
      }
      
      if (message.trim() && !disabled) {
        onSend(message.trim());
        setMessage('');
      }
    }
    // Escape to clear
    if (e.key === 'Escape') {
      setMessage('');
      handleRemoveImage();
      textareaRef.current?.blur();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img 
            src={imagePreview} 
            alt="Pasted image" 
            className="max-h-24 rounded-lg border border-gray-300 dark:border-gray-600"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={isUploadingImage}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
            title="Remove image"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
            {isUploadingImage ? 'Uploading...' : 'Press Enter to upload & ask'}
          </span>
        </div>
      )}
      
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={pastedImage ? "Add a message or press Enter to upload image..." : "Ask a question about your documents... (paste images with Ctrl+V)"}
          disabled={disabled || isUploadingImage}
          rows={1}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={disabled || isUploadingImage || (!message.trim() && !pastedImage)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          title={disabled ? 'Select documents to enable chat' : 'Send message'}
        >
          {isUploadingImage ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
        Press Enter to send, Shift+Enter for new line • Paste images with Ctrl/Cmd+V
      </p>
    </form>
  );
}
