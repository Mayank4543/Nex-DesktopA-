import React, { useState, useEffect } from 'react';
import { useAssistantStore } from '../store/assistantStore';

export const ControlBar: React.FC = () => {
  const showSettings = useAssistantStore((s) => s.showSettings);
  const setShowSettings = useAssistantStore((s) => s.setShowSettings);
  const settings = useAssistantStore((s) => s.settings);
  const updateSettings = useAssistantStore((s) => s.updateSettings);
  const [alwaysOnTop, setAlwaysOnTopState] = useState(settings.alwaysOnTop);

  useEffect(() => {
    setAlwaysOnTopState(settings.alwaysOnTop);
  }, [settings.alwaysOnTop]);

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  const toggleAlwaysOnTop = () => {
    const newValue = !alwaysOnTop;
    setAlwaysOnTopState(newValue);
    updateSettings({ alwaysOnTop: newValue });
    window.electronAPI?.setAlwaysOnTop(newValue);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <div className="drag-region flex items-center justify-between px-4 py-2.5 rounded-t-3xl">
      {/* Left — Branding */}
      <div className="flex items-center gap-2 no-drag">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-glow">
          <span className="text-[10px] font-bold text-white">N</span>
        </div>
        <span className="text-xs font-semibold text-nexa-text tracking-wide">Nexa</span>
        <span className="text-[10px] text-nexa-text-dim font-medium px-1.5 py-0.5 rounded-md bg-nexa-card border border-nexa-border">
          AI
        </span>
      </div>

      {/* Right — Controls */}
      <div className="flex items-center gap-1.5 no-drag">
        {/* Always on top */}
        <button
          onClick={toggleAlwaysOnTop}
          className={`tooltip-container w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${
            alwaysOnTop
              ? 'text-nexa-accent bg-nexa-accent/10'
              : 'text-nexa-text-muted hover:text-nexa-text hover:bg-nexa-card'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L12 8M12 8L8 12H16L12 8ZM8 12V16C8 18 10 20 12 22C14 20 16 18 16 16V12" />
          </svg>
          <span className="tooltip">Pin on top</span>
        </button>

        {/* Settings */}
        <button
          onClick={toggleSettings}
          className={`tooltip-container w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${
            showSettings
              ? 'text-nexa-accent bg-nexa-accent/10'
              : 'text-nexa-text-muted hover:text-nexa-text hover:bg-nexa-card'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className="tooltip">Settings</span>
        </button>

        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="tooltip-container w-6 h-6 rounded-lg flex items-center justify-center text-nexa-text-muted hover:text-nexa-text hover:bg-nexa-card transition-all duration-200"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="tooltip">Minimize</span>
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="tooltip-container w-6 h-6 rounded-lg flex items-center justify-center text-nexa-text-muted hover:text-nexa-error hover:bg-nexa-error/10 transition-all duration-200"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span className="tooltip">Close</span>
        </button>
      </div>
    </div>
  );
};
