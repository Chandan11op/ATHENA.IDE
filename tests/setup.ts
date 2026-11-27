import { vi } from 'vitest';

vi.mock('electron', () => {
  return {
    app: {
      getPath: (_name: string) => 'C:\\tmp\\nova-data',
      requestSingleInstanceLock: () => true,
      quit: vi.fn(),
      whenReady: () => Promise.resolve(),
      on: vi.fn(),
    },
    BrowserWindow: vi.fn().mockImplementation(() => ({
      webContents: {
        on: vi.fn(),
        setWindowOpenHandler: vi.fn(),
      },
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      on: vi.fn(),
      minimize: vi.fn(),
      maximize: vi.fn(),
      unmaximize: vi.fn(),
      isMaximized: vi.fn().mockReturnValue(false),
      close: vi.fn(),
    })),
    shell: {
      openExternal: vi.fn().mockResolvedValue(true),
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
    },
    ipcRenderer: {
      invoke: vi.fn(),
      send: vi.fn(),
    },
    dialog: {
      showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['C:\\projects\\demo'] }),
    },
  };
});
