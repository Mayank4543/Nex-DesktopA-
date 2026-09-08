import React from 'react';
import { ControlBar } from './ControlBar';
import { ActionButtons } from './ActionButtons';
import { AskInput } from './AskInput';
import { AnswerPanel } from './AnswerPanel';
import { SettingsPanel } from './SettingsPanel';

export const FloatingAssistant: React.FC = () => {
  return (
    <div className="flex flex-col h-full rounded-3xl bg-nexa-bg border border-nexa-border shadow-nexa-lg overflow-hidden glass-border">
      {/* Top bar — draggable */}
      <ControlBar />

      {/* Divider */}
      <div className="h-px bg-nexa-border/50 mx-3" />

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
      <div className="h-px bg-nexa-border/50 mx-3" />

      {/* Input area — always visible at bottom */}
      <div className="pt-2">
        <AskInput />
      </div>
    </div>
  );
};
