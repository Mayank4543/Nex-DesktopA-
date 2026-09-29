import { app, BrowserWindow, desktopCapturer, ipcMain, session } from 'electron';
import * as path from 'path';
import { registerScreenshotHandlers } from './ipc/screenshot';
import { registerShortcuts, unregisterShortcuts } from './ipc/shortcuts';
import { registerSettingsHandlers, loadSettings } from './ipc/settings';
import { registerAIHandlers } from './ipc/ai';
import { registerTranscriptionHandlers, closeTranscription } from './ipc/transcription';
// Handle Squirrel events for Windows installer
try {
  if (require('electron-squirrel-startup')) app.quit();
} catch {
  // ignore in non-squirrel dev environments
}

let mainWindow: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow(): void {
  const settings = loadSettings();

  mainWindow = new BrowserWindow({
    width: 900,
    height: 520,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: settings.alwaysOnTop ?? true,
    skipTaskbar: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for preload
      webSecurity: true,
    },
  });

  const stealthEnabled = settings.stealthMode ?? true;

  if (stealthEnabled) {
    mainWindow.setContentProtection(true);
  }

  // Show window when ready to prevent flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();

    if (stealthEnabled) {
      mainWindow?.setContentProtection(true);
    }
  });

  // Load the app
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Window controls via IPC
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-close', () => {
    mainWindow?.hide();
  });

  ipcMain.on('set-always-on-top', (_event, value: boolean) => {
    mainWindow?.setAlwaysOnTop(value);
  });

  // Stealth mode — toggle content protection (invisible to screen capture)
  ipcMain.on('set-stealth-mode', (_event, value: boolean) => {
    mainWindow?.setContentProtection(value);
  });

  // TTS handlers (use system speech synthesis via a simple approach)
  ipcMain.handle('speak', async (_event, _text: string) => {
    // TTS is handled in the renderer using Web Speech API
    return true;
  });

  ipcMain.handle('stop-speaking', async () => {
    return true;
  });

  // OCR handler — runs Tesseract.js in main process
  ipcMain.handle('run-ocr', async (_event, imageDataUrl: string) => {
    try {
      const Tesseract = await import('tesseract.js');
      const { data } = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: () => {},
      });
      return {
        text: data.text,
        confidence: data.confidence,
      };
    } catch (error) {
      console.error('OCR failed:', error);
      return { text: '', confidence: 0 };
    }
  });

  // Register keyboard shortcuts
  registerShortcuts(mainWindow);

  // Security: restrict navigation
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // Security: block new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    closeTranscription();
    mainWindow = null;
  });
}

// Security & Permissions setup
app.on('ready', () => {
  // Allow microphone/media/speech permissions in Electron

  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        if (!sources.length) {
          console.error('[DisplayMedia] No screen sources found');
          callback({ video: null as any }); // deny — renderer fallback will use mic
          return;
        }
        callback({ video: sources[0], audio: 'loopback' }); // system audio
      } catch (err) {
        console.error('[DisplayMedia] Handler error:', err);
        callback({ video: null as any }); // deny — renderer fallback will use mic
      }
    },
  );
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowedPermissions = ['media', 'audioCapture', 'microphone', 'display-capture'];
    callback(allowedPermissions.includes(permission));
  });

  // Also handle permission checks (not just requests)
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowedPermissions = ['media', 'audioCapture', 'microphone', 'display-capture'];
    return allowedPermissions.includes(permission);
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; connect-src 'self' https://api.openai.com https://*.google.com wss://*.google.com",
        ],
      },
    });
  });
});

app.whenReady().then(() => {
  // Register IPC handlers before creating window
  registerScreenshotHandlers();
  registerSettingsHandlers();
  registerAIHandlers();
  registerTranscriptionHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  unregisterShortcuts();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  closeTranscription();
  unregisterShortcuts();
});
