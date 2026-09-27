import React, { useRef,useState, useCallback, useEffect } from 'react';
import { useAssistantStore } from '../store/assistantStore';
import { openAIProvider } from '../services/ai/OpenAIProvider';

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

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef(false);
  const initialInputRef = useRef('');

  // Pure SpeechRecognition flow: Listen → SpeechRecognition → interim transcript → textarea
  // No audio recording, no Whisper. User presses Enter to submit.
  const toggleListening = useCallback(async () => {
    // If currently listening, stop
    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      setInterimTranscript('');

      // Stop Web Speech Recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }

      // Release the mic stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      addToast({ message: 'Stopped listening.', type: 'info' });
      return;
    }

    // Save initial input before listening so spoken words append cleanly
    initialInputRef.current = useAssistantStore.getState().input;

    // In Electron, we must acquire the mic stream and keep it alive
    // for SpeechRecognition to work — it shares the audio device
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (e: any) {
      console.warn('Microphone permission check failed:', e);
      addToast({ message: 'Microphone access denied or no recording device found.', type: 'error' });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      addToast({ message: 'Speech recognition API not available in browser.', type: 'error' });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      isListeningRef.current = true;
      setIsListening(true);
      addToast({ message: 'Listening live... Speak now!', type: 'success' });

      recognition.onresult = (event: any) => {
        let final = '';
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptChunk + ' ';
          } else {
            interim += transcriptChunk;
          }
        }

        // Clean up repetitive silence dots (. . . . .)
        let cleanSpokenText = (final + interim)
          .replace(/(\s*\.\s*){2,}/g, ' ')
          .replace(/^\s*\.\s*/, '')
          .trim();

        if (cleanSpokenText) {
          const prefix = initialInputRef.current ? `${initialInputRef.current.trim()} ` : '';
          setInput(prefix + cleanSpokenText);
        }
        setInterimTranscript(interim.replace(/(\s*\.\s*){2,}/g, '').trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Live speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
          isListeningRef.current = false;
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
          addToast({ message: 'Microphone permission denied.', type: 'error' });
        }
      };

      recognition.onend = () => {
        setInterimTranscript('');
        // Keep listening continuous in real-time until user turns it off
        if (isListeningRef.current && recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            // ignore restart errors
          }
        } else {
          setIsListening(false);
          // Release mic when recognition ends naturally
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start live speech recognition:', err);
      setIsListening(false);
      isListeningRef.current = false;
      // Release mic on failure
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      addToast({ message: 'Failed to start live speech recognition.', type: 'error' });
    }
  }, [isListening, addToast, setInput]);

  // Cleanup recognition and mic stream on component unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch {}
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch {}
      }
    };
  }, []);

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

      {/* Live speech listening indicator */}
      {isListening && (
        <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[10px] text-red-400 font-semibold tracking-wide uppercase">Listening Live</span>
          <span className="text-[10px] text-nexa-text-muted truncate flex-1 italic">
            {interimTranscript || 'Waiting for speaker in meeting...'}
          </span>
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
      <div className="relative flex items-end gap-1.5">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "Live transcribing speaker in meeting..."
                : hasScreenshot
                ? "Ask about this screenshot..."
                : "Ask anything or listen to meeting..."
            }
            rows={1}
            className="no-drag w-full bg-nexa-card/80 text-nexa-text text-xs rounded-xl px-3.5 py-2.5 pr-10
                       border border-nexa-border focus:border-nexa-accent/40 focus:outline-none focus:ring-1 focus:ring-nexa-accent/20
                       placeholder:text-nexa-text-dim resize-none transition-all duration-200 min-h-[36px] max-h-[100px]"
            style={{ overflow: input.includes('\n') ? 'auto' : 'hidden' }}
            disabled={isLoading}
          />
          {input && (
            <button
              onClick={() => setInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nexa-text-dim hover:text-nexa-text transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Live Meeting Mic button */}
        <button
          onClick={toggleListening}
          disabled={isLoading}
          className={`tooltip-container no-drag flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-all duration-200 flex-shrink-0 border ${
            isListening
              ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-glow'
              : 'bg-nexa-card/80 text-nexa-text-muted border-nexa-border hover:text-nexa-text hover:bg-nexa-card hover:border-nexa-border-light'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isListening ? 'animate-bounce' : ''}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <span className="hidden sm:inline">
            {isListening ? 'Listening' : 'Listen'}
          </span>
          <span className="tooltip">
            {isListening ? 'Click to Stop Listening' : 'Listen & Transcribe Live'}
          </span>
        </button>

        {/* Capture screen */}
        <button
          onClick={handleCaptureScreen}
          disabled={isLoading}
          className="tooltip-container no-drag flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-medium
                     bg-nexa-card/80 text-nexa-text-muted border border-nexa-border
                     hover:text-nexa-text hover:bg-nexa-card hover:border-nexa-border-light
                     transition-all duration-200 disabled:opacity-50 flex-shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="hidden sm:inline">Capture</span>
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
