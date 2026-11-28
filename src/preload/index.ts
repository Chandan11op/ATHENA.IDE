import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../common/channels.js';
import {
  AthenaApi,
  AthenaSettings,
  ConversationRecord,
  OllamaChatMessage,
  ProposedFileEdit,
} from '../common/types.js';

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: AthenaApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INFO),
  getSystemMetrics: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_SYSTEM_METRICS),
  onMenuAction: (cb) => subscribe<string>(IPC_CHANNELS.APP_MENU_ACTION, cb),

  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  setSetting: <K extends keyof AthenaSettings>(key: K, value: AthenaSettings[K]) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_VALUE, { key, value }),

  getDataStats: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_GET_STATS),
  clearCache: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_CLEAR_CACHE),
  openDataDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_OPEN_DIRECTORY),
  listConversations: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_LIST_CONVERSATIONS),
  saveConversation: (record: ConversationRecord) =>
    ipcRenderer.invoke(IPC_CHANNELS.DATA_SAVE_CONVERSATION, record),
  deleteConversation: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DATA_DELETE_CONVERSATION, id),
  listSnapshots: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_LIST_SNAPSHOTS),
  restoreSnapshot: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DATA_RESTORE_SNAPSHOT, id),

  selectWorkspaceDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SELECT_DIRECTORY),
  getCurrentWorkspace: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_CURRENT),

  readDirectoryTree: (maxDepth?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_READ_TREE, maxDepth),
  readFile: (targetPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE, targetPath),
  writeFile: (targetPath: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, { targetPath, content }),
  saveFileAs: (defaultName: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_SAVE_AS, { defaultName, content }),
  createFile: (targetPath: string, content?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_FILE, { targetPath, content }),
  createDirectory: (targetPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_DIR, targetPath),
  renamePath: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_RENAME, { oldPath, newPath }),
  deletePath: (targetPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE, targetPath),
  revealPath: (targetPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_REVEAL, targetPath),
  searchWorkspace: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_SEARCH, query),
  applyProposedEdits: (edits: ProposedFileEdit[], label?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_APPLY_EDITS, { edits, label }),

  createTerminal: (cwd?: string) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, cwd),
  writeTerminal: (sessionId: string, data: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_WRITE, { sessionId, data }),
  resizeTerminal: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_RESIZE, { sessionId, cols, rows }),
  closeTerminal: (sessionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CLOSE, sessionId),
  onTerminalData: (cb) => subscribe(IPC_CHANNELS.TERMINAL_DATA, cb),
  onTerminalExit: (cb) => subscribe(IPC_CHANNELS.TERMINAL_EXIT, cb),

  detectProject: () => ipcRenderer.invoke(IPC_CHANNELS.RUNNER_DETECT),
  startRunner: (mode: 'static' | 'script', scriptName?: string, consentGranted?: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.RUNNER_START, { mode, scriptName, consentGranted }),
  stopRunner: () => ipcRenderer.invoke(IPC_CHANNELS.RUNNER_STOP),
  onRunnerOutput: (cb) => subscribe(IPC_CHANNELS.RUNNER_OUTPUT, cb),
  onRunnerStatus: (cb) => subscribe(IPC_CHANNELS.RUNNER_STATUS, cb),

  checkOllamaStatus: (endpoint?: string) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_PING, endpoint),
  listOllamaModels: (endpoint?: string) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_LIST_MODELS, endpoint),
  streamOllamaChat: (
    requestId: string,
    model: string,
    messages: OllamaChatMessage[],
    endpoint?: string
  ) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_CHAT, { requestId, model, messages, endpoint }),
  abortOllamaChat: (requestId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_ABORT_CHAT, requestId),
  generateOllamaCompletion: (
    model: string,
    prompt: string,
    suffix?: string,
    endpoint?: string
  ) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_GENERATE, { model, prompt, suffix, endpoint }),
  pullOllamaModel: (model: string, endpoint?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_PULL_MODEL, { model, endpoint }),
  deleteOllamaModel: (model: string, endpoint?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_DELETE_MODEL, { model, endpoint }),
  onOllamaChatChunk: (cb) => subscribe(IPC_CHANNELS.OLLAMA_CHAT_CHUNK, cb),
  onOllamaPullProgress: (cb) => subscribe(IPC_CHANNELS.OLLAMA_PULL_PROGRESS, cb),

  listKnowledgeSources: () => ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_LIST),
  indexWorkspaceKnowledge: () => ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_ADD_WORKSPACE),
  addKnowledgeFiles: () => ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_ADD_FILES),
  removeKnowledgeSource: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_REMOVE, id),
  rebuildKnowledgeIndex: () => ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_REBUILD),
  queryKnowledge: (query: string, limit?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_QUERY, { query, limit }),

  getGitStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS),
  getGitDiff: (filePath?: string, staged?: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_DIFF, { filePath, staged }),
  stageGitFiles: (paths: string[]) => ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE, paths),
  unstageGitFiles: (paths: string[]) => ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE, paths),
  commitGit: (message: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, message),
  listGitBranches: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_BRANCHES),
  checkoutGitBranch: (branch: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECKOUT, branch),
  createGitBranch: (branch: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CREATE_BRANCH, branch),
  getGitLog: (limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.GIT_LOG, limit),
  pullGit: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_PULL),
  pushGit: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_PUSH),
  fetchGit: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_FETCH),
  cloneGitRepo: (repoUrl: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CLONE, repoUrl),

  getGitHubAuthState: () => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_AUTH_STATE),
  saveGitHubToken: (token: string) => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_SAVE_TOKEN, token),
  clearGitHubToken: () => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_CLEAR_TOKEN),
  listGitHubRepos: () => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_LIST_REPOS),

  listExtensions: () => ipcRenderer.invoke(IPC_CHANNELS.EXT_LIST),
  toggleExtension: (id: string, enabled: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXT_TOGGLE, { id, enabled }),
  installExtensionFromFile: () => ipcRenderer.invoke(IPC_CHANNELS.EXT_INSTALL),
  uninstallExtension: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.EXT_UNINSTALL, id),

  minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
};

try {
  contextBridge.exposeInMainWorld('athenaApi', api);
  contextBridge.exposeInMainWorld('novaApi', api);
} catch (err) {
  console.error('[Preload] Failed to expose Athena API in main world:', err);
}
