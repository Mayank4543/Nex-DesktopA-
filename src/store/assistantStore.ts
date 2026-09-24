import { create } from 'zustand';
import type {
  AssistantState,
  AssistantActions,
  ActionType,
  AppSettings,
  ScreenshotData,
  Toast,
  DEFAULT_SETTINGS,
} from '../types/assistant';
import { openAIProvider } from '../services/ai/OpenAIProvider';

const initialSettings: AppSettings = {
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
};

const initialState: AssistantState = {
  input: '',
  currentContext: '',
  screenshot: null,
  screenshotDataUrl: '',
  ocrText: '',
  screenshotPreview: '',
  answer: '',
  isLoading: false,
  isStreaming: false,
  isSpeaking: false,
  activeAction: null,
  showSettings: false,
  showScreenshotSelector: false,
  showAnswerPanel: false,
  settings: initialSettings,
  toasts: [],
};

let toastCounter = 0;

export const useAssistantStore = create<AssistantState & AssistantActions>((set, get) => ({
  ...initialState,

  // ─── Setters ────────────────────────────────────────────────

  setInput: (input: string) => set({ input }),
  setContext: (context: string) => set({ currentContext: context }),
  setOCRText: (text: string) => set({ ocrText: text, currentContext: text }),
  setScreenshot: (screenshot: ScreenshotData | null) => set({ screenshot }),
  setScreenshotDataUrl: (dataUrl: string) => set({ screenshotDataUrl: dataUrl }),
  setScreenshotPreview: (preview: string) => set({ screenshotPreview: preview }),
  setAnswer: (answer: string) => set({ answer, showAnswerPanel: true }),
  appendAnswer: (chunk: string) => set((state) => ({ answer: state.answer + chunk })),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setIsStreaming: (streaming: boolean) => set({ isStreaming: streaming }),
  setIsSpeaking: (speaking: boolean) => set({ isSpeaking: speaking }),
  setActiveAction: (action: ActionType | null) => set({ activeAction: action }),
  setShowSettings: (show: boolean) => set({ showSettings: show }),
  setShowScreenshotSelector: (show: boolean) => set({ showScreenshotSelector: show }),
  setShowAnswerPanel: (show: boolean) => set({ showAnswerPanel: show }),

  clearAnswer: () =>
    set({
      answer: '',
      showAnswerPanel: false,
      activeAction: null,
      isStreaming: false,
    }),

  clearScreenshot: () =>
    set({
      screenshot: null,
      screenshotDataUrl: '',
      screenshotPreview: '',
      ocrText: '',
      currentContext: '',
    }),

  updateSettings: (newSettings: Partial<AppSettings>) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  // ─── Toast ──────────────────────────────────────────────────

  addToast: (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    // Auto-remove after duration
    setTimeout(() => {
      get().removeToast(id);
    }, toast.duration || 4000);
  },

  removeToast: (id: string) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // ─── Reset ──────────────────────────────────────────────────

  reset: () =>
    set({
      input: '',
      currentContext: '',
      screenshot: null,
      screenshotDataUrl: '',
      ocrText: '',
      screenshotPreview: '',
      answer: '',
      isLoading: false,
      isStreaming: false,
      activeAction: null,
      showAnswerPanel: false,
    }),
}));
