import React, { useState, useEffect } from 'react';
import { useAssistantStore } from '../store/assistantStore';

export const SettingsPanel: React.FC = () => {
  const showSettings = useAssistantStore((s) => s.showSettings);
  const setShowSettings = useAssistantStore((s) => s.setShowSettings);
  const settings = useAssistantStore((s) => s.settings);
  const updateSettings = useAssistantStore((s) => s.updateSettings);
  const addToast = useAssistantStore((s) => s.addToast);

  const [localApiKey, setLocalApiKey] = useState('');
  const [localModel, setLocalModel] = useState(settings.model);
  const [localTemp, setLocalTemp] = useState(settings.temperature);
  const [localMaxTokens, setLocalMaxTokens] = useState(settings.maxTokens);
  const [localTTS, setLocalTTS] = useState(settings.ttsEnabled);
  const [localAlwaysOnTop, setLocalAlwaysOnTop] = useState(settings.alwaysOnTop);
  const [localQuality, setLocalQuality] = useState(settings.screenshotQuality);
  const [localStealthMode, setLocalStealthMode] = useState(settings.stealthMode);

  useEffect(() => {
    if (showSettings) {
      setLocalModel(settings.model);
      setLocalTemp(settings.temperature);
      setLocalMaxTokens(settings.maxTokens);
      setLocalTTS(settings.ttsEnabled);
      setLocalAlwaysOnTop(settings.alwaysOnTop);
      setLocalQuality(settings.screenshotQuality);
      setLocalStealthMode(settings.stealthMode);
      // Check if key exists
      window.electronAPI?.getApiKeyExists().then((exists) => {
        if (exists) setLocalApiKey('••••••••');
        else setLocalApiKey('');
      });
    }
  }, [showSettings]);

  if (!showSettings) return null;

  const handleSave = async () => {
    try {
      const newSettings = {
        ...settings,
        model: localModel,
        temperature: localTemp,
        maxTokens: localMaxTokens,
        ttsEnabled: localTTS,
        alwaysOnTop: localAlwaysOnTop,
        screenshotQuality: localQuality,
        stealthMode: localStealthMode,
        apiKey: localApiKey !== '••••••••' ? localApiKey : settings.apiKey,
      };

      updateSettings(newSettings);

      // Save to Electron main process
      await window.electronAPI?.saveSettings(newSettings);
      window.electronAPI?.setAlwaysOnTop(localAlwaysOnTop);
      window.electronAPI?.setStealthMode(localStealthMode);

      addToast({ message: 'Settings saved!', type: 'success', duration: 2000 });
      setShowSettings(false);
    } catch {
      addToast({ message: 'Failed to save settings.', type: 'error' });
    }
  };

  return (
    <div className="px-4 pb-3 animate-slide-up no-drag">
      <div className="bg-nexa-card/50 rounded-2xl border border-nexa-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-nexa-border/50">
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-nexa-accent">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="text-[11px] font-semibold text-nexa-text">Settings</span>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="text-nexa-text-dim hover:text-nexa-text transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-3.5 py-3 space-y-3 max-h-[300px] overflow-y-auto">
          {/* API Key */}
          <SettingField label="OpenAI API Key">
            <input
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="sk-..."
              className="settings-input"
            />
          </SettingField>

          {/* Model */}
          <SettingField label="Model">
            <select
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className="settings-input"
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </SettingField>

          {/* Temperature */}
          <SettingField label={`Temperature: ${localTemp.toFixed(1)}`}>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localTemp}
              onChange={(e) => setLocalTemp(parseFloat(e.target.value))}
              className="w-full h-1 bg-nexa-border rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </SettingField>

          {/* Max Tokens */}
          <SettingField label="Response Length (tokens)">
            <select
              value={localMaxTokens}
              onChange={(e) => setLocalMaxTokens(parseInt(e.target.value))}
              className="settings-input"
            >
              <option value="512">Short (512)</option>
              <option value="1024">Medium (1024)</option>
              <option value="2048">Long (2048)</option>
              <option value="4096">Very Long (4096)</option>
            </select>
          </SettingField>

          {/* Screenshot Quality */}
          <SettingField label="Screenshot Quality">
            <select
              value={localQuality}
              onChange={(e) => setLocalQuality(e.target.value as 'low' | 'medium' | 'high')}
              className="settings-input"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </SettingField>

          {/* Toggles */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-nexa-text-muted">Text-to-Speech</span>
            <Toggle checked={localTTS} onChange={setLocalTTS} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-nexa-text-muted">Always on Top</span>
            <Toggle checked={localAlwaysOnTop} onChange={setLocalAlwaysOnTop} />
          </div>

          {/* Stealth Mode */}
          <div className="pt-1 border-t border-nexa-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400 flex-shrink-0">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="text-[11px] text-nexa-text-muted">Stealth Mode</span>
              </div>
              <Toggle checked={localStealthMode} onChange={setLocalStealthMode} />
            </div>
            <p className="text-[9px] text-nexa-text-dim mt-1 ml-[18px] leading-relaxed">
              Invisible to screen sharing (Meet, Teams, Discord, LeetCode, Codeforces)
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="px-3.5 py-2.5 border-t border-nexa-border/50">
          <button
            onClick={handleSave}
            className="w-full py-2 rounded-xl text-xs font-medium
                       bg-gradient-to-r from-blue-500 to-blue-600 text-white
                       hover:from-blue-600 hover:to-blue-700 shadow-glow
                       transition-all duration-200"
          >
            Save Settings
          </button>
        </div>
      </div>

      <style>{`
        .settings-input {
          width: 100%;
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 11px;
          color: #e4e7eb;
          background: #111315;
          border: 1px solid #2a2e35;
          outline: none;
          transition: border-color 200ms;
        }
        .settings-input:focus {
          border-color: rgba(59, 130, 246, 0.4);
        }
        .settings-input option {
          background: #1a1d21;
          color: #e4e7eb;
        }
      `}</style>
    </div>
  );
};

const SettingField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-[11px] text-nexa-text-muted font-medium">{label}</label>
    {children}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative w-8 h-[18px] rounded-full transition-all duration-200 ${
      checked ? 'bg-nexa-accent' : 'bg-nexa-border'
    }`}
  >
    <div
      className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? 'translate-x-[16px]' : 'translate-x-[2px]'
      }`}
    />
  </button>
);
