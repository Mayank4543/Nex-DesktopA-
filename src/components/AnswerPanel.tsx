import React from 'react';
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

  if (!showAnswerPanel) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(answer);
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

    const plainText = answer
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

  return (
    <div className="px-4 pb-3 animate-slide-up no-drag">
      <div className="bg-nexa-card/50 rounded-2xl border border-nexa-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-nexa-border/50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-nexa-accent animate-pulse-glow" />
            <span className="text-[11px] font-semibold text-nexa-text">AI Answer</span>
          </div>
          <button
            onClick={clearAnswer}
            className="text-nexa-text-dim hover:text-nexa-text transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-3.5 py-3 max-h-[250px] overflow-y-auto">
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
        </div>

        {/* Actions */}
        {answer && (
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
            <ActionBtn icon="🗑" label="Clear" onClick={clearAnswer} />
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
