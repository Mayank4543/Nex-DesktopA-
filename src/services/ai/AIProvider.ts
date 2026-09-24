import type { AIResponse, ActionType } from '../../types/assistant';

/**
 * Abstract AI provider interface.
 * Implement this interface to add new AI backends (e.g., Anthropic, Google, local LLM).
 */
export interface AIProvider {
  /**
   * Send a prompt to the AI and get a response.
   * @param prompt - The user's question or instruction
   * @param context - Optional context (e.g., OCR text, code snippet)
   * @param action - Optional action type to customize the AI's behavior
   * @param imageDataUrl - Optional screenshot image data URL for vision analysis
   */
  ask(prompt: string, context?: string, action?: ActionType, imageDataUrl?: string): Promise<AIResponse>;


  /**
   * Check if the provider is properly configured (e.g., API key exists).
   */
  isConfigured(): Promise<boolean>;
}
