import { globalShortcut, BrowserWindow } from 'electron';

export function registerShortcuts(mainWindow: BrowserWindow): void {
  // Ctrl+Shift+H — Start user-initiated screenshot selection
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('shortcut-action', 'capture-screen');
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
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}
