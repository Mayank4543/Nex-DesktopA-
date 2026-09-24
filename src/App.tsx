import React, { useEffect } from 'react';
import { FloatingAssistant } from './components/FloatingAssistant';
import { ScreenshotSelector } from './components/ScreenshotSelector';
import { Toast } from './components/Toast';
import { useAssistantStore } from './store/assistantStore';
import type { ScreenshotData } from './types/assistant';

const App: React.FC = () => {
  const setShowScreenshotSelector = useAssistantStore((s) => s.setShowScreenshotSelector);
  const setScreenshotDataUrl = useAssistantStore((s) => s.setScreenshotDataUrl);
  const setScreenshot = useAssistantStore((s) => s.setScreenshot);
  const addToast = useAssistantStore((s) => s.addToast);
  const updateSettings = useAssistantStore((s) => s.updateSettings);

  // Load settings and register shortcut listeners on mount
  useEffect(() => {
    // Load saved settings from Electron
    window.electronAPI?.getSettings().then((settings) => {
      if (settings) {
        updateSettings(settings);
      }
    });

    // Register shortcut listener for other actions
    window.electronAPI?.onShortcut((action: string) => {
      switch (action) {
        case 'focus':
          // Window is already focused by the main process
          break;
      }
    });

    // Listen for screenshot captured directly from main process
    // (main process hides window, captures screen, shows window, then sends data here)
    window.electronAPI?.onScreenshotCaptured((data: ScreenshotData | null) => {
      if (data) {
        setScreenshot(data);
        setScreenshotDataUrl(data.dataUrl);
        addToast({ message: 'Screenshot captured! Type your question and send.', type: 'success' });
      } else {
        addToast({ message: 'Failed to capture screen.', type: 'error' });
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
