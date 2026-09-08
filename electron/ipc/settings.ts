import { ipcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const SETTINGS_FILE = path.join(app.getPath('userData'), 'nexa-settings.json');

const DEFAULT_SETTINGS = {
  aiProvider: 'openai' as const,
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2048,
  ttsEnabled: true,
  ttsVoice: 'default',
  alwaysOnTop: true,
  startWithWindows: false,
  screenshotQuality: 'high' as const,
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettingsToDisk(settings: Record<string, unknown>) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Never persist API key to disk — it stays in memory only
    const { apiKey: _apiKey, ...safeSettings } = settings;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(safeSettings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// In-memory API key (loaded from env or set at runtime)
let runtimeApiKey = process.env.OPENAI_API_KEY || '';

export function getApiKey(): string {
  return runtimeApiKey;
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('get-settings', async () => {
    const settings = loadSettings();
    // Return settings with masked API key status
    return { ...settings, apiKey: runtimeApiKey ? '••••••••' : '' };
  });

  ipcMain.handle('save-settings', async (_event, settings) => {
    if (settings.apiKey && settings.apiKey !== '••••••••') {
      runtimeApiKey = settings.apiKey;
    }
    saveSettingsToDisk(settings);
    return true;
  });

  ipcMain.handle('get-api-key-exists', async () => {
    return runtimeApiKey.length > 0;
  });
}

export { loadSettings };
