import type { AIProvider } from './AIProvider';
import type { AIResponse, ActionType } from '../../types/assistant';

/**
 * OpenAI provider implementation.
 * All API calls go through Electron IPC to the main process
 * so the API key is never exposed to the renderer.
 */
export class OpenAIProvider implements AIProvider {
  async ask(prompt: string, context?: string, action?: ActionType, imageDataUrl?: string): Promise<AIResponse> {
    if (!window.electronAPI) {
      return { content: '', error: 'Electron API not available.' };
    }

    try {
      const response = await window.electronAPI.askAI({
        prompt,
        context,
        action,
        imageDataUrl,
      });

      return response;
    } catch (error) {
      const err = error as Error;
      return { content: '', error: err.message || 'Failed to communicate with AI service.' };
    }
  }

  async isConfigured(): Promise<boolean> {
    if (!window.electronAPI) return false;
    try {
      return await window.electronAPI.getApiKeyExists();
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const openAIProvider = new OpenAIProvider();
