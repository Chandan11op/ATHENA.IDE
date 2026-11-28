export type AppMode = 'beginner' | 'developer';
export type AppTheme = 'dark' | 'light';

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  nodeVersion: string;
  electronVersion: string;
  athenaDataDir: string;
}

export interface SystemMetrics {
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  cpuModel: string;
  cpuCores: number;
  platform: string;
}

export interface AthenaSettings {
  mode: AppMode;
  theme: AppTheme;
  ollamaEndpoint: string;
  selectedModel: string;
  workspacePath: string | null;
  autoCheckpoint: boolean;
  maxRepairRetries: number;
  editorFontSize: number;
  editorFontFamily: string;
  editorWordWrap: boolean;
  customDataDir: string | null;
  recentWorkspaces: string[];
}

export type NovaSettings = AthenaSettings;

export interface RecommendedModel {
  id: string;
  name: string;
  family: string;
  sizeApprox: string;
  minRamGb: number;
  contextWindow: string;
  capabilities: string[];
  notes: string;
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
  version?: string;
  models: OllamaModelInfo[];
  runningModels?: string[];
  errorMessage?: string;
}

export interface OllamaEnvironmentStatus {
  installed: boolean;
  executablePath: string | null;
  executableVersion: string | null;
  running: boolean;
  apiReachable: boolean;
  endpoint: string;
  modelsDirExists: boolean;
  wingetAvailable: boolean;
  models: OllamaModelInfo[];
  runningModels: string[];
  error?: string;
}

export interface HardwareAssessment {
  platform: string;
  arch: string;
  totalRamBytes: number;
  freeRamBytes: number;
  cpuModel: string;
  cpuCores: number;
  gpuInfo: string | null;
  gpuUncertain: boolean;
  diskFreeBytes: number | null;
  diskTotalBytes: number | null;
}

export interface ModelVerificationResult {
  ok: boolean;
  model: string;
  latencyMs?: number;
  sampleOutput?: string;
  error?: string;
}

export type OfflineReadinessState =
  | 'not_configured'
  | 'setup_required'
  | 'runtime_unavailable'
  | 'model_unavailable'
  | 'model_downloading'
  | 'model_verification_pending'
  | 'ai_operational'
  | 'offline_ready'
  | 'degraded';

export type DiagnosticCheckStatus = 'passed' | 'failed' | 'not_tested' | 'requires_setup';

export interface ReadinessCheckItem {
  id: string;
  label: string;
  status: DiagnosticCheckStatus;
  detail: string;
  networkDependent?: boolean;
}

export interface OfflineReadinessReport {
  state: OfflineReadinessState;
  checkedAt: string;
  checks: ReadinessCheckItem[];
  summary: string;
}

export interface AthenaSetupState {
  schemaVersion: number;
  appInitialized: { status: 'done' | 'failed'; updatedAt: string; detail?: string };
  dataDirInitialized: {
    status: 'done' | 'failed';
    path: string;
    writable: boolean;
    updatedAt: string;
    detail?: string;
  };
  ollamaDetected: {
    status: 'pending' | 'found' | 'missing';
    executablePath: string | null;
    version: string | null;
    updatedAt: string;
  };
  ollamaInstalled: {
    status: 'unknown' | 'installed' | 'not_installed';
    method?: string;
    updatedAt: string;
  };
  ollamaApiVerified: {
    status: 'pending' | 'verified' | 'unreachable';
    endpoint: string;
    latencyMs?: number;
    updatedAt: string;
  };
  modelInstalled: {
    status: 'pending' | 'installed' | 'none';
    modelId: string | null;
    updatedAt: string;
  };
  modelVerified: {
    status: 'pending' | 'verified' | 'failed';
    modelId: string | null;
    testLatencyMs?: number;
    sampleOutput?: string;
    error?: string;
    updatedAt: string;
  };
  aiOperational: {
    status: 'pending' | 'ready' | 'degraded';
    updatedAt: string;
  };
  setupCompleted: boolean;
  skippedAiSetup: boolean;
  lastError: string | null;
}

export interface DataInitReport {
  ok: boolean;
  rootDir: string;
  writable: boolean;
  failedComponent?: string;
  error?: string;
  stats: AthenaDataStats;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatChunkEvent {
  requestId: string;
  delta: string;
  done: boolean;
  error?: string;
}

export interface OllamaPullProgressEvent {
  model: string;
  status: string;
  completed?: number;
  total?: number;
  done: boolean;
  error?: string;
}

export interface WorkspaceDirectoryResult {
  canceled: boolean;
  path: string | null;
  error?: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  relativePath: string;
  kind: 'file' | 'directory';
  sizeBytes?: number;
  children?: FileTreeNode[];
}

export interface FileReadResult {
  ok: boolean;
  path: string;
  content?: string;
  language?: string;
  error?: string;
}

export interface FileOpResult {
  ok: boolean;
  path?: string;
  error?: string;
}

export interface SearchResultItem {
  filePath: string;
  relativePath: string;
  line: number;
  column: number;
  preview: string;
  matchType: 'filename' | 'content';
}

export interface ProposedFileEdit {
  relativePath: string;
  action: 'create' | 'modify' | 'delete';
  originalContent?: string;
  newContent?: string;
  reason?: string;
}

export interface ApplyEditsResult {
  ok: boolean;
  snapshotId?: string;
  appliedFiles: string[];
  errors: string[];
}

export interface TerminalDataEvent {
  sessionId: string;
  chunk: string;
}

export interface TerminalExitEvent {
  sessionId: string;
  code: number | null;
}

export interface ProjectDetectionResult {
  projectType: 'html-static' | 'vite-react' | 'node' | 'unknown';
  hasPackageJson: boolean;
  scripts: string[];
  entryHtml: string | null;
  recommendedCommand: string | null;
}

export interface RunnerStatus {
  running: boolean;
  mode: 'static' | 'script' | null;
  previewUrl: string | null;
  command: string | null;
  pid?: number;
  error?: string;
}

export interface RunnerOutputEvent {
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
}

export interface AthenaDataStats {
  rootDir: string;
  totalBytes: number;
  subdirectories: Array<{
    name: string;
    path: string;
    bytes: number;
    fileCount: number;
  }>;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  proposedEdits?: ProposedFileEdit[];
}

export interface ConversationRecord {
  id: string;
  title: string;
  model: string;
  workspacePath: string | null;
  updatedAt: string;
  messages: ConversationMessage[];
}

export interface SnapshotRecord {
  id: string;
  createdAt: string;
  label: string;
  workspacePath: string;
  files: Array<{ relativePath: string; existed: boolean }>;
}

export interface KnowledgeSource {
  id: string;
  label: string;
  sourcePath: string;
  kind: 'workspace' | 'file';
  addedAt: string;
  chunkCount: number;
  attribution: string;
}

export interface KnowledgeHit {
  sourceId: string;
  sourceLabel: string;
  filePath: string;
  score: number;
  excerpt: string;
}

export interface GitFileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';
  staged: boolean;
  rawCode: string;
}

export interface GitStatusSummary {
  gitInstalled: boolean;
  isRepo: boolean;
  branch: string | null;
  ahead: number;
  behind: number;
  remoteUrl: string | null;
  changes: GitFileChange[];
  error?: string;
}

export interface GitBranchInfo {
  name: string;
  current: boolean;
}

export interface GitCommitEntry {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitHubAuthState {
  connected: boolean;
  encryptionAvailable: boolean;
  username: string | null;
  avatarUrl: string | null;
  error?: string;
}

export interface GitHubRepoSummary {
  id: number;
  fullName: string;
  private: boolean;
  cloneUrl: string;
  htmlUrl: string;
  defaultBranch: string;
  description: string | null;
}

export interface AthenaExtension {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: 'language' | 'theme' | 'ai-tool' | 'workflow';
  enabled: boolean;
  builtIn: boolean;
  compatibility: 'verified-athena' | 'experimental';
  permissions: string[];
}

export interface AthenaApi {
  getAppInfo: () => Promise<AppInfo>;
  getSystemMetrics: () => Promise<SystemMetrics>;
  onMenuAction: (cb: (action: string) => void) => () => void;

  getSettings: () => Promise<AthenaSettings>;
  setSetting: <K extends keyof AthenaSettings>(key: K, value: AthenaSettings[K]) => Promise<boolean>;

  getDataStats: () => Promise<AthenaDataStats>;
  initAndVerifyDataDir: () => Promise<DataInitReport>;
  getSetupState: () => Promise<AthenaSetupState>;
  updateSetupState: (partial: Partial<AthenaSetupState>) => Promise<AthenaSetupState>;
  clearCache: () => Promise<boolean>;
  openDataDirectory: () => Promise<boolean>;
  listConversations: () => Promise<ConversationRecord[]>;
  saveConversation: (record: ConversationRecord) => Promise<boolean>;
  deleteConversation: (id: string) => Promise<boolean>;
  listSnapshots: () => Promise<SnapshotRecord[]>;
  restoreSnapshot: (id: string) => Promise<{ ok: boolean; restored: string[]; error?: string }>;
  runReadinessDiagnostics: () => Promise<OfflineReadinessReport>;
  assessHardware: () => Promise<HardwareAssessment>;

  selectWorkspaceDirectory: () => Promise<WorkspaceDirectoryResult>;
  getCurrentWorkspace: () => Promise<string | null>;

  readDirectoryTree: (maxDepth?: number) => Promise<{ ok: boolean; tree: FileTreeNode[]; error?: string }>;
  readFile: (targetPath: string) => Promise<FileReadResult>;
  writeFile: (targetPath: string, content: string) => Promise<FileOpResult>;
  saveFileAs: (defaultName: string, content: string) => Promise<FileOpResult>;
  createFile: (targetPath: string, content?: string) => Promise<FileOpResult>;
  createDirectory: (targetPath: string) => Promise<FileOpResult>;
  renamePath: (oldPath: string, newPath: string) => Promise<FileOpResult>;
  deletePath: (targetPath: string) => Promise<FileOpResult>;
  revealPath: (targetPath: string) => Promise<boolean>;
  searchWorkspace: (query: string) => Promise<{ ok: boolean; results: SearchResultItem[]; error?: string }>;
  applyProposedEdits: (edits: ProposedFileEdit[], label?: string) => Promise<ApplyEditsResult>;

  createTerminal: (cwd?: string) => Promise<{ ok: boolean; sessionId?: string; cwd?: string; error?: string }>;
  writeTerminal: (sessionId: string, data: string) => Promise<boolean>;
  resizeTerminal: (sessionId: string, cols: number, rows: number) => Promise<boolean>;
  closeTerminal: (sessionId: string) => Promise<boolean>;
  onTerminalData: (cb: (event: TerminalDataEvent) => void) => () => void;
  onTerminalExit: (cb: (event: TerminalExitEvent) => void) => () => void;

  detectProject: () => Promise<ProjectDetectionResult>;
  startRunner: (mode: 'static' | 'script', scriptName?: string, consentGranted?: boolean) => Promise<RunnerStatus>;
  stopRunner: () => Promise<RunnerStatus>;
  onRunnerOutput: (cb: (event: RunnerOutputEvent) => void) => () => void;
  onRunnerStatus: (cb: (status: RunnerStatus) => void) => () => void;

  checkOllamaStatus: (endpoint?: string) => Promise<OllamaStatus>;
  inspectOllamaEnvironment: (endpoint?: string) => Promise<OllamaEnvironmentStatus>;
  startOllamaRuntime: (endpoint?: string) => Promise<{ ok: boolean; started: boolean; error?: string; status?: OllamaStatus }>;
  installOllamaViaWinget: () => Promise<{ ok: boolean; error?: string }>;
  cancelOllamaInstall: () => Promise<boolean>;
  listOllamaModels: (endpoint?: string) => Promise<OllamaModelInfo[]>;
  verifyOllamaModel: (model: string, endpoint?: string) => Promise<ModelVerificationResult>;
  streamOllamaChat: (
    requestId: string,
    model: string,
    messages: OllamaChatMessage[],
    endpoint?: string
  ) => Promise<{ ok: boolean; fullText?: string; error?: string }>;
  abortOllamaChat: (requestId: string) => Promise<boolean>;
  generateOllamaCompletion: (
    model: string,
    prompt: string,
    suffix?: string,
    endpoint?: string
  ) => Promise<{ ok: boolean; response: string; error?: string }>;
  pullOllamaModel: (model: string, endpoint?: string) => Promise<{ ok: boolean; error?: string }>;
  abortOllamaPull: (model: string) => Promise<boolean>;
  deleteOllamaModel: (model: string, endpoint?: string) => Promise<{ ok: boolean; error?: string }>;
  onOllamaChatChunk: (cb: (event: OllamaChatChunkEvent) => void) => () => void;
  onOllamaPullProgress: (cb: (event: OllamaPullProgressEvent) => void) => () => void;
  onOllamaInstallLog: (cb: (line: string) => void) => () => void;

  listKnowledgeSources: () => Promise<KnowledgeSource[]>;
  seedInitialKnowledgePack: () => Promise<{ ok: boolean; added: KnowledgeSource[]; error?: string }>;
  indexWorkspaceKnowledge: () => Promise<{ ok: boolean; source?: KnowledgeSource; error?: string }>;
  addKnowledgeFiles: () => Promise<{ ok: boolean; added: KnowledgeSource[]; error?: string }>;
  removeKnowledgeSource: (id: string) => Promise<boolean>;
  rebuildKnowledgeIndex: () => Promise<{ ok: boolean; count: number; error?: string }>;
  queryKnowledge: (query: string, limit?: number) => Promise<KnowledgeHit[]>;

  getGitStatus: () => Promise<GitStatusSummary>;
  getGitDiff: (filePath?: string, staged?: boolean) => Promise<{ ok: boolean; diff: string; error?: string }>;
  stageGitFiles: (paths: string[]) => Promise<{ ok: boolean; error?: string }>;
  unstageGitFiles: (paths: string[]) => Promise<{ ok: boolean; error?: string }>;
  commitGit: (message: string) => Promise<{ ok: boolean; error?: string }>;
  listGitBranches: () => Promise<{ ok: boolean; branches: GitBranchInfo[]; error?: string }>;
  checkoutGitBranch: (branch: string) => Promise<{ ok: boolean; error?: string }>;
  createGitBranch: (branch: string) => Promise<{ ok: boolean; error?: string }>;
  getGitLog: (limit?: number) => Promise<{ ok: boolean; commits: GitCommitEntry[]; error?: string }>;
  pullGit: () => Promise<{ ok: boolean; output?: string; error?: string }>;
  pushGit: () => Promise<{ ok: boolean; output?: string; error?: string }>;
  fetchGit: () => Promise<{ ok: boolean; output?: string; error?: string }>;
  cloneGitRepo: (repoUrl: string) => Promise<{ ok: boolean; targetDir?: string; error?: string }>;

  getGitHubAuthState: () => Promise<GitHubAuthState>;
  saveGitHubToken: (token: string) => Promise<GitHubAuthState>;
  clearGitHubToken: () => Promise<GitHubAuthState>;
  listGitHubRepos: () => Promise<{ ok: boolean; repos: GitHubRepoSummary[]; error?: string }>;

  listExtensions: () => Promise<AthenaExtension[]>;
  toggleExtension: (id: string, enabled: boolean) => Promise<AthenaExtension[]>;
  installExtensionFromFile: () => Promise<{ ok: boolean; extension?: AthenaExtension; error?: string }>;
  uninstallExtension: (id: string) => Promise<{ ok: boolean; error?: string }>;

  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

export type NovaApi = AthenaApi;

declare global {
  interface Window {
    athenaApi: AthenaApi;
    novaApi: AthenaApi;
  }
}
