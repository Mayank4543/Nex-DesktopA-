import { ipcMain } from 'electron';
import OpenAI from 'openai';
import { getApiKey, loadSettings } from './settings';

function getSystemPrompt(action?: string): string {
  switch (action) {
    case 'answer':
      return 'You are a helpful AI assistant. Analyze the provided question or context and give a concise, accurate answer. If code is involved, explain it clearly.';
    case 'clarify':
      return 'You are a helpful AI assistant. Explain the provided context in simpler, clearer language. Break down complex concepts into easy-to-understand explanations.';
    case 'recap':
      return 'You are a helpful AI assistant. Provide a concise summary/recap of the given context or conversation. Highlight the key points.';
    case 'followup':
      return 'You are a helpful AI assistant. Based on the given context, generate 3-5 useful follow-up questions that would deepen understanding of the topic.';
    case 'analyze-code':
      return 'You are an expert code analyst. Analyze the provided code and explain: what it does, potential bugs, performance issues, and suggest improvements. Format code examples in markdown code blocks.';
    case 'debug-code':
      return 'You are an expert debugger. Identify bugs, errors, and issues in the provided code. Suggest fixes with clear explanations. Format code in markdown code blocks.';
    case 'explain-error':
      return 'You are an expert at explaining programming errors. Explain what the error means, why it occurs, and how to fix it. Provide corrected code examples.';
    case 'explain':
      return 'You are a helpful AI assistant. Provide a more detailed explanation of the topic or answer. Go deeper into the concepts involved.';
    case 'summarize':
      return 'You are a helpful AI assistant. Summarize the provided content concisely, capturing the essential information.';
    default:
      return 'You are Nexa, a helpful and knowledgeable AI assistant. Provide clear, accurate, and well-formatted responses. Use markdown for formatting when appropriate, including code blocks with language tags for any code.';
  }
}

export function registerAIHandlers(): void {
  ipcMain.handle('ask-ai', async (_event, request: { prompt: string; context?: string; action?: string; imageDataUrl?: string }) => {
    const apiKey = getApiKey();

    if (!apiKey) {
      return { content: '', error: 'API key not configured. Please set your OpenAI API key in Settings.' };
    }

    try {
      const settings = loadSettings();
      const openai = new OpenAI({ apiKey });

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: getSystemPrompt(request.action) },
      ];

      // Build user message — with or without image
      if (request.imageDataUrl) {
        // Vision API: send image + text as multi-part content
        const userContent: OpenAI.ChatCompletionContentPart[] = [];

        // Add the image
        userContent.push({
          type: 'image_url',
          image_url: {
            url: request.imageDataUrl,
            detail: 'high',
          },
        });

        // Build text prompt
        let textPrompt = '';
        if (request.context) {
          textPrompt += `Context:\n\`\`\`\n${request.context}\n\`\`\`\n\n`;
        }
        textPrompt += request.prompt;

        userContent.push({
          type: 'text',
          text: textPrompt,
        });

        messages.push({ role: 'user', content: userContent });
      } else if (request.context) {
        messages.push({
          role: 'user',
          content: `Context:\n\`\`\`\n${request.context}\n\`\`\`\n\nQuestion: ${request.prompt}`,
        });
      } else {
        messages.push({ role: 'user', content: request.prompt });
      }

      // Use a vision-capable model when image is present
      const model = request.imageDataUrl
        ? (settings.model?.includes('gpt-4') ? settings.model : 'gpt-4o-mini')
        : (settings.model || 'gpt-4o-mini');

      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature: settings.temperature ?? 0.7,
        max_tokens: settings.maxTokens ?? 2048,
      });

      const content = completion.choices[0]?.message?.content || 'No response generated.';
      return { content };
    } catch (error: unknown) {
      const err = error as Error & { status?: number; code?: string };
      console.error('AI request failed:', err);

      if (err.status === 429) {
        return { content: '', error: 'Rate limit exceeded. Please wait a moment and try again.' };
      }
      if (err.status === 401) {
        return { content: '', error: 'Invalid API key. Please check your OpenAI API key in Settings.' };
      }
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        return { content: '', error: 'Network error. Please check your internet connection.' };
      }

      return { content: '', error: `AI request failed: ${err.message || 'Unknown error'}` };
    }
  });
}
