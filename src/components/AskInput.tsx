import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { useAssistantStore } from '../store/assistantStore';
import { openAIProvider } from '../services/ai/OpenAIProvider';
import { useSpeakerTranscription } from '../hooks/useSpeakerTranscription';
const DEFAULT_SCREENSHOT_PROMPT = 'Analyze and answer the questions in this screenshot';

export const AskInput: React.FC = () => {
  const input = useAssistantStore((s) => s.input);
  const setInput = useAssistantStore((s) => s.setInput);
  const isLoading = useAssistantStore((s) => s.isLoading);
  const setIsLoading = useAssistantStore((s) => s.setIsLoading);
  const setAnswer = useAssistantStore((s) => s.setAnswer);
  const setShowAnswerPanel = useAssistantStore((s) => s.setShowAnswerPanel);
  const activeAction = useAssistantStore((s) => s.activeAction);
  const currentContext = useAssistantStore((s) => s.currentContext);
  const ocrText = useAssistantStore((s) => s.ocrText);
  const screenshotDataUrl = useAssistantStore((s) => s.screenshotDataUrl);
  const clearScreenshot = useAssistantStore((s) => s.clearScreenshot);
  const setShowScreenshotSelector = useAssistantStore((s) => s.setShowScreenshotSelector);
  const addToast = useAssistantStore((s) => s.addToast);
  const addMessage = useAssistantStore((s) => s.addMessage);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content (up to max-height)
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto'; // reset so scrollHeight is recalculated
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }, []);

  useLayoutEffect(() => {
    autoResize();
  }, [input, autoResize]);
  const { status, partial, error, start, stop } = useSpeakerTranscription({
    language: 'en', // 'ur' or 'hi' if your meetings are in those languages
    onFinal: (text) => {
      const { input, setInput } = useAssistantStore.getState();
      setInput(input ? `${input.trimEnd()} ${text}` : text);
    },
  });
  const listening = status === 'connecting' || status === 'listening' || status === 'reconnecting';


  // Auto-fill prompt when a screenshot is captured
  const prevScreenshotRef = useRef(screenshotDataUrl);
  useEffect(() => {
    if (screenshotDataUrl && screenshotDataUrl !== prevScreenshotRef.current) {
      // A new screenshot just arrived — auto-fill with default prompt if input is empty
      if (!input.trim()) {
        setInput(DEFAULT_SCREENSHOT_PROMPT);
      }
      // Focus the textarea so user can immediately edit
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 100);
    }
    prevScreenshotRef.current = screenshotDataUrl;
  }, [screenshotDataUrl]);

  const handleSubmit = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt && !ocrText && !screenshotDataUrl) {
      addToast({ message: 'Please enter a question or capture screen content.', type: 'warning' });
      return;
    }

    const isConfigured = await openAIProvider.isConfigured();
    if (!isConfigured) {
      addToast({ message: 'Please set your API key in Settings.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setShowAnswerPanel(true);

    // Add user message to chat history
    const finalPrompt = prompt || 'Analyze and explain the captured content.';
    addMessage({
      role: 'user',
      content: finalPrompt,
      screenshotDataUrl: screenshotDataUrl || undefined,
    });

    // Clear input but keep screenshot context until response
    setInput('');

    try {
      const context = ocrText || currentContext || undefined;

      // Pass image data if a screenshot is attached
      const response = await openAIProvider.ask(
        finalPrompt,
        context,
        activeAction || undefined,
        screenshotDataUrl || undefined,
      );

      if (response.error) {
        addToast({ message: response.error, type: 'error' });
        // Add error message to chat
        addMessage({
          role: 'assistant',
          content: `⚠️ Error: ${response.error}`,
        });
      } else {
        setAnswer(response.content);
        // Add assistant response to chat history
        addMessage({
          role: 'assistant',
          content: response.content,
        });
      }
    } catch (err) {
      addToast({ message: 'An unexpected error occurred.', type: 'error' });
      addMessage({
        role: 'assistant',
        content: '⚠️ An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
      // Clear screenshot after sending so user can take a new one
      clearScreenshot();
    }
  }, [input, ocrText, screenshotDataUrl, currentContext, activeAction, setIsLoading, setAnswer, setShowAnswerPanel, addToast, addMessage, clearScreenshot]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCaptureScreen = () => {
    setShowScreenshotSelector(true);
  };

  const hasScreenshot = !!screenshotDataUrl;

  return (
    <div className="px-4 pb-3">
      {/* Screenshot preview */}
      {hasScreenshot && (
        <div className="mb-2 relative group">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-nexa-accent/8 border border-nexa-accent/20">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-nexa-border bg-nexa-card">
              <img
                src={screenshotDataUrl}
                alt="Screenshot"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-nexa-accent flex-shrink-0">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-[10px] text-nexa-accent font-medium">Screenshot attached</span>
              </div>
              <span className="text-[9px] text-nexa-text-dim block mt-0.5">
                Edit the prompt below and press Enter to send
              </span>
            </div>
            {/* Remove screenshot button */}
            <button
              onClick={() => { clearScreenshot(); setInput(''); }}
              className="flex-shrink-0 p-1 rounded-lg text-nexa-text-dim hover:text-nexa-text hover:bg-nexa-card/80 transition-all duration-200"
              title="Remove screenshot"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {listening && (
        <div className="mb-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5">
          <div className="flex items-center gap-2 text-[10px] font-medium text-red-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            {status === 'listening' ? 'Listening to speaker' : status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
          </div>
          {partial && (
            <p dir="auto" className="mt-1 text-[11px] leading-4 italic text-nexa-text-muted">{partial}</p>
          )}
        </div>
      )}
      {error && (
        <div className="mb-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-[10px] text-amber-400">
          {error}
        </div>
      )}

      {/* Context indicator (OCR text, shown only when no screenshot preview) */}
      {!hasScreenshot && ocrText && (
        <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-nexa-accent/8 border border-nexa-accent/20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-nexa-accent flex-shrink-0">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-[10px] text-nexa-accent font-medium">Screen captured</span>
          <span className="text-[10px] text-nexa-text-dim truncate flex-1">
            {ocrText.substring(0, 60)}...
          </span>
        </div>
      )}


      {/* Input area */}
      <div className="flex items-end gap-1.5">
        {/* Textarea */}
        <div className="relative flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            dir='auto'
            placeholder={
              listening
                ? 'Listening — speak now...'
                : hasScreenshot
                  ? 'Ask about this screenshot...'
                  : 'Ask anything or listen to meeting...'
            }
            rows={1}
            disabled={isLoading}
            className={`nexa-textarea no-drag block w-full bg-nexa-card/80 text-nexa-text text-xs leading-5 rounded-xl
              px-3.5 py-[9px] pr-8 border focus:outline-none focus:ring-1 resize-none
              transition-colors duration-200 min-h-[40px] max-h-[100px] placeholder:text-nexa-text-dim
              ${listening
                ? 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20'
                : 'border-nexa-border focus:border-nexa-accent/40 focus:ring-nexa-accent/20'}`}
            style={{ overflowY: 'auto', overflowX: 'hidden' }}
          />
          {input && (
            <button
              onClick={() => setInput('')}
              title="Clear"
              className="no-drag absolute right-2 top-[12px] flex items-center justify-center w-4 h-4 rounded-full
                   text-nexa-text-dim hover:text-nexa-text hover:bg-white/10 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Listen to speaker */}
        <button
          onClick={listening ? stop : start}
          className={`tooltip-container no-drag relative flex items-center justify-center w-10 h-10 rounded-xl border
                transition-all duration-200 flex-shrink-0
                ${listening
              ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
              : 'bg-nexa-card/80 border-nexa-border text-nexa-text-muted hover:text-nexa-text hover:bg-nexa-card hover:border-nexa-border-light'}`}
        >
          {listening ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          )}
          <span className="tooltip">{listening ? 'Stop listening' : 'Listen to speaker'}</span>
        </button>

        {/* Capture */}
        <button
          onClick={handleCaptureScreen}
          disabled={isLoading}
          className="tooltip-container no-drag flex items-center justify-center w-10 h-10 rounded-xl border
               bg-nexa-card/80 text-nexa-text-muted border-nexa-border
               hover:text-nexa-text hover:bg-nexa-card hover:border-nexa-border-light
               transition-all duration-200 disabled:opacity-50 flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="tooltip">Capture Screen (Ctrl+Shift+H)</span>
        </button>

        {/* Send */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || (!input.trim() && !ocrText && !screenshotDataUrl)}
          className="no-drag flex items-center justify-center w-9 h-9 rounded-xl font-medium
               bg-gradient-to-r from-blue-500 to-blue-600 text-white
               hover:from-blue-600 hover:to-blue-700 shadow-glow hover:shadow-glow-lg
               transition-all duration-200 disabled:opacity-40 disabled:shadow-none flex-shrink-0"
        >
          {isLoading ? (
            <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="flex items-center gap-3 mt-1.5 px-1">
        <span className="text-[9px] text-nexa-text-dim">
          <kbd className="px-1 py-0.5 rounded bg-nexa-card border border-nexa-border text-[8px]">Enter</kbd> send
        </span>
        <span className="text-[9px] text-nexa-text-dim">
          <kbd className="px-1 py-0.5 rounded bg-nexa-card border border-nexa-border text-[8px]">Shift+Enter</kbd> new line
        </span>
        <span className="text-[9px] text-nexa-text-dim">
          <kbd className="px-1 py-0.5 rounded bg-nexa-card border border-nexa-border text-[8px]">Ctrl+Shift+H</kbd> screenshot
        </span>
      </div>
    </div>
  );
};
