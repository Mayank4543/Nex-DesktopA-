import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAssistantStore } from '../store/assistantStore';
import { screenshotService } from '../services/screenshot/ScreenshotService';
import { ocrProvider } from '../services/ocr/OCRProvider';

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const ScreenshotSelector: React.FC = () => {
  const showScreenshotSelector = useAssistantStore((s) => s.showScreenshotSelector);
  const setShowScreenshotSelector = useAssistantStore((s) => s.setShowScreenshotSelector);
  const setOCRText = useAssistantStore((s) => s.setOCRText);
  const setScreenshot = useAssistantStore((s) => s.setScreenshot);
  const setScreenshotPreview = useAssistantStore((s) => s.setScreenshotPreview);
  const setInput = useAssistantStore((s) => s.setInput);
  const addToast = useAssistantStore((s) => s.addToast);
  const setIsLoading = useAssistantStore((s) => s.setIsLoading);

  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [phase, setPhase] = useState<'capturing' | 'selecting' | 'preview' | 'ocr'>('capturing');
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [ocrResult, setOCRResult] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Start capture when shown
  useEffect(() => {
    if (showScreenshotSelector) {
      setPhase('capturing');
      captureScreen();
    } else {
      resetState();
    }
  }, [showScreenshotSelector]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowScreenshotSelector(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const resetState = () => {
    setScreenshotDataUrl(null);
    setIsSelecting(false);
    setSelection(null);
    setCroppedPreview(null);
    setOCRResult('');
    setPhase('capturing');
  };

  const captureScreen = async () => {
    try {
      const screenshot = await screenshotService.captureFullScreen();
      if (!screenshot) {
        addToast({ message: 'Failed to capture screen.', type: 'error' });
        setShowScreenshotSelector(false);
        return;
      }
      setScreenshotDataUrl(screenshot.dataUrl);
      setScreenshot(screenshot);
      setPhase('selecting');
    } catch (err) {
      addToast({ message: 'Screenshot permission denied.', type: 'error' });
      setShowScreenshotSelector(false);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (phase !== 'selecting') return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsSelecting(true);
    setSelection({
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      endX: e.clientX - rect.left,
      endY: e.clientY - rect.top,
    });
  }, [phase]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selection) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setSelection((prev) => prev ? {
      ...prev,
      endX: e.clientX - rect.left,
      endY: e.clientY - rect.top,
    } : null);
  }, [isSelecting, selection]);

  const handleMouseUp = useCallback(async () => {
    if (!isSelecting || !selection || !screenshotDataUrl) return;
    setIsSelecting(false);

    const x = Math.min(selection.startX, selection.endX);
    const y = Math.min(selection.startY, selection.endY);
    const width = Math.abs(selection.endX - selection.startX);
    const height = Math.abs(selection.endY - selection.startY);

    if (width < 10 || height < 10) {
      // Too small — use full screenshot
      setCroppedPreview(screenshotDataUrl);
      setPhase('preview');
      return;
    }

    try {
      const container = containerRef.current;
      if (!container) return;

      const cropped = await screenshotService.cropRegion(
        screenshotDataUrl,
        { x, y, width, height },
        container.clientWidth,
        container.clientHeight,
      );
      setCroppedPreview(cropped);
      setPhase('preview');
    } catch {
      addToast({ message: 'Failed to crop region.', type: 'error' });
    }
  }, [isSelecting, selection, screenshotDataUrl]);

  const handleConfirmAndOCR = async () => {
    if (!croppedPreview) return;
    setPhase('ocr');

    try {
      const result = await ocrProvider.recognize(croppedPreview);
      if (result.text.trim()) {
        setOCRResult(result.text);
        setOCRText(result.text);
        setScreenshotPreview(croppedPreview);
        addToast({ message: `Text extracted (${Math.round(result.confidence)}% confidence)`, type: 'success' });
      } else {
        addToast({ message: 'No text detected in the selected area.', type: 'warning' });
        setOCRResult('');
      }
    } catch {
      addToast({ message: 'OCR processing failed.', type: 'error' });
    }
  };

  const handleDone = () => {
    // Auto-fill prompt when screenshot flow completes
    const currentInput = useAssistantStore.getState().input;
    if (!currentInput.trim()) {
      setInput('Analyze and answer the questions in this screenshot');
    }
    setShowScreenshotSelector(false);
  };

  if (!showScreenshotSelector) return null;

  // Get selection rect for rendering
  const selectionStyle = selection ? {
    left: Math.min(selection.startX, selection.endX),
    top: Math.min(selection.startY, selection.endY),
    width: Math.abs(selection.endX - selection.startX),
    height: Math.abs(selection.endY - selection.startY),
  } : null;

  return (
    <div className="fixed inset-0 z-[9998] no-drag animate-fade-in">
      {phase === 'capturing' && (
        <div className="flex items-center justify-center h-full bg-nexa-bg/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin text-nexa-accent" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="text-sm text-nexa-text">Capturing screen...</span>
          </div>
        </div>
      )}

      {phase === 'selecting' && screenshotDataUrl && (
        <div className="relative h-full">
          {/* Instruction bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl bg-nexa-surface/90 border border-nexa-border backdrop-blur-sm">
            <span className="text-xs text-nexa-text">
              Click and drag to select a region · <kbd className="px-1.5 py-0.5 rounded bg-nexa-card border border-nexa-border text-[10px]">Esc</kbd> to cancel
            </span>
          </div>

          {/* Screenshot */}
          <div
            ref={containerRef}
            className="w-full h-full screenshot-overlay"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              backgroundImage: `url(${screenshotDataUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Selection overlay */}
            {selectionStyle && selectionStyle.width > 0 && selectionStyle.height > 0 && (
              <div
                className="absolute selection-box pointer-events-none"
                style={selectionStyle}
              />
            )}
          </div>
        </div>
      )}

      {(phase === 'preview' || phase === 'ocr') && (
        <div className="flex items-center justify-center h-full bg-nexa-bg/95 backdrop-blur-sm p-4">
          <div className="bg-nexa-surface rounded-2xl border border-nexa-border shadow-nexa-lg max-w-[500px] w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-nexa-border/50">
              <span className="text-xs font-semibold text-nexa-text">Screenshot Preview</span>
              <button
                onClick={handleDone}
                className="text-nexa-text-dim hover:text-nexa-text transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Preview image */}
            {croppedPreview && (
              <div className="p-3">
                <img
                  src={croppedPreview}
                  alt="Screenshot preview"
                  className="w-full rounded-xl border border-nexa-border"
                  style={{ maxHeight: '200px', objectFit: 'contain' }}
                />
              </div>
            )}

            {/* OCR Result */}
            {ocrResult && (
              <div className="px-3 pb-3">
                <div className="bg-nexa-bg rounded-xl p-3 border border-nexa-border max-h-[120px] overflow-y-auto">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-medium text-nexa-accent">Extracted Text</span>
                  </div>
                  <pre className="text-[11px] text-nexa-text/90 font-mono whitespace-pre-wrap break-words">{ocrResult}</pre>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-nexa-border/50">
              {phase === 'preview' && !ocrResult && (
                <>
                  <button
                    onClick={() => setPhase('selecting')}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-nexa-card text-nexa-text-muted border border-nexa-border hover:bg-nexa-surface transition-all"
                  >
                    Reselect
                  </button>
                  <button
                    onClick={handleConfirmAndOCR}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-glow transition-all"
                  >
                    Extract Text (OCR)
                  </button>
                </>
              )}

              {phase === 'ocr' && !ocrResult && (
                <div className="flex items-center gap-2 w-full justify-center py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin text-nexa-accent" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span className="text-xs text-nexa-text-muted">Running OCR...</span>
                </div>
              )}

              {ocrResult && (
                <>
                  <button
                    onClick={() => { resetState(); captureScreen(); }}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-nexa-card text-nexa-text-muted border border-nexa-border hover:bg-nexa-surface transition-all"
                  >
                    Recapture
                  </button>
                  <button
                    onClick={handleDone}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-glow transition-all"
                  >
                    Use Extracted Text
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
