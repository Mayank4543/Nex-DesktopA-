import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // AI
  askAI: (request: { prompt: string; context?: string; action?: string }) =>
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

  // Shortcuts listener
  onShortcut: (callback: (action: string) => void) => {
    ipcRenderer.on('shortcut-action', (_event, action: string) => callback(action));
  },
  removeShortcutListeners: () => {
    ipcRenderer.removeAllListeners('shortcut-action');
  },
});
