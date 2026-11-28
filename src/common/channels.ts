/**
 * Secure IPC Channel Identifiers
 * All IPC channels are strictly allowlisted and namespaced under "athena:".
 */
export const IPC_CHANNELS = {
  // Application & System
  APP_GET_INFO: 'athena:app:get-info',
  APP_GET_SYSTEM_METRICS: 'athena:app:get-system-metrics',
  APP_MENU_ACTION: 'athena:app:menu-action',

  // Settings & athena.data Storage
  SETTINGS_GET_ALL: 'athena:settings:get-all',
  SETTINGS_SET_VALUE: 'athena:settings:set-value',
  DATA_GET_STATS: 'athena:data:get-stats',
  DATA_CLEAR_CACHE: 'athena:data:clear-cache',
  DATA_OPEN_DIRECTORY: 'athena:data:open-directory',
  DATA_LIST_CONVERSATIONS: 'athena:data:list-conversations',
  DATA_SAVE_CONVERSATION: 'athena:data:save-conversation',
  DATA_DELETE_CONVERSATION: 'athena:data:delete-conversation',
  DATA_LIST_SNAPSHOTS: 'athena:data:list-snapshots',
  DATA_RESTORE_SNAPSHOT: 'athena:data:restore-snapshot',

  // Workspace Operations
  WORKSPACE_SELECT_DIRECTORY: 'athena:workspace:select-directory',
  WORKSPACE_GET_CURRENT: 'athena:workspace:get-current',

  // Sandboxed Filesystem & Search
  FS_READ_TREE: 'athena:fs:read-tree',
  FS_READ_FILE: 'athena:fs:read-file',
  FS_WRITE_FILE: 'athena:fs:write-file',
  FS_SAVE_AS: 'athena:fs:save-as',
  FS_CREATE_FILE: 'athena:fs:create-file',
  FS_CREATE_DIR: 'athena:fs:create-dir',
  FS_RENAME: 'athena:fs:rename',
  FS_DELETE: 'athena:fs:delete',
  FS_REVEAL: 'athena:fs:reveal',
  FS_SEARCH: 'athena:fs:search',
  FS_APPLY_EDITS: 'athena:fs:apply-edits',

  // Integrated Terminal
  TERMINAL_CREATE: 'athena:terminal:create',
  TERMINAL_WRITE: 'athena:terminal:write',
  TERMINAL_RESIZE: 'athena:terminal:resize',
  TERMINAL_CLOSE: 'athena:terminal:close',
  TERMINAL_DATA: 'athena:terminal:data',
  TERMINAL_EXIT: 'athena:terminal:exit',

  // Run & Preview
  RUNNER_DETECT: 'athena:runner:detect',
  RUNNER_START: 'athena:runner:start',
  RUNNER_STOP: 'athena:runner:stop',
  RUNNER_OUTPUT: 'athena:runner:output',
  RUNNER_STATUS: 'athena:runner:status',

  // Local AI Runtime (Ollama)
  OLLAMA_PING: 'athena:ollama:ping',
  OLLAMA_LIST_MODELS: 'athena:ollama:list-models',
  OLLAMA_CHAT: 'athena:ollama:chat',
  OLLAMA_ABORT_CHAT: 'athena:ollama:abort-chat',
  OLLAMA_GENERATE: 'athena:ollama:generate',
  OLLAMA_PULL_MODEL: 'athena:ollama:pull-model',
  OLLAMA_DELETE_MODEL: 'athena:ollama:delete-model',
  OLLAMA_CHAT_CHUNK: 'athena:ollama:chat-chunk',
  OLLAMA_PULL_PROGRESS: 'athena:ollama:pull-progress',

  // Knowledge & Local Indexing
  KNOWLEDGE_LIST: 'athena:knowledge:list',
  KNOWLEDGE_ADD_WORKSPACE: 'athena:knowledge:add-workspace',
  KNOWLEDGE_ADD_FILES: 'athena:knowledge:add-files',
  KNOWLEDGE_REMOVE: 'athena:knowledge:remove',
  KNOWLEDGE_REBUILD: 'athena:knowledge:rebuild',
  KNOWLEDGE_QUERY: 'athena:knowledge:query',

  // Git & Optional GitHub
  GIT_STATUS: 'athena:git:status',
  GIT_DIFF: 'athena:git:diff',
  GIT_STAGE: 'athena:git:stage',
  GIT_UNSTAGE: 'athena:git:unstage',
  GIT_COMMIT: 'athena:git:commit',
  GIT_BRANCHES: 'athena:git:branches',
  GIT_CHECKOUT: 'athena:git:checkout',
  GIT_CREATE_BRANCH: 'athena:git:create-branch',
  GIT_LOG: 'athena:git:log',
  GIT_PULL: 'athena:git:pull',
  GIT_PUSH: 'athena:git:push',
  GIT_FETCH: 'athena:git:fetch',
  GIT_CLONE: 'athena:git:clone',
  GITHUB_AUTH_STATE: 'athena:github:auth-state',
  GITHUB_SAVE_TOKEN: 'athena:github:save-token',
  GITHUB_CLEAR_TOKEN: 'athena:github:clear-token',
  GITHUB_LIST_REPOS: 'athena:github:list-repos',

  // Extensions
  EXT_LIST: 'athena:ext:list',
  EXT_TOGGLE: 'athena:ext:toggle',
  EXT_INSTALL: 'athena:ext:install',
  EXT_UNINSTALL: 'athena:ext:uninstall',

  // Window Controls
  WINDOW_MINIMIZE: 'athena:window:minimize',
  WINDOW_MAXIMIZE: 'athena:window:maximize',
  WINDOW_CLOSE: 'athena:window:close',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
