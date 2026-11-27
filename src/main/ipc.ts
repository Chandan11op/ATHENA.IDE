import os from 'os';
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../common/channels.js';
import { SettingsManager } from './settings.js';
import { checkOllamaAvailability } from './ollama.js';
import { AppInfo, SystemMetrics, NovaSettings, WorkspaceDirectoryResult } from '../common/types.js';

export function registerIpcHandlers(
  settingsManager: SettingsManager,
  getMainWindow: () => BrowserWindow | null
): void {
  // Application Information
  ipcMain.handle(IPC_CHANNELS.APP_GET_INFO, async (): Promise<AppInfo> => {
    return {
      name: 'Athena.IDE',
      version: '0.1.0',
      platform: process.platform,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
    };
  });

  // System Metrics
  ipcMain.handle(IPC_CHANNELS.APP_GET_SYSTEM_METRICS, async (): Promise<SystemMetrics> => {
    const cpus = os.cpus();
    return {
      totalMemoryBytes: os.totalmem(),
      freeMemoryBytes: os.freemem(),
      cpuModel: cpus.length > 0 ? cpus[0].model : 'Unknown CPU',
      cpuCores: cpus.length,
      platform: os.platform(),
    };
  });

  // Settings Handlers
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async (): Promise<NovaSettings> => {
    return settingsManager.getAll();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET_VALUE,
    async (_event, { key, value }: { key: keyof NovaSettings; value: any }): Promise<boolean> => {
      // Validate key against allowed settings keys
      const allowedKeys: (keyof NovaSettings)[] = [
        'mode',
        'theme',
        'ollamaEndpoint',
        'selectedModel',
        'workspacePath',
        'autoCheckpoint',
        'maxRepairRetries',
      ];

      if (!allowedKeys.includes(key)) {
        console.warn(`[Security] Rejected invalid settings key: ${String(key)}`);
        return false;
      }

      return settingsManager.set(key, value);
    }
  );

  // Workspace Folder Selection Dialog (Electron Native Dialog)
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_SELECT_DIRECTORY, async (): Promise<WorkspaceDirectoryResult> => {
    const win = getMainWindow();
    if (!win) {
      return { canceled: true, path: null, error: 'Main window not ready' };
    }

    const result = await dialog.showOpenDialog(win, {
      title: 'Select Athena.IDE Project Workspace',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: null };
    }

    const selectedPath = result.filePaths[0];
    settingsManager.set('workspacePath', selectedPath);

    return {
      canceled: false,
      path: selectedPath,
    };
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_GET_CURRENT, async (): Promise<string | null> => {
    return settingsManager.get('workspacePath') || null;
  });

  // Local Ollama Runtime Handlers
  ipcMain.handle(IPC_CHANNELS.OLLAMA_PING, async (_event, endpoint?: string) => {
    const targetEndpoint = endpoint || settingsManager.get('ollamaEndpoint');
    return checkOllamaAvailability(targetEndpoint);
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA_LIST_MODELS, async (_event, endpoint?: string) => {
    const targetEndpoint = endpoint || settingsManager.get('ollamaEndpoint');
    const status = await checkOllamaAvailability(targetEndpoint);
    return status.models;
  });

  // Window Controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    const win = getMainWindow();
    if (win) win.minimize();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    const win = getMainWindow();
    if (win) win.close();
  });
}
