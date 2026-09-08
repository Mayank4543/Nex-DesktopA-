import type { ScreenshotData } from '../../types/assistant';

/**
 * Screenshot service — captures the screen via Electron IPC.
 * The actual capture happens in the main process for security.
 */
export class ScreenshotService {
  async captureFullScreen(): Promise<ScreenshotData | null> {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return null;
    }

    try {
      const screenshot = await window.electronAPI.captureScreen();
      return screenshot;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
    }
  }

  /**
   * Crop a region from a full screenshot.
   */
  cropRegion(
    screenshotDataUrl: string,
    region: { x: number; y: number; width: number; height: number },
    sourceWidth: number,
    sourceHeight: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = region.width;
        canvas.height = region.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Scale region coordinates to actual image dimensions
        const scaleX = img.naturalWidth / sourceWidth;
        const scaleY = img.naturalHeight / sourceHeight;

        ctx.drawImage(
          img,
          region.x * scaleX,
          region.y * scaleY,
          region.width * scaleX,
          region.height * scaleY,
          0,
          0,
          region.width,
          region.height,
        );

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load screenshot'));
      img.src = screenshotDataUrl;
    });
  }
}

export const screenshotService = new ScreenshotService();
