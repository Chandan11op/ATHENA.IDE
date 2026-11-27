export type AppMode = 'beginner' | 'developer';
export type AppTheme = 'dark' | 'light';

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  nodeVersion: string;
  electronVersion: string;
}

export interface SystemMetrics {
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  cpuModel: string;
  cpuCores: number;
  platform: string;
}

export interface NovaSettings {
  mode: AppMode;
  theme: AppTheme;
  ollamaEndpoint: string;
  selectedModel: string;
  workspacePath: string | null;
  autoCheckpoint: boolean;
  maxRepairRetries: number;
}

export interface OllamaModelInfo {
  name: string;
  size: number;
  modifiedAt: string;
  family?: string;
  format?: string;
  parameterSize?: string;
}

export interface OllamaStatus {
  isAvailable: boolean;
  endpoint: string;
  latencyMs?: number;
  models: OllamaModelInfo[];
  errorMessage?: string;
}

export interface WorkspaceDirectoryResult {
  canceled: boolean;
  path: string | null;
  error?: string;
}

/**
 * Validated API exposed to the renderer via Preload Context Bridge
 */
export interface NovaApi {
  getAppInfo: () => Promise<AppInfo>;
  getSystemMetrics: () => Promise<SystemMetrics>;
  getSettings: () => Promise<NovaSettings>;
  setSetting: <K extends keyof NovaSettings>(key: K, value: NovaSettings[K]) => Promise<boolean>;
  selectWorkspaceDirectory: () => Promise<WorkspaceDirectoryResult>;
  getCurrentWorkspace: () => Promise<string | null>;
  checkOllamaStatus: (endpoint?: string) => Promise<OllamaStatus>;
  listOllamaModels: (endpoint?: string) => Promise<OllamaModelInfo[]>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    novaApi: NovaApi;
  }
}
