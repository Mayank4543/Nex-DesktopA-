import type { OCRResult } from '../../types/assistant';

/**
 * Abstract OCR provider interface.
 * Implement this to add different OCR backends (e.g., Google Vision, Azure, local Tesseract).
 */
export interface OCRProvider {
  recognize(imageDataUrl: string): Promise<OCRResult>;
}

/**
 * Tesseract.js OCR provider — runs via Electron IPC in the main process.
 */
export class TesseractOCRProvider implements OCRProvider {
  async recognize(imageDataUrl: string): Promise<OCRResult> {
    if (!window.electronAPI) {
      return { text: '', confidence: 0 };
    }

    try {
      const result = await window.electronAPI.runOCR(imageDataUrl);
      return result;
    } catch (error) {
      console.error('OCR failed:', error);
      return { text: '', confidence: 0 };
    }
  }
}

export const ocrProvider = new TesseractOCRProvider();
