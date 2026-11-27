import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../common/channels.js';
import { NovaApi, NovaSettings } from '../common/types.js';

/**
 * Preload script exposing strictly validated NovaApi to the renderer.
 * Context isolation is strictly enforced. No Node primitives exposed.
 */
const api: NovaApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INFO),
  getSystemMetrics: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_SYSTEM_METRICS),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  setSetting: <K extends keyof NovaSettings>(key: K, value: NovaSettings[K]) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_VALUE, { key, value }),
  selectWorkspaceDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SELECT_DIRECTORY),
  getCurrentWorkspace: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_CURRENT),
  checkOllamaStatus: (endpoint?: string) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_PING, endpoint),
  listOllamaModels: (endpoint?: string) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_LIST_MODELS, endpoint),
  minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
};

try {
  contextBridge.exposeInMainWorld('novaApi', api);
} catch (err) {
  console.error('[Preload] Failed to expose novaApi in main world:', err);
}
