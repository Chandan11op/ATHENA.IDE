import path from 'path';
import { app, BrowserWindow } from 'electron';
import { SettingsManager } from './settings.js';
import { registerIpcHandlers } from './ipc.js';
import { hardenBrowserWindow } from './security.js';

let mainWindow: BrowserWindow | null = null;
const settingsManager = new SettingsManager();

function createWindow(): void {
  const isDev = process.env.NODE_ENV === 'development';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    frame: true,
    title: 'NOVA IDE',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Apply non-negotiable security controls
  hardenBrowserWindow(mainWindow);

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpcHandlers(settingsManager, () => mainWindow);
    createWindow();

    if (process.env.ELECTRON_SMOKE_TEST === '1') {
      console.log('[SmokeTest] Main window initialized and IPC handlers registered successfully.');
      setTimeout(() => {
        console.log('[SmokeTest] Exiting cleanly.');
        app.quit();
      }, 1000);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
