import React from 'react';
import { ControlBar } from './ControlBar';
import { ActionButtons } from './ActionButtons';
import { AskInput } from './AskInput';
import { AnswerPanel } from './AnswerPanel';
import { SettingsPanel } from './SettingsPanel';
import { useAssistantStore } from '../store/assistantStore';

export const FloatingAssistant: React.FC = () => {
  const windowOpacity = useAssistantStore((s) => s.settings.windowOpacity ?? 80);
  const opacityRatio = (windowOpacity / 100).toFixed(2);

  return (
    <div
      className="flex flex-col h-full rounded-3xl border border-white/10 shadow-nexa-lg overflow-hidden backdrop-blur-2xl transition-all duration-300"
      style={{
        backgroundColor: `rgba(17, 19, 21, ${opacityRatio})`,
      }}
    >
      {/* Top bar — draggable */}
      <ControlBar />

      {/* Divider */}
      <div className="h-px bg-white/10 mx-3" />

      {/* Main content — scrollable */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Action buttons */}
        <ActionButtons />

        {/* Settings panel (conditional) */}
        <SettingsPanel />

        {/* Answer panel (conditional) */}
        <AnswerPanel />
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 mx-3" />

      {/* Input area — always visible at bottom */}
      <div className="pt-2">
        <AskInput />
      </div>
    </div>
  );
};
