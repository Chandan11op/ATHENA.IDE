import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS } from '@common/constants.js';
import {
  AppMode,
  AthenaExtension,
  AthenaSettings,
  FileTreeNode,
  GitStatusSummary,
  OllamaStatus,
  ProposedFileEdit,
  RunnerStatus,
  SystemMetrics,
} from '@common/types.js';
import { ActivityBar } from './components/ActivityBar.js';
import { BottomPanel } from './components/BottomPanel.js';
import { ChatPanel } from './components/ChatPanel.js';
import { CommandItem, CommandPaletteModal } from './components/CommandPaletteModal.js';
import { EditorArea, ProblemMarker } from './components/EditorArea.js';
import { Header } from './components/Header.js';
import { OnboardingModal } from './components/OnboardingModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { Sidebar } from './components/Sidebar.js';
import { ActivityView, BottomPanelTab, EditorTab, WELCOME_TAB } from './types/workbench.js';

function joinPath(dir: string, name: string): string {
  const sep = dir.includes('\\') ? '\\' : '/';
  return `${dir.replace(/[\\/]+$/, '')}${sep}${name}`;
}

function toRelative(workspace: string | null, fullPath: string): string {
  if (!workspace) return fullPath;
  const normWs = workspace.replace(/[\\/]+$/, '');
  if (fullPath.toLowerCase().startsWith(normWs.toLowerCase())) {
    return fullPath.slice(normWs.length).replace(/^[\\/]+/, '');
  }
  return fullPath;
}

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AthenaSettings>(DEFAULT_SETTINGS);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [gitStatus, setGitStatus] = useState<GitStatusSummary | null>(null);
  const [extensions, setExtensions] = useState<AthenaExtension[]>([]);
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatus>({
    running: false,
    mode: null,
    previewUrl: null,
    command: null,
  });
  const [outputLogs, setOutputLogs] = useState<string[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [activeView, setActiveView] = useState<ActivityView>('explorer');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isBottomPanelVisible, setIsBottomPanelVisible] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(195);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomPanelTab>('terminal');
  const [isAgentPanelVisible, setIsAgentPanelVisible] = useState(true);
  const [newTerminalSignal, setNewTerminalSignal] = useState(0);

  const [tabs, setTabs] = useState<EditorTab[]>([WELCOME_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>('welcome');
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorColumn, setCursorColumn] = useState(1);
  const [selectionText, setSelectionText] = useState('');
  const [markers, setMarkers] = useState<ProblemMarker[]>([]);

  const sidebarResizingRef = useRef(false);

  const refreshTree = useCallback(async () => {
    if (!window.athenaApi) return;
    const res = await window.athenaApi.readDirectoryTree(5);
    if (res.ok) setFileTree(res.tree);
    else setFileTree([]);
  }, []);

  const refreshGit = useCallback(async () => {
    if (!window.athenaApi) return;
    setGitStatus(await window.athenaApi.getGitStatus());
  }, []);

  const refreshOllama = useCallback(async (endpointOverride?: string) => {
    if (!window.athenaApi) return;
    const status = await window.athenaApi.checkOllamaStatus(
      endpointOverride ?? settings.ollamaEndpoint
    );
    setOllamaStatus(status);
  }, [settings.ollamaEndpoint]);

  const loadInitialData = useCallback(async () => {
    if (typeof window === 'undefined' || !window.athenaApi) return;
    try {
      const [loadedSettings, metrics, extList, setupState] = await Promise.all([
        window.athenaApi.getSettings(),
        window.athenaApi.getSystemMetrics(),
        window.athenaApi.listExtensions(),
        window.athenaApi.getSetupState(),
      ]);
      setSettings(loadedSettings);
      setCurrentWorkspace(loadedSettings.workspacePath);
      setSystemMetrics(metrics);
      setExtensions(extList);

      const env = await window.athenaApi.inspectOllamaEnvironment(loadedSettings.ollamaEndpoint);
      const status = await window.athenaApi.checkOllamaStatus(loadedSettings.ollamaEndpoint);
      setOllamaStatus(status);

      // Auto-select first installed model if user had none configured
      if (!loadedSettings.selectedModel && status.models.length > 0 && status.models[0]) {
        const firstModel = status.models[0].name;
        await window.athenaApi.setSetting('selectedModel', firstModel);
        setSettings((prev) => ({ ...prev, selectedModel: firstModel }));
      }

      if (!setupState.skippedAiSetup && (!env.apiReachable || status.models.length === 0)) {
        setIsOnboardingOpen(true);
      }

      if (loadedSettings.workspacePath) {
        await Promise.all([refreshTree(), refreshGit()]);
      }
    } catch (err) {
      console.error('Failed to load initial data from preload:', err);
    }
  }, [refreshGit, refreshTree]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    document.body.className = `theme-${settings.theme}`;
  }, [settings.theme]);

  useEffect(() => {
    if (!window.athenaApi) return;
    const unsubOut = window.athenaApi.onRunnerOutput((ev) => {
      setOutputLogs((prev) => [...prev.slice(-300), ev.text]);
    });
    const unsubStat = window.athenaApi.onRunnerStatus((stat) => {
      setRunnerStatus(stat);
    });
    return () => {
      unsubOut();
      unsubStat();
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!sidebarResizingRef.current) return;
      setSidebarWidth(Math.max(200, Math.min(460, e.clientX - 48)));
    };
    const onUp = () => {
      sidebarResizingRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleSaveSetting = useCallback(
    async <K extends keyof AthenaSettings>(key: K, value: AthenaSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      if (window.athenaApi) {
        await window.athenaApi.setSetting(key, value);
      }
    },
    []
  );

  const handleSelectWorkspace = useCallback(async () => {
    if (!window.athenaApi) return;
    const res = await window.athenaApi.selectWorkspaceDirectory();
    if (!res.canceled && res.path) {
      setCurrentWorkspace(res.path);
      setSettings((prev) => ({ ...prev, workspacePath: res.path }));
      await Promise.all([refreshTree(), refreshGit()]);
    }
  }, [refreshGit, refreshTree]);

  const handleSwitchWorkspacePath = useCallback(
    async (wsPath: string) => {
      await handleSaveSetting('workspacePath', wsPath);
      setCurrentWorkspace(wsPath);
      await Promise.all([refreshTree(), refreshGit()]);
    },
    [handleSaveSetting, refreshGit, refreshTree]
  );

  const handleOpenFile = useCallback(
    async (filePath: string, line?: number, column?: number) => {
      if (!window.athenaApi) return;
      const existing = tabs.find((t) => t.kind === 'code' && t.path === filePath);
      if (existing) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === existing.id ? { ...t, cursorLine: line, cursorColumn: column } : t
          )
        );
        setActiveTabId(existing.id);
        return;
      }

      const res = await window.athenaApi.readFile(filePath);
      if (!res.ok) {
        setOutputLogs((prev) => [...prev, `[Explorer] ${res.error ?? 'Unable to open file'}\n`]);
        return;
      }

      const title = filePath.split(/[\\/]/).pop() ?? filePath;
      const newTab: EditorTab = {
        id: `file:${filePath}`,
        title,
        path: filePath,
        kind: 'code',
        language: res.language ?? 'plaintext',
        content: res.content ?? '',
        savedContent: res.content ?? '',
        cursorLine: line,
        cursorColumn: column,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    },
    [tabs]
  );

  const handleSaveTab = useCallback(
    async (tabId: string) => {
      const target = tabs.find((t) => t.id === tabId);
      if (!target || target.kind !== 'code' || !window.athenaApi) return;
      const res = await window.athenaApi.writeFile(target.path, target.content ?? '');
      if (res.ok) {
        setTabs((prev) =>
          prev.map((t) => (t.id === tabId ? { ...t, savedContent: t.content } : t))
        );
        await refreshGit();
      } else {
        setOutputLogs((prev) => [...prev, `[Save Error] ${res.error ?? 'Failed'}\n`]);
      }
    },
    [refreshGit, tabs]
  );

  const handleSaveAsTab = useCallback(
    async (tabId: string) => {
      const target = tabs.find((t) => t.id === tabId);
      if (!target || target.kind !== 'code' || !window.athenaApi) return;
      const res = await window.athenaApi.saveFileAs(target.title, target.content ?? '');
      if (res.ok && res.path) {
        await refreshTree();
        await handleOpenFile(res.path);
      }
    },
    [handleOpenFile, refreshTree, tabs]
  );

  const handleOpenPreview = useCallback((url: string) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.id === 'preview');
      if (exists) {
        return prev.map((t) => (t.id === 'preview' ? { ...t, path: url } : t));
      }
      return [...prev, { id: 'preview', title: 'Live Preview', path: url, kind: 'preview' }];
    });
    setActiveTabId('preview');
  }, []);

  const handleOpenGitDiff = useCallback((filePath: string, diffText: string) => {
    const id = `diff:${filePath}`;
    const newTab: EditorTab = {
      id,
      title: `Diff: ${filePath.split(/[\\/]/).pop()}`,
      path: filePath,
      kind: 'diff',
      language: 'plaintext',
      diffOriginal: '',
      diffModified: diffText,
    };
    setTabs((prev) => [...prev.filter((t) => t.id !== id), newTab]);
    setActiveTabId(id);
  }, []);

  const handlePreviewProposedEdit = useCallback(
    async (edit: ProposedFileEdit) => {
      if (!currentWorkspace || !window.athenaApi) return;
      const fullPath = joinPath(currentWorkspace, edit.relativePath);
      const readRes = await window.athenaApi.readFile(fullPath);
      const id = `ai-diff:${edit.relativePath}`;
      const diffTab: EditorTab = {
        id,
        title: `AI Diff: ${edit.relativePath.split(/[\\/]/).pop()}`,
        path: edit.relativePath,
        kind: 'diff',
        language: readRes.language ?? 'typescript',
        diffOriginal: readRes.ok ? readRes.content ?? '' : '',
        diffModified: edit.newContent ?? '',
      };
      setTabs((prev) => [...prev.filter((t) => t.id !== id), diffTab]);
      setActiveTabId(id);
    },
    [currentWorkspace]
  );

  const handleApplyProposedEdits = useCallback(
    async (edits: ProposedFileEdit[], label: string) => {
      if (!window.athenaApi) return;
      const res = await window.athenaApi.applyProposedEdits(edits, label);
      if (res.ok) {
        setOutputLogs((prev) => [
          ...prev,
          `[Checkpoint ${res.snapshotId}] Applied edits to: ${res.appliedFiles.join(', ')}\n`,
        ]);
        await Promise.all([refreshTree(), refreshGit()]);
        for (const rel of res.appliedFiles) {
          if (currentWorkspace) {
            const abs = joinPath(currentWorkspace, rel);
            const open = tabs.find((t) => t.path === abs);
            if (open) {
              const fresh = await window.athenaApi.readFile(abs);
              if (fresh.ok) {
                setTabs((prev) =>
                  prev.map((t) =>
                    t.id === open.id
                      ? { ...t, content: fresh.content, savedContent: fresh.content }
                      : t
                  )
                );
              }
            }
          }
        }
      } else {
        setOutputLogs((prev) => [...prev, `[Apply Edits Error] ${res.errors.join('; ')}\n`]);
      }
    },
    [currentWorkspace, refreshGit, refreshTree, tabs]
  );

  const handleSelectActivityView = useCallback(
    (view: ActivityView) => {
      if (isSidebarVisible && activeView === view) {
        setIsSidebarVisible(false);
        return;
      }
      setActiveView(view);
      setIsSidebarVisible(true);
    },
    [activeView, isSidebarVisible]
  );

  // Native Electron Menu Action Listener
  useEffect(() => {
    if (!window.athenaApi) return;
    return window.athenaApi.onMenuAction((action) => {
      switch (action) {
        case 'file:open-folder':
          void handleSelectWorkspace();
          break;
        case 'file:save':
          void handleSaveTab(activeTabId);
          break;
        case 'file:save-as':
          void handleSaveAsTab(activeTabId);
          break;
        case 'file:new':
          setActiveView('explorer');
          setIsSidebarVisible(true);
          break;
        case 'view:command-palette':
          setIsCommandPaletteOpen(true);
          break;
        case 'view:settings':
          setIsSettingsOpen(true);
          break;
        case 'view:explorer':
          setActiveView('explorer');
          setIsSidebarVisible(true);
          break;
        case 'view:search':
          setActiveView('search');
          setIsSidebarVisible(true);
          break;
        case 'view:git':
          setActiveView('git');
          setIsSidebarVisible(true);
          break;
        case 'view:run':
          setActiveView('run');
          setIsSidebarVisible(true);
          break;
        case 'view:extensions':
          setActiveView('extensions');
          setIsSidebarVisible(true);
          break;
        case 'view:ai':
          setIsAgentPanelVisible((v) => !v);
          break;
        case 'view:toggle-sidebar':
          setIsSidebarVisible((v) => !v);
          break;
        case 'view:toggle-panel':
          setIsBottomPanelVisible((v) => !v);
          break;
        case 'run:stop':
          void window.athenaApi.stopRunner();
          break;
        case 'terminal:new':
          setIsBottomPanelVisible(true);
          setActiveBottomTab('terminal');
          setNewTerminalSignal((n) => n + 1);
          break;
        case 'help:ollama':
          setIsOnboardingOpen(true);
          break;
      }
    });
  }, [activeTabId, handleSaveAsTab, handleSaveTab, handleSelectWorkspace]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();

      if (e.shiftKey && key === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen((v) => !v);
      } else if (e.shiftKey && key === 's') {
        e.preventDefault();
        void handleSaveAsTab(activeTabId);
      } else if (!e.shiftKey && key === 's') {
        e.preventDefault();
        void handleSaveTab(activeTabId);
      } else if (!e.shiftKey && key === 'b') {
        e.preventDefault();
        setIsSidebarVisible((v) => !v);
      } else if (!e.shiftKey && key === 'j') {
        e.preventDefault();
        setIsBottomPanelVisible((v) => !v);
      } else if (!e.shiftKey && key === 'l') {
        e.preventDefault();
        setIsAgentPanelVisible((v) => !v);
      } else if (key === '`') {
        e.preventDefault();
        setIsBottomPanelVisible(true);
        setActiveBottomTab('terminal');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTabId, handleSaveAsTab, handleSaveTab]);

  const commandItems: CommandItem[] = useMemo(
    () => [
      { id: 'cmd-workspace', category: 'Workspace', label: 'Open Workspace Folder', action: () => void handleSelectWorkspace() },
      { id: 'cmd-save', category: 'File', label: 'Save Active File', hint: 'Ctrl+S', action: () => void handleSaveTab(activeTabId) },
      { id: 'cmd-sidebar', category: 'View', label: 'Toggle Primary Side Bar', hint: 'Ctrl+B', action: () => setIsSidebarVisible((v) => !v) },
      { id: 'cmd-panel', category: 'Panel', label: 'Toggle Bottom Terminal / Problems Panel', hint: 'Ctrl+J', action: () => setIsBottomPanelVisible((v) => !v) },
      { id: 'cmd-agent-panel', category: 'Agent', label: 'Toggle Athena AI Chat', hint: 'Ctrl+L', action: () => setIsAgentPanelVisible((v) => !v) },
      {
        id: 'cmd-ai-models',
        category: 'Runtime',
        label: 'Manage Local Ollama Models & athena.data Knowledge',
        action: () => {
          setActiveView('ai');
          setIsSidebarVisible(true);
        },
      },
      {
        id: 'cmd-theme',
        category: 'Theme',
        label: `Switch to ${settings.theme === 'dark' ? 'Light+' : 'Dark+'} Theme`,
        action: () => void handleSaveSetting('theme', settings.theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'cmd-mode',
        category: 'View',
        label: `Switch to ${settings.mode === 'beginner' ? 'Developer' : 'Beginner'} Mode`,
        action: () => void handleSaveSetting('mode', settings.mode === 'beginner' ? 'developer' : 'beginner'),
      },
      { id: 'cmd-ollama', category: 'Runtime', label: 'Check Local Ollama Setup', action: () => setIsOnboardingOpen(true) },
      { id: 'cmd-settings', category: 'Preferences', label: 'Open Settings & athena.data', action: () => setIsSettingsOpen(true) },
    ],
    [activeTabId, handleSaveAsTab, handleSaveSetting, handleSaveTab, handleSelectWorkspace, settings.mode, settings.theme]
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const inlineExtEnabled =
    extensions.find((e) => e.id === 'athena.ollama-inline')?.enabled ?? true;
  const errorCount = markers.filter((m) => m.severity === 'error').length;
  const warningCount = markers.filter((m) => m.severity === 'warning').length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-app)',
        overflow: 'hidden',
      }}
    >
      <Header
        settings={settings}
        ollamaStatus={ollamaStatus}
        currentWorkspace={currentWorkspace}
        isSidebarVisible={isSidebarVisible}
        isBottomPanelVisible={isBottomPanelVisible}
        isAgentPanelVisible={isAgentPanelVisible}
        onToggleSidebar={() => setIsSidebarVisible((v) => !v)}
        onToggleBottomPanel={() => setIsBottomPanelVisible((v) => !v)}
        onToggleAgentPanel={() => setIsAgentPanelVisible((v) => !v)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectWorkspace={() => void handleSelectWorkspace()}
        onToggleMode={(mode: AppMode) => void handleSaveSetting('mode', mode)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <ActivityBar
          activeView={activeView}
          isSidebarVisible={isSidebarVisible}
          isOllamaOnline={ollamaStatus?.isAvailable ?? false}
          gitChangesCount={gitStatus?.changes.length ?? 0}
          onSelectView={handleSelectActivityView}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <Sidebar
          activeView={activeView}
          isVisible={isSidebarVisible}
          width={sidebarWidth}
          currentWorkspace={currentWorkspace}
          tree={fileTree}
          activeFilePath={activeTab?.kind === 'code' ? activeTab.path : undefined}
          ollamaStatus={ollamaStatus}
          selectedModel={settings.selectedModel}
          systemMetrics={systemMetrics}
          gitStatus={gitStatus}
          runnerStatus={runnerStatus}
          onSelectWorkspace={() => void handleSelectWorkspace()}
          onRefreshTree={() => void refreshTree()}
          onOpenFile={(fp, ln, col) => void handleOpenFile(fp, ln, col)}
          onCreateFile={async (parentDir, name) => {
            const full = joinPath(parentDir, name);
            const res = await window.athenaApi.createFile(full, '');
            if (res.ok) {
              await refreshTree();
              await handleOpenFile(full);
            }
          }}
          onCreateFolder={async (parentDir, name) => {
            const res = await window.athenaApi.createDirectory(joinPath(parentDir, name));
            if (res.ok) await refreshTree();
          }}
          onRenamePath={async (oldPath, newName) => {
            const parent = oldPath.replace(/[\\/][^\\/]+$/, '');
            const newPath = joinPath(parent, newName);
            const res = await window.athenaApi.renamePath(oldPath, newPath);
            if (res.ok) await refreshTree();
          }}
          onDeletePath={async (targetPath, name) => {
            if (!window.confirm(`Delete "${name}" from disk?`)) return;
            const res = await window.athenaApi.deletePath(targetPath);
            if (res.ok) {
              setTabs((prev) => prev.filter((t) => t.path !== targetPath));
              await refreshTree();
            }
          }}
          onRefreshGit={refreshGit}
          onOpenDiff={handleOpenGitDiff}
          onWorkspaceChanged={(np) => void handleSwitchWorkspacePath(np)}
          onOpenPreview={handleOpenPreview}
          onSelectModel={(m) => void handleSaveSetting('selectedModel', m)}
          onRefreshOllama={() => refreshOllama()}
          onExtensionsChanged={setExtensions}
        />

        {isSidebarVisible && (
          <div
            onMouseDown={() => {
              sidebarResizingRef.current = true;
            }}
            title="Drag to resize sidebar"
            style={{ width: 4, cursor: 'ew-resize', background: 'transparent', flexShrink: 0 }}
          />
        )}

        <EditorArea
          mode={settings.mode}
          settings={settings}
          ollamaStatus={ollamaStatus}
          inlineCompletionEnabled={inlineExtEnabled}
          currentWorkspace={currentWorkspace}
          tabs={tabs}
          activeTabId={activeTabId}
          isBottomPanelVisible={isBottomPanelVisible}
          activeBottomTab={activeBottomTab}
          bottomPanelHeight={bottomPanelHeight}
          runnerStatus={runnerStatus}
          outputLogs={outputLogs}
          newTerminalSignal={newTerminalSignal}
          onSelectTab={setActiveTabId}
          onCloseTab={(tabId) => {
            setTabs((prev) => {
              const next = prev.filter((t) => t.id !== tabId);
              if (activeTabId === tabId) setActiveTabId(next[0]?.id ?? 'welcome');
              return next.length > 0 ? next : [WELCOME_TAB];
            });
          }}
          onUpdateTabContent={(tabId, content) =>
            setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, content } : t)))
          }
          onSaveTab={(tabId) => void handleSaveTab(tabId)}
          onCursorChange={(ln, col, sel) => {
            setCursorLine(ln);
            setCursorColumn(col);
            setSelectionText(sel);
          }}
          onMarkersChange={setMarkers}
          onSelectWorkspace={() => void handleSelectWorkspace()}
          onOpenRecentWorkspace={(ws) => void handleSwitchWorkspacePath(ws)}
          onSelectBottomTab={setActiveBottomTab}
          onCloseBottomPanel={() => setIsBottomPanelVisible(false)}
          onResizeBottomPanel={setBottomPanelHeight}
          onOpenAiSidebar={() => {
            setActiveView('ai');
            setIsSidebarVisible(true);
          }}
          onToggleWordWrap={() => void handleSaveSetting('editorWordWrap', !settings.editorWordWrap)}
          onStopRunner={() => void window.athenaApi.stopRunner()}
        />

        <ChatPanel
          settings={settings}
          ollamaStatus={ollamaStatus}
          isVisible={isAgentPanelVisible}
          currentWorkspace={currentWorkspace}
          activeFile={
            activeTab?.kind === 'code'
              ? {
                  path: activeTab.path,
                  relativePath: toRelative(currentWorkspace, activeTab.path),
                  content: activeTab.content ?? '',
                }
              : undefined
          }
          selectionText={selectionText}
          onClose={() => setIsAgentPanelVisible(false)}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          onPreviewProposedEdit={(ed) => void handlePreviewProposedEdit(ed)}
          onApplyProposedEdits={handleApplyProposedEdits}
        />
      </div>

      <BottomPanel
        systemMetrics={systemMetrics}
        ollamaStatus={ollamaStatus}
        selectedModel={settings.selectedModel}
        gitStatus={gitStatus}
        activeTab={activeTab}
        cursorLine={cursorLine}
        cursorColumn={cursorColumn}
        errorCount={errorCount}
        warningCount={warningCount}
        isBottomPanelVisible={isBottomPanelVisible}
        onToggleBottomPanel={() => setIsBottomPanelVisible((v) => !v)}
        onOpenProblems={() => {
          setIsBottomPanelVisible(true);
          setActiveBottomTab('problems');
        }}
        onOpenGit={() => {
          setActiveView('git');
          setIsSidebarVisible(true);
        }}
        onOpenAiModels={() => {
          setActiveView('ai');
          setIsSidebarVisible(true);
        }}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commandItems}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        ollamaStatus={ollamaStatus}
        onSaveSetting={(k, v) => void handleSaveSetting(k, v)}
        onSnapshotRestored={() => void Promise.all([refreshTree(), refreshGit()])}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        ollamaStatus={ollamaStatus}
        settings={settings}
        onRefresh={() => refreshOllama()}
        onSelectModel={(m) => handleSaveSetting('selectedModel', m)}
      />
    </div>
  );
};
