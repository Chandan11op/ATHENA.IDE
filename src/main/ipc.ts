import os from 'os';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { IPC_CHANNELS } from '../common/channels.js';
import {
  AppInfo,
  AthenaSettings,
  ConversationRecord,
  OllamaChatMessage,
  ProposedFileEdit,
  SystemMetrics,
  WorkspaceDirectoryResult,
} from '../common/types.js';
import { AthenaDataManager } from './athenaData.js';
import { ExtensionManager } from './extensions.js';
import {
  applyProposedEdits,
  createWorkspaceDirectory,
  createWorkspaceFile,
  deleteWorkspacePath,
  readWorkspaceFile,
  readWorkspaceTree,
  renameWorkspacePath,
  searchWorkspaceFiles,
  writeWorkspaceFile,
} from './filesystem.js';
import {
  checkoutGitBranch,
  cloneGitRepo,
  commitGit,
  createGitBranch,
  fetchGit,
  getGitDiff,
  getGitLog,
  getGitStatus,
  listGitBranches,
  pullGit,
  pushGit,
  stageGitFiles,
  unstageGitFiles,
} from './git.js';
import { GitHubService } from './github.js';
import { KnowledgeService } from './knowledge.js';
import { assessHardware, runReadinessDiagnostics } from './diagnostics.js';
import {
  abortOllamaChat,
  abortOllamaPull,
  cancelOllamaInstall,
  checkOllamaAvailability,
  deleteOllamaModel,
  generateOllamaCompletion,
  inspectOllamaEnvironment,
  installOllamaViaWinget,
  pullOllamaModel,
  startOllamaRuntime,
  streamOllamaChat,
  verifyOllamaModel,
} from './ollama.js';
import { detectProject, ProjectRunner } from './runner.js';
import { isPathInsideWorkspace } from './security.js';
import { SettingsManager } from './settings.js';
import { TerminalManager } from './terminal.js';

export interface MainServices {
  dataManager: AthenaDataManager;
  settingsManager: SettingsManager;
  terminalManager: TerminalManager;
  projectRunner: ProjectRunner;
  knowledgeService: KnowledgeService;
  githubService: GitHubService;
  extensionManager: ExtensionManager;
}

export function registerIpcHandlers(
  services: MainServices,
  getMainWindow: () => BrowserWindow | null
): void {
  const {
    dataManager,
    settingsManager,
    terminalManager,
    projectRunner,
    knowledgeService,
    githubService,
    extensionManager,
  } = services;

  const getWorkspace = (): string | null => settingsManager.get('workspacePath') || null;
  const sendToRenderer = (channel: string, payload: unknown) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  };

  // Application & System
  ipcMain.handle(IPC_CHANNELS.APP_GET_INFO, async (): Promise<AppInfo> => ({
    name: 'Athena.IDE',
    version: app.getVersion() || '0.2.0',
    platform: process.platform,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    athenaDataDir: dataManager.rootDir,
  }));

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

  // Settings & athena.data
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async () => settingsManager.getAll());

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET_VALUE,
    async (_event, { key, value }: { key: keyof AthenaSettings; value: any }): Promise<boolean> => {
      const allowedKeys: (keyof AthenaSettings)[] = [
        'mode',
        'theme',
        'ollamaEndpoint',
        'selectedModel',
        'workspacePath',
        'autoCheckpoint',
        'maxRepairRetries',
        'editorFontSize',
        'editorFontFamily',
        'editorWordWrap',
        'customDataDir',
        'recentWorkspaces',
      ];
      if (!allowedKeys.includes(key)) {
        console.warn(`[Security] Rejected invalid settings key: ${String(key)}`);
        return false;
      }
      return settingsManager.set(key, value);
    }
  );

  ipcMain.handle(IPC_CHANNELS.DATA_GET_STATS, async () => dataManager.getStats());
  ipcMain.handle(IPC_CHANNELS.DATA_INIT_VERIFY, async () =>
    dataManager.initAndVerifyDataDir(settingsManager.getAll())
  );
  ipcMain.handle(IPC_CHANNELS.DATA_GET_SETUP_STATE, async () => dataManager.getSetupState());
  ipcMain.handle(IPC_CHANNELS.DATA_UPDATE_SETUP_STATE, async (_e, partial) =>
    dataManager.updateSetupState(partial)
  );
  ipcMain.handle(IPC_CHANNELS.DIAGNOSTICS_RUN_READINESS, async () =>
    runReadinessDiagnostics(dataManager, settingsManager.getAll(), knowledgeService)
  );
  ipcMain.handle(IPC_CHANNELS.SYSTEM_ASSESS_HARDWARE, async () =>
    assessHardware(dataManager.rootDir)
  );
  ipcMain.handle(IPC_CHANNELS.DATA_CLEAR_CACHE, async () => dataManager.clearCache());
  ipcMain.handle(IPC_CHANNELS.DATA_OPEN_DIRECTORY, async () => {
    const res = await shell.openPath(dataManager.rootDir);
    return res === '';
  });
  ipcMain.handle(IPC_CHANNELS.DATA_LIST_CONVERSATIONS, async () => dataManager.listConversations());
  ipcMain.handle(IPC_CHANNELS.DATA_SAVE_CONVERSATION, async (_e, rec: ConversationRecord) =>
    dataManager.saveConversation(rec)
  );
  ipcMain.handle(IPC_CHANNELS.DATA_DELETE_CONVERSATION, async (_e, id: string) =>
    dataManager.deleteConversation(id)
  );
  ipcMain.handle(IPC_CHANNELS.DATA_LIST_SNAPSHOTS, async () =>
    dataManager.listSnapshots(getWorkspace())
  );
  ipcMain.handle(IPC_CHANNELS.DATA_RESTORE_SNAPSHOT, async (_e, id: string) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, restored: [], error: 'No workspace selected' };
    return dataManager.restoreSnapshot(id, ws);
  });

  // Workspace
  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_SELECT_DIRECTORY,
    async (): Promise<WorkspaceDirectoryResult> => {
      const win = getMainWindow();
      if (!win) return { canceled: true, path: null, error: 'Main window not ready' };

      const result = await dialog.showOpenDialog(win, {
        title: 'Select Athena.IDE Project Workspace',
        properties: ['openDirectory', 'createDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true, path: null };
      }

      const selectedPath = result.filePaths[0];
      settingsManager.set('workspacePath', selectedPath);
      const recent = settingsManager.get('recentWorkspaces') || [];
      const nextRecent = [selectedPath, ...recent.filter((p) => p !== selectedPath)].slice(0, 8);
      settingsManager.set('recentWorkspaces', nextRecent);

      return { canceled: false, path: selectedPath };
    }
  );

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_GET_CURRENT, async () => getWorkspace());

  // Sandboxed Filesystem & Search
  ipcMain.handle(IPC_CHANNELS.FS_READ_TREE, async (_e, maxDepth?: number) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, tree: [], error: 'No workspace opened' };
    return readWorkspaceTree(ws, maxDepth);
  });

  ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, async (_e, targetPath: string) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, path: targetPath, error: 'No workspace opened' };
    return readWorkspaceFile(ws, targetPath);
  });

  ipcMain.handle(IPC_CHANNELS.FS_WRITE_FILE, async (_e, { targetPath, content }: { targetPath: string; content: string }) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace opened' };
    return writeWorkspaceFile(ws, targetPath, content);
  });

  ipcMain.handle(IPC_CHANNELS.FS_SAVE_AS, async (_e, { defaultName, content }: { defaultName: string; content: string }) => {
    const win = getMainWindow();
    const ws = getWorkspace();
    if (!win || !ws) return { ok: false, error: 'No active workspace or window' };

    const res = await dialog.showSaveDialog(win, {
      title: 'Save File As',
      defaultPath: `${ws}/${defaultName}`,
    });
    if (res.canceled || !res.filePath) return { ok: false, error: 'Save canceled' };
    return writeWorkspaceFile(ws, res.filePath, content);
  });

  ipcMain.handle(IPC_CHANNELS.FS_CREATE_FILE, async (_e, { targetPath, content }: { targetPath: string; content?: string }) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace opened' };
    return createWorkspaceFile(ws, targetPath, content);
  });

  ipcMain.handle(IPC_CHANNELS.FS_CREATE_DIR, async (_e, targetPath: string) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace opened' };
    return createWorkspaceDirectory(ws, targetPath);
  });

  ipcMain.handle(IPC_CHANNELS.FS_RENAME, async (_e, { oldPath, newPath }: { oldPath: string; newPath: string }) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace opened' };
    return renameWorkspacePath(ws, oldPath, newPath);
  });

  ipcMain.handle(IPC_CHANNELS.FS_DELETE, async (_e, targetPath: string) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace opened' };
    return deleteWorkspacePath(ws, targetPath);
  });

  ipcMain.handle(IPC_CHANNELS.FS_REVEAL, async (_e, targetPath: string) => {
    const ws = getWorkspace();
    if (!ws || !isPathInsideWorkspace(ws, targetPath)) return false;
    shell.showItemInFolder(targetPath);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.FS_SEARCH, async (_e, query: string) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, results: [], error: 'No workspace opened' };
    return searchWorkspaceFiles(ws, query);
  });

  ipcMain.handle(IPC_CHANNELS.FS_APPLY_EDITS, async (_e, { edits, label }: { edits: ProposedFileEdit[]; label?: string }) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, appliedFiles: [], errors: ['No workspace opened'] };
    return applyProposedEdits(ws, dataManager, edits, label);
  });

  // Integrated Terminal
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, async (_e, cwd?: string) =>
    terminalManager.createSession(
      getWorkspace(),
      cwd,
      (sessionId, chunk) => sendToRenderer(IPC_CHANNELS.TERMINAL_DATA, { sessionId, chunk }),
      (sessionId, code) => sendToRenderer(IPC_CHANNELS.TERMINAL_EXIT, { sessionId, code })
    )
  );
  ipcMain.handle(IPC_CHANNELS.TERMINAL_WRITE, async (_e, { sessionId, data }: { sessionId: string; data: string }) =>
    terminalManager.write(sessionId, data)
  );
  ipcMain.handle(IPC_CHANNELS.TERMINAL_RESIZE, async () => true);
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CLOSE, async (_e, sessionId: string) =>
    terminalManager.close(sessionId)
  );

  // Project Runner & Preview
  ipcMain.handle(IPC_CHANNELS.RUNNER_DETECT, async () => detectProject(getWorkspace()));
  ipcMain.handle(
    IPC_CHANNELS.RUNNER_START,
    async (_e, { mode, scriptName, consentGranted }: { mode: 'static' | 'script'; scriptName?: string; consentGranted?: boolean }) => {
      const ws = getWorkspace();
      if (!ws) {
        return { running: false, mode: null, previewUrl: null, command: null, error: 'Open a workspace first' };
      }
      const onOut = (stream: 'stdout' | 'stderr' | 'system', text: string) =>
        sendToRenderer(IPC_CHANNELS.RUNNER_OUTPUT, { stream, text });
      const onStat = (status: unknown) => sendToRenderer(IPC_CHANNELS.RUNNER_STATUS, status);

      if (mode === 'static') {
        return projectRunner.startStatic(ws, onOut, onStat);
      }
      return projectRunner.startScript(ws, scriptName || 'dev', Boolean(consentGranted), onOut, onStat);
    }
  );
  ipcMain.handle(IPC_CHANNELS.RUNNER_STOP, async () =>
    projectRunner.stop((status) => sendToRenderer(IPC_CHANNELS.RUNNER_STATUS, status))
  );

  // Local Ollama AI Engine
  ipcMain.handle(IPC_CHANNELS.OLLAMA_PING, async (_e, endpoint?: string) => {
    const target = endpoint || settingsManager.get('ollamaEndpoint');
    return checkOllamaAvailability(target);
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA_INSPECT_ENV, async (_e, endpoint?: string) => {
    const target = endpoint || settingsManager.get('ollamaEndpoint');
    const env = await inspectOllamaEnvironment(target);
    const now = new Date().toISOString();
    dataManager.updateSetupState({
      ollamaDetected: {
        status: env.installed ? 'found' : 'missing',
        executablePath: env.executablePath,
        version: env.executableVersion,
        updatedAt: now,
      },
      ollamaInstalled: {
        status: env.installed ? 'installed' : 'not_installed',
        updatedAt: now,
      },
      ollamaApiVerified: {
        status: env.apiReachable ? 'verified' : 'unreachable',
        endpoint: target,
        updatedAt: now,
      },
      modelInstalled: {
        status: env.models.length > 0 ? 'installed' : 'none',
        modelId: settingsManager.get('selectedModel') || env.models[0]?.name || null,
        updatedAt: now,
      },
    });
    return env;
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA_START_RUNTIME, async (_e, endpoint?: string) => {
    const target = endpoint || settingsManager.get('ollamaEndpoint');
    return startOllamaRuntime(target);
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA_INSTALL_WINGET, async () =>
    installOllamaViaWinget((line) => {
      sendToRenderer(IPC_CHANNELS.OLLAMA_INSTALL_LOG, line);
    })
  );

  ipcMain.handle(IPC_CHANNELS.OLLAMA_CANCEL_INSTALL, async () => cancelOllamaInstall());

  ipcMain.handle(IPC_CHANNELS.OLLAMA_LIST_MODELS, async (_e, endpoint?: string) => {
    const target = endpoint || settingsManager.get('ollamaEndpoint');
    const status = await checkOllamaAvailability(target);
    return status.models;
  });

  ipcMain.handle(
    IPC_CHANNELS.OLLAMA_VERIFY_MODEL,
    async (_e, { model, endpoint }: { model: string; endpoint?: string }) => {
      const target = endpoint || settingsManager.get('ollamaEndpoint');
      const res = await verifyOllamaModel(model, target);
      const now = new Date().toISOString();
      dataManager.updateSetupState({
        modelVerified: {
          status: res.ok ? 'verified' : 'failed',
          modelId: model,
          testLatencyMs: res.latencyMs,
          sampleOutput: res.sampleOutput,
          error: res.error,
          updatedAt: now,
        },
        aiOperational: {
          status: res.ok ? 'ready' : 'degraded',
          updatedAt: now,
        },
        setupCompleted: res.ok,
        lastError: res.ok ? null : res.error ?? null,
      });
      return res;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.OLLAMA_CHAT,
    async (
      _e,
      {
        requestId,
        model,
        messages,
        endpoint,
      }: { requestId: string; model: string; messages: OllamaChatMessage[]; endpoint?: string }
    ) => {
      const target = endpoint || settingsManager.get('ollamaEndpoint');
      return streamOllamaChat(requestId, model, messages, target, (delta, done) => {
        sendToRenderer(IPC_CHANNELS.OLLAMA_CHAT_CHUNK, { requestId, delta, done });
      });
    }
  );

  ipcMain.handle(IPC_CHANNELS.OLLAMA_ABORT_CHAT, async (_e, requestId: string) =>
    abortOllamaChat(requestId)
  );

  ipcMain.handle(
    IPC_CHANNELS.OLLAMA_GENERATE,
    async (
      _e,
      { model, prompt, suffix, endpoint }: { model: string; prompt: string; suffix?: string; endpoint?: string }
    ) => {
      const target = endpoint || settingsManager.get('ollamaEndpoint');
      return generateOllamaCompletion(model, prompt, suffix, target);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.OLLAMA_PULL_MODEL,
    async (_e, { model, endpoint }: { model: string; endpoint?: string }) => {
      const target = endpoint || settingsManager.get('ollamaEndpoint');
      return pullOllamaModel(model, target, (ev) => {
        sendToRenderer(IPC_CHANNELS.OLLAMA_PULL_PROGRESS, ev);
      });
    }
  );

  ipcMain.handle(IPC_CHANNELS.OLLAMA_ABORT_PULL, async (_e, model: string) =>
    abortOllamaPull(model)
  );

  ipcMain.handle(
    IPC_CHANNELS.OLLAMA_DELETE_MODEL,
    async (_e, { model, endpoint }: { model: string; endpoint?: string }) => {
      const target = endpoint || settingsManager.get('ollamaEndpoint');
      return deleteOllamaModel(model, target);
    }
  );

  // Knowledge Library & Local Indexing
  ipcMain.handle(IPC_CHANNELS.KNOWLEDGE_LIST, async () => knowledgeService.listSources());
  ipcMain.handle(IPC_CHANNELS.KNOWLEDGE_SEED_PACK, async () => knowledgeService.seedInitialPack());
  ipcMain.handle(IPC_CHANNELS.KNOWLEDGE_ADD_WORKSPACE, async () => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace selected' };
    return knowledgeService.indexWorkspace(ws);
  });
  ipcMain.handle(IPC_CHANNELS.KNOWLEDGE_ADD_FILES, async () => {
    const win = getMainWindow();
    if (!win) return { ok: false, added: [], error: 'Window unavailable' };
    const picked = await dialog.showOpenDialog(win, {
      title: 'Add Reference Files to athena.data Knowledge Library',
      properties: ['openFile', 'multiSelections'],
    });
    if (picked.canceled || picked.filePaths.length === 0) {
      return { ok: false, added: [], error: 'Canceled' };
    }
    return knowledgeService.addReferenceFiles(picked.filePaths);
  });
  ipcMain.handle(IPC_CHANNELS.KNOWLEDGE_REMOVE, async (_e, id: string) =>
    knowledgeService.removeSource(id)
  );
  ipcMain.handle(IPC_CHANNELS.KNOWLEDGE_REBUILD, async () => knowledgeService.rebuildAll());
  ipcMain.handle(IPC_CHANNELS.KNOWLEDGE_QUERY, async (_e, { query, limit }: { query: string; limit?: number }) =>
    knowledgeService.query(query, limit)
  );

  // Git & Optional GitHub
  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async () => getGitStatus(getWorkspace()));
  ipcMain.handle(IPC_CHANNELS.GIT_DIFF, async (_e, { filePath, staged }: { filePath?: string; staged?: boolean }) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, diff: '', error: 'No workspace selected' };
    return getGitDiff(ws, filePath, staged);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_STAGE, async (_e, paths: string[]) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace selected' };
    return stageGitFiles(ws, paths);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE, async (_e, paths: string[]) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace selected' };
    return unstageGitFiles(ws, paths);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_COMMIT, async (_e, message: string) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace selected' };
    return commitGit(ws, message);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_BRANCHES, async () => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, branches: [], error: 'No workspace selected' };
    return listGitBranches(ws);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_CHECKOUT, async (_e, branch: string) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace selected' };
    return checkoutGitBranch(ws, branch);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_CREATE_BRANCH, async (_e, branch: string) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace selected' };
    return createGitBranch(ws, branch);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_LOG, async (_e, limit?: number) => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, commits: [], error: 'No workspace selected' };
    return getGitLog(ws, limit);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_PULL, async () => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace selected' };
    return pullGit(ws);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_PUSH, async () => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace selected' };
    return pushGit(ws);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_FETCH, async () => {
    const ws = getWorkspace();
    if (!ws) return { ok: false, error: 'No workspace selected' };
    return fetchGit(ws);
  });
  ipcMain.handle(IPC_CHANNELS.GIT_CLONE, async (_e, repoUrl: string) => {
    const win = getMainWindow();
    if (!win) return { ok: false, error: 'Window unavailable' };
    const picked = await dialog.showOpenDialog(win, {
      title: 'Choose Parent Folder for Cloned Repository',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (picked.canceled || picked.filePaths.length === 0) {
      return { ok: false, error: 'Clone canceled' };
    }
    const res = await cloneGitRepo(repoUrl, picked.filePaths[0]);
    if (res.ok && res.targetDir) {
      settingsManager.set('workspacePath', res.targetDir);
    }
    return res;
  });

  ipcMain.handle(IPC_CHANNELS.GITHUB_AUTH_STATE, async () => githubService.getAuthState());
  ipcMain.handle(IPC_CHANNELS.GITHUB_SAVE_TOKEN, async (_e, token: string) => githubService.saveToken(token));
  ipcMain.handle(IPC_CHANNELS.GITHUB_CLEAR_TOKEN, async () => githubService.clearToken());
  ipcMain.handle(IPC_CHANNELS.GITHUB_LIST_REPOS, async () => githubService.listRepos());

  // Extensions
  ipcMain.handle(IPC_CHANNELS.EXT_LIST, async () => extensionManager.list());
  ipcMain.handle(IPC_CHANNELS.EXT_TOGGLE, async (_e, { id, enabled }: { id: string; enabled: boolean }) =>
    extensionManager.toggle(id, enabled)
  );
  ipcMain.handle(IPC_CHANNELS.EXT_INSTALL, async () => {
    const win = getMainWindow();
    if (!win) return { ok: false, error: 'Window unavailable' };
    const picked = await dialog.showOpenDialog(win, {
      title: 'Select Athena Extension Manifest (.json)',
      filters: [{ name: 'Extension Manifest', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (picked.canceled || picked.filePaths.length === 0) {
      return { ok: false, error: 'Canceled' };
    }
    return extensionManager.installFromManifestFile(picked.filePaths[0]);
  });
  ipcMain.handle(IPC_CHANNELS.EXT_UNINSTALL, async (_e, id: string) => extensionManager.uninstall(id));

  // Window Controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => getMainWindow()?.minimize());
  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => getMainWindow()?.close());
}
