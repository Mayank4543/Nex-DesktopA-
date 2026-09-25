// ─── Settings ───────────────────────────────────────────────────────────────

export interface AppSettings {
  aiProvider: 'openai';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  ttsEnabled: boolean;
  ttsVoice: string;
  alwaysOnTop: boolean;
  startWithWindows: boolean;
  screenshotQuality: 'low' | 'medium' | 'high';
  stealthMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2048,
  ttsEnabled: true,
  ttsVoice: 'default',
  alwaysOnTop: true,
  startWithWindows: false,
  screenshotQuality: 'high',
  stealthMode: true,
};

// ─── AI ─────────────────────────────────────────────────────────────────────

export type ActionType =
  | 'answer'
  | 'clarify'
  | 'recap'
  | 'followup'
  | 'listen'
  | 'explain'
  | 'summarize'
  | 'analyze-code'
  | 'debug-code'
  | 'explain-error';

export interface AIRequest {
  prompt: string;
  context?: string;
  action?: ActionType;
  imageDataUrl?: string;
}

export interface AIResponse {
  content: string;
  error?: string;
}

// ─── Screenshot & OCR ───────────────────────────────────────────────────────

export interface ScreenshotData {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface RegionSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
}

// ─── Chat History ───────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  screenshotDataUrl?: string;
  timestamp: number;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export interface AssistantState {
  // Input
  input: string;
  currentContext: string;
  screenshot: ScreenshotData | null;
  screenshotDataUrl: string;
  ocrText: string;
  screenshotPreview: string;

  // Output
  answer: string;
  isLoading: boolean;
  isStreaming: boolean;
  isSpeaking: boolean;
  activeAction: ActionType | null;

  // Chat history
  messages: ChatMessage[];

  // UI
  showSettings: boolean;
  showScreenshotSelector: boolean;
  showAnswerPanel: boolean;

  // Settings
  settings: AppSettings;

  // Toast
  toasts: Toast[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface AssistantActions {
  setInput: (input: string) => void;
  setContext: (context: string) => void;
  setOCRText: (text: string) => void;
  setScreenshot: (screenshot: ScreenshotData | null) => void;
  setScreenshotDataUrl: (dataUrl: string) => void;
  setScreenshotPreview: (preview: string) => void;
  clearScreenshot: () => void;
  setAnswer: (answer: string) => void;
  appendAnswer: (chunk: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  setIsSpeaking: (speaking: boolean) => void;
  setActiveAction: (action: ActionType | null) => void;
  setShowSettings: (show: boolean) => void;
  setShowScreenshotSelector: (show: boolean) => void;
  setShowAnswerPanel: (show: boolean) => void;
  clearAnswer: () => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  reset: () => void;
}

// ─── Electron IPC Bridge ────────────────────────────────────────────────────

export interface ElectronAPI {
  askAI: (request: { prompt: string; context?: string; action?: string; imageDataUrl?: string }) => Promise<AIResponse>;
  captureScreen: () => Promise<ScreenshotData | null>;
  runOCR: (imageDataUrl: string) => Promise<OCRResult>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => Promise<void>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  minimize: () => void;
  close: () => void;
  setAlwaysOnTop: (value: boolean) => void;
  setStealthMode: (value: boolean) => void;
  onShortcut: (callback: (action: string) => void) => void;
  onScreenshotCaptured: (callback: (data: ScreenshotData | null) => void) => void;
  removeShortcutListeners: () => void;
  getApiKeyExists: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
