/**
 * Secure IPC Channel Identifiers
 * All IPC channels are strictly allowlisted and mapped here.
 */
export const IPC_CHANNELS = {
  // Application & System
  APP_GET_INFO: 'nova:app:get-info',
  APP_GET_SYSTEM_METRICS: 'nova:app:get-system-metrics',

  // Settings & Storage
  SETTINGS_GET_ALL: 'nova:settings:get-all',
  SETTINGS_SET_VALUE: 'nova:settings:set-value',

  // Workspace Operations (Safe Dialogs)
  WORKSPACE_SELECT_DIRECTORY: 'nova:workspace:select-directory',
  WORKSPACE_GET_CURRENT: 'nova:workspace:get-current',

  // Local AI Runtime (Ollama)
  OLLAMA_PING: 'nova:ollama:ping',
  OLLAMA_LIST_MODELS: 'nova:ollama:list-models',

  // Window Controls
  WINDOW_MINIMIZE: 'nova:window:minimize',
  WINDOW_MAXIMIZE: 'nova:window:maximize',
  WINDOW_CLOSE: 'nova:window:close',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
