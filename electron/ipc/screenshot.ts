import { ipcMain, desktopCapturer, screen } from 'electron';

export function registerScreenshotHandlers(): void {
  ipcMain.handle('capture-screen', async () => {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      const scaleFactor = primaryDisplay.scaleFactor;

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.round(width * scaleFactor),
          height: Math.round(height * scaleFactor),
        },
      });

      if (sources.length === 0) {
        return null;
      }

      const source = sources[0];
      const dataUrl = source.thumbnail.toDataURL('image/png');

      return {
        dataUrl,
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
    }
  });
}
