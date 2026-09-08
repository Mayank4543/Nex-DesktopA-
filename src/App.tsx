import React, { useEffect } from 'react';
import { FloatingAssistant } from './components/FloatingAssistant';
import { ScreenshotSelector } from './components/ScreenshotSelector';
import { Toast } from './components/Toast';
import { useAssistantStore } from './store/assistantStore';

const App: React.FC = () => {
  const setShowScreenshotSelector = useAssistantStore((s) => s.setShowScreenshotSelector);
  const updateSettings = useAssistantStore((s) => s.updateSettings);

  // Load settings and register shortcut listeners on mount
  useEffect(() => {
    // Load saved settings from Electron
    window.electronAPI?.getSettings().then((settings) => {
      if (settings) {
        updateSettings(settings);
      }
    });

    // Register shortcut listener
    window.electronAPI?.onShortcut((action: string) => {
      switch (action) {
        case 'capture-screen':
          setShowScreenshotSelector(true);
          break;
        case 'focus':
          // Window is already focused by the main process
          break;
      }
    });

    return () => {
      window.electronAPI?.removeShortcutListeners();
    };
  }, []);

  return (
    <div className="w-full h-full p-1">
      {/* Main floating assistant */}
      <FloatingAssistant />

      {/* Screenshot selector overlay */}
      <ScreenshotSelector />

      {/* Toast notifications */}
      <Toast />
    </div>
  );
};

export default App;
