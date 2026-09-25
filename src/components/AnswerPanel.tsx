import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import { useAssistantStore } from '../store/assistantStore';
import { openAIProvider } from '../services/ai/OpenAIProvider';

export const AnswerPanel: React.FC = () => {
  const answer = useAssistantStore((s) => s.answer);
  const isLoading = useAssistantStore((s) => s.isLoading);
  const showAnswerPanel = useAssistantStore((s) => s.showAnswerPanel);
  const clearAnswer = useAssistantStore((s) => s.clearAnswer);
  const setAnswer = useAssistantStore((s) => s.setAnswer);
  const setIsLoading = useAssistantStore((s) => s.setIsLoading);
  const setShowAnswerPanel = useAssistantStore((s) => s.setShowAnswerPanel);
  const setIsSpeaking = useAssistantStore((s) => s.setIsSpeaking);
  const isSpeaking = useAssistantStore((s) => s.isSpeaking);
  const input = useAssistantStore((s) => s.input);
  const currentContext = useAssistantStore((s) => s.currentContext);
  const ocrText = useAssistantStore((s) => s.ocrText);
  const addToast = useAssistantStore((s) => s.addToast);
  const messages = useAssistantStore((s) => s.messages);
  const clearMessages = useAssistantStore((s) => s.clearMessages);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!showAnswerPanel) return null;

  const handleCopy = async () => {
    try {
      // Copy the latest assistant message
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
      const textToCopy = lastAssistant?.content || answer;
      await navigator.clipboard.writeText(textToCopy);
      addToast({ message: 'Copied to clipboard!', type: 'success', duration: 2000 });
    } catch {
      addToast({ message: 'Failed to copy.', type: 'error' });
    }
  };

  const handleRegenerate = async () => {
    const prompt = input.trim() || 'Analyze and explain the captured content.';
    const context = ocrText || currentContext || undefined;

    setIsLoading(true);
    setAnswer('');

    try {
      const response = await openAIProvider.ask(prompt, context);
      if (response.error) {
        addToast({ message: response.error, type: 'error' });
      } else {
        setAnswer(response.content);
      }
    } catch {
      addToast({ message: 'Regeneration failed.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainMore = async () => {
    setIsLoading(true);

    try {
      const response = await openAIProvider.ask(
        'Please explain the previous answer in more detail with examples.',
        answer,
        'explain',
      );
      if (response.error) {
        addToast({ message: response.error, type: 'error' });
      } else {
        setAnswer(response.content);
      }
    } catch {
      addToast({ message: 'Failed to get more explanation.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    const textToSpeak = lastAssistant?.content || answer;

    const plainText = textToSpeak
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/[#*_~\[\]]/g, '')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleClearAll = () => {
    clearMessages();
    clearAnswer();
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="px-4 pb-3 animate-slide-up no-drag">
      <div className="bg-nexa-card/50 rounded-2xl border border-nexa-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-nexa-border/50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-nexa-accent animate-pulse-glow" />
            <span className="text-[11px] font-semibold text-nexa-text">
              {hasMessages ? `Chat (${messages.length})` : 'AI Answer'}
            </span>
          </div>
          <button
            onClick={handleClearAll}
            className="text-nexa-text-dim hover:text-nexa-text transition-colors"
            title="Clear chat history"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Chat history content */}
        <div ref={scrollRef} className="px-3.5 py-3 max-h-[350px] overflow-y-auto chat-history-scroll">
          {hasMessages ? (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Role label */}
                  <span className={`text-[9px] font-semibold uppercase tracking-wider px-1 ${
                    msg.role === 'user' ? 'text-blue-400' : 'text-nexa-accent'
                  }`}>
                    {msg.role === 'user' ? 'You' : 'Nexa'}
                  </span>

                  {/* Message bubble */}
                  <div className={`rounded-2xl px-3 py-2 max-w-[95%] ${
                    msg.role === 'user'
                      ? 'bg-blue-500/15 border border-blue-500/20 rounded-tr-md'
                      : 'bg-nexa-surface/80 border border-nexa-border rounded-tl-md'
                  }`}>
                    {/* Screenshot thumbnail in user message */}
                    {msg.screenshotDataUrl && (
                      <div className="mb-2">
                        <img
                          src={msg.screenshotDataUrl}
                          alt="Screenshot"
                          className="w-full max-h-[120px] object-contain rounded-lg border border-nexa-border/50"
                        />
                      </div>
                    )}

                    {msg.role === 'assistant' ? (
                      <div className="markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeStr = String(children).replace(/\n$/, '');

                              if (match) {
                                return (
                                  <div className="relative group">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(codeStr);
                                          addToast({ message: 'Code copied!', type: 'success', duration: 1500 });
                                        }}
                                        className="px-2 py-1 rounded-lg bg-nexa-surface text-[10px] text-nexa-text-muted hover:text-nexa-text border border-nexa-border"
                                      >
                                        Copy
                                      </button>
                                    </div>
                                    <SyntaxHighlighter
                                      style={oneDark}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{
                                        margin: 0,
                                        borderRadius: '0.75rem',
                                        fontSize: '11px',
                                        background: '#111315',
                                        border: '1px solid #2a2e35',
                                      }}
                                    >
                                      {codeStr}
                                    </SyntaxHighlighter>
                                  </div>
                                );
                              }

                              return (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-xs text-nexa-text leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[8px] text-nexa-text-dim px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex flex-col gap-1 items-start">
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1 text-nexa-accent">Nexa</span>
                  <div className="rounded-2xl rounded-tl-md px-3 py-3 bg-nexa-surface/80 border border-nexa-border">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-nexa-accent typing-dot" />
                        <div className="w-1.5 h-1.5 rounded-full bg-nexa-accent typing-dot" />
                        <div className="w-1.5 h-1.5 rounded-full bg-nexa-accent typing-dot" />
                      </div>
                      <span className="text-xs text-nexa-text-muted">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Fallback: show single answer (legacy compatibility)
            <>
              {isLoading && !answer ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-nexa-accent typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-nexa-accent typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-nexa-accent typing-dot" />
                  </div>
                  <span className="text-xs text-nexa-text-muted">Thinking...</span>
                </div>
              ) : (
                <div className="markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeStr = String(children).replace(/\n$/, '');

                        if (match) {
                          return (
                            <div className="relative group">
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(codeStr);
                                    addToast({ message: 'Code copied!', type: 'success', duration: 1500 });
                                  }}
                                  className="px-2 py-1 rounded-lg bg-nexa-surface text-[10px] text-nexa-text-muted hover:text-nexa-text border border-nexa-border"
                                >
                                  Copy
                                </button>
                              </div>
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                  margin: 0,
                                  borderRadius: '0.75rem',
                                  fontSize: '11px',
                                  background: '#111315',
                                  border: '1px solid #2a2e35',
                                }}
                              >
                                {codeStr}
                              </SyntaxHighlighter>
                            </div>
                          );
                        }

                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {answer}
                  </ReactMarkdown>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {(answer || hasMessages) && (
          <div className="flex items-center gap-1.5 px-3.5 py-2 border-t border-nexa-border/50">
            <ActionBtn icon="📋" label="Copy" onClick={handleCopy} />
            <ActionBtn icon="🔄" label="Regenerate" onClick={handleRegenerate} disabled={isLoading} />
            <ActionBtn icon="💡" label="Explain more" onClick={handleExplainMore} disabled={isLoading} />
            <ActionBtn
              icon={isSpeaking ? '⏹' : '🔊'}
              label={isSpeaking ? 'Stop' : 'Speak'}
              onClick={handleSpeak}
            />
            <div className="flex-1" />
            <ActionBtn icon="🗑" label="Clear all" onClick={handleClearAll} />
          </div>
        )}
      </div>
    </div>
  );
};

const ActionBtn: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium
               text-nexa-text-muted hover:text-nexa-text hover:bg-nexa-surface
               transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
  >
    <span className="text-[10px]">{icon}</span>
    {label}
  </button>
);
