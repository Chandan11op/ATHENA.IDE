import path from 'path';
import { app, BrowserWindow, Menu, shell } from 'electron';
import { IPC_CHANNELS } from '../common/channels.js';
import { AthenaDataManager } from './athenaData.js';
import { ExtensionManager } from './extensions.js';
import { GitHubService } from './github.js';
import { registerIpcHandlers } from './ipc.js';
import { KnowledgeService } from './knowledge.js';
import { ProjectRunner } from './runner.js';
import { hardenBrowserWindow } from './security.js';
import { SettingsManager } from './settings.js';
import { TerminalManager } from './terminal.js';

let mainWindow: BrowserWindow | null = null;
const dataManager = new AthenaDataManager();
const settingsManager = new SettingsManager(undefined, dataManager);
const terminalManager = new TerminalManager();
const projectRunner = new ProjectRunner();
const knowledgeService = new KnowledgeService(dataManager);
const githubService = new GitHubService(dataManager);
const extensionManager = new ExtensionManager(dataManager);

function sendMenuAction(action: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.APP_MENU_ACTION, action);
  }
}

function buildApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New File...', accelerator: 'CmdOrCtrl+N', click: () => sendMenuAction('file:new') },
        { label: 'Open Folder...', accelerator: 'CmdOrCtrl+O', click: () => sendMenuAction('file:open-folder') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenuAction('file:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendMenuAction('file:save-as') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => sendMenuAction('view:settings') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Selection',
      submenu: [
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Command Palette...', accelerator: 'CmdOrCtrl+Shift+P', click: () => sendMenuAction('view:command-palette') },
        { type: 'separator' },
        { label: 'Explorer', accelerator: 'CmdOrCtrl+Shift+E', click: () => sendMenuAction('view:explorer') },
        { label: 'Search', accelerator: 'CmdOrCtrl+Shift+F', click: () => sendMenuAction('view:search') },
        { label: 'Source Control', accelerator: 'CmdOrCtrl+Shift+G', click: () => sendMenuAction('view:git') },
        { label: 'Run and Debug', accelerator: 'CmdOrCtrl+Shift+D', click: () => sendMenuAction('view:run') },
        { label: 'Extensions', accelerator: 'CmdOrCtrl+Shift+X', click: () => sendMenuAction('view:extensions') },
        { label: 'Athena AI', accelerator: 'CmdOrCtrl+L', click: () => sendMenuAction('view:ai') },
        { type: 'separator' },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => sendMenuAction('view:toggle-sidebar') },
        { label: 'Toggle Bottom Panel', accelerator: 'CmdOrCtrl+J', click: () => sendMenuAction('view:toggle-panel') },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Go',
      submenu: [
        { label: 'Command Palette...', click: () => sendMenuAction('view:command-palette') },
      ],
    },
    {
      label: 'Run',
      submenu: [
        { label: 'Open Run & Preview', click: () => sendMenuAction('view:run') },
        { label: 'Stop Running Process', click: () => sendMenuAction('run:stop') },
      ],
    },
    {
      label: 'Terminal',
      submenu: [
        { label: 'New Terminal', accelerator: 'CmdOrCtrl+`', click: () => sendMenuAction('terminal:new') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Local AI Setup (Ollama)', click: () => sendMenuAction('help:ollama') },
        {
          label: 'Athena.IDE Website',
          click: () => shell.openExternal('https://athenaide.vercel.app/'),
        },
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/Chandan11op/ATHENA.IDE'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
  const isDev = process.env.NODE_ENV === 'development';

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    frame: true,
    title: 'Athena.IDE',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

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
    dataManager.ensureStructure();
    buildApplicationMenu();
    registerIpcHandlers(
      {
        dataManager,
        settingsManager,
        terminalManager,
        projectRunner,
        knowledgeService,
        githubService,
        extensionManager,
      },
      () => mainWindow
    );
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

  app.on('before-quit', () => {
    terminalManager.closeAll();
    void projectRunner.stop();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
