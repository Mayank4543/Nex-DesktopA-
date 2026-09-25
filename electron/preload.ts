import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // AI
  askAI: (request: { prompt: string; context?: string; action?: string; imageDataUrl?: string }) =>
    ipcRenderer.invoke('ask-ai', request),

  // Screenshot
  captureScreen: () => ipcRenderer.invoke('capture-screen'),

  // OCR
  runOCR: (imageDataUrl: string) => ipcRenderer.invoke('run-ocr', imageDataUrl),

  // Text-to-Speech
  speak: (text: string) => ipcRenderer.invoke('speak', text),
  stopSpeaking: () => ipcRenderer.invoke('stop-speaking'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('save-settings', settings),
  getApiKeyExists: () => ipcRenderer.invoke('get-api-key-exists'),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  setAlwaysOnTop: (value: boolean) => ipcRenderer.send('set-always-on-top', value),
  setStealthMode: (value: boolean) => ipcRenderer.send('set-stealth-mode', value),

  // Shortcuts listener
  onShortcut: (callback: (action: string) => void) => {
    ipcRenderer.on('shortcut-action', (_event, action: string) => callback(action));
  },
  // Screenshot captured listener (main process sends screenshot data directly)
  onScreenshotCaptured: (callback: (data: unknown) => void) => {
    ipcRenderer.on('screenshot-captured', (_event, data: unknown) => callback(data));
  },
  removeShortcutListeners: () => {
    ipcRenderer.removeAllListeners('shortcut-action');
    ipcRenderer.removeAllListeners('screenshot-captured');
  },
});
