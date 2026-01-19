import { useState, useEffect, useCallback } from 'react';

export interface TourStep {
  target: string; // CSS selector or data attribute
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="conversations"]',
    title: '💬 Chat History',
    content: 'Your conversations are saved here. Click to continue a previous chat or start a new one.',
    position: 'right',
  },
  {
    target: '[data-tour="documents"]',
    title: '📄 Document Panel',
    content: 'Upload and manage your documents here. Drag & drop files or click to browse.',
    position: 'left',
  },
  {
    target: '[data-tour="doc-selection"]',
    title: '🎯 Select Context',
    content: 'Check the documents you want to use as context for your questions. Uncheck to exclude.',
    position: 'left',
  },
  {
    target: '[data-tour="chat-input"]',
    title: '✍️ Ask Questions',
    content: 'Type your question here. Press Enter to send, or paste images with Ctrl/Cmd+V.',
    position: 'top',
  },
  {
    target: '[data-tour="settings"]',
    title: '⚙️ Settings',
    content: 'Toggle streaming responses and dark mode here.',
    position: 'right',
  },
  {
    target: '[data-tour="help"]',
    title: '❓ Need Help?',
    content: 'Click here anytime to see features or restart this tour. Happy exploring!',
    position: 'bottom',
  },
];

interface FeatureTourProps {
  isActive: boolean;
  onComplete: () => void;
}

export function FeatureTour({ isActive, onComplete }: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updatePosition = useCallback(() => {
    if (!isActive) return;
    
    const step = tourSteps[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      
      // Calculate tooltip position based on step.position
      const padding = 16;
      const tooltipWidth = 300;
      const tooltipHeight = 150;
      
      let top = 0;
      let left = 0;
      
      switch (step.position) {
        case 'top':
          top = rect.top - tooltipHeight - padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - padding;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + padding;
          break;
      }
      
      // Keep tooltip in viewport
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));
      
      setTooltipPosition({ top, left });
    }
  }, [currentStep, isActive]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [updatePosition]);

  useEffect(() => {
    if (isActive) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(updatePosition, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isActive, updatePosition]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setCurrentStep(0);
    localStorage.setItem('rag-tour-completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    setCurrentStep(0);
    onComplete();
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100]">
        {/* Dark overlay with cutout for target element */}
        <svg className="w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.6)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Highlight border around target */}
        {targetRect && (
          <div
            className="absolute border-2 border-blue-500 rounded-lg pointer-events-none animate-pulse"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        )}

        {/* Tooltip */}
        <div
          className="absolute w-[300px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 z-[101] animate-slide-in"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* Progress bar */}
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {step.content}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Step {currentStep + 1} of {tourSteps.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Skip tour
              </button>
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
