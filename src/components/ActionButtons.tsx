import React from 'react';
import { useAssistantStore } from '../store/assistantStore';
import type { ActionType } from '../types/assistant';

interface ActionDef {
  id: ActionType;
  label: string;
  icon: React.ReactNode;
}

const actions: ActionDef[] = [
  {
    id: 'answer',
    label: 'What to answer?',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    id: 'clarify',
    label: 'Clarify',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    id: 'recap',
    label: 'Recap',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: 'followup',
    label: 'Follow Up Question',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'listen',
    label: 'Listen',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    ),
  },
];

export const ActionButtons: React.FC = () => {
  const activeAction = useAssistantStore((s) => s.activeAction);
  const setActiveAction = useAssistantStore((s) => s.setActiveAction);
  const isSpeaking = useAssistantStore((s) => s.isSpeaking);
  const setIsSpeaking = useAssistantStore((s) => s.setIsSpeaking);
  const answer = useAssistantStore((s) => s.answer);
  const addToast = useAssistantStore((s) => s.addToast);

  const handleActionClick = (action: ActionDef) => {
    if (action.id === 'listen') {
      handleListen();
      return;
    }
    setActiveAction(activeAction === action.id ? null : action.id);
  };

  const handleListen = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!answer) {
      addToast({ message: 'No answer to read aloud.', type: 'warning' });
      return;
    }

    // Strip markdown for TTS
    const plainText = answer
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/[#*_~\[\]]/g, '')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-2">
      {actions.map((action) => {
        const isActive = activeAction === action.id;
        const isListenActive = action.id === 'listen' && isSpeaking;

        return (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={`no-drag flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all duration-200 border ${
              isActive || isListenActive
                ? 'bg-nexa-accent/15 text-nexa-accent border-nexa-accent/30 shadow-glow'
                : 'bg-nexa-card/60 text-nexa-text-muted border-nexa-border hover:text-nexa-text hover:bg-nexa-card hover:border-nexa-border-light'
            }`}
          >
            {action.icon}
            {action.label}
          </button>
        );
      })}
    </div>
  );
};
