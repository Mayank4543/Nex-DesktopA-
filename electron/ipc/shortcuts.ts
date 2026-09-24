import { globalShortcut, BrowserWindow, desktopCapturer, screen } from 'electron';

export function registerShortcuts(mainWindow: BrowserWindow): void {
  // Ctrl+Shift+H — Capture screenshot (hides window first so it's not in the screenshot)
  globalShortcut.register('CommandOrControl+Shift+H', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    try {
      // 1. Hide the window so it doesn't appear in the screenshot
      mainWindow.hide();

      // 2. Wait for the window to fully disappear from screen
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 3. Capture the screen while window is hidden
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

      let screenshotData = null;
      if (sources.length > 0) {
        const source = sources[0];
        const dataUrl = source.thumbnail.toDataURL('image/png');
        screenshotData = {
          dataUrl,
          width: Math.round(width * scaleFactor),
          height: Math.round(height * scaleFactor),
          timestamp: Date.now(),
        };
      }

      // 4. Show the window back AFTER capture is complete
      mainWindow.show();
      mainWindow.focus();

      // 5. Send the captured screenshot data to the renderer
      if (screenshotData) {
        mainWindow.webContents.send('screenshot-captured', screenshotData);
      } else {
        mainWindow.webContents.send('screenshot-captured', null);
      }
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      // Make sure window is shown even if capture fails
      if (!mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('screenshot-captured', null);
      }
    }
  });

  // Ctrl+Shift+Space — Focus the assistant window
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('shortcut-action', 'focus');
    }
  });

  // Ctrl+D — Toggle window visibility (hide/show)
  globalShortcut.register('CommandOrControl+D', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}
