import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header.js';
import { ActivityBar } from './components/ActivityBar.js';
import { Sidebar } from './components/Sidebar.js';
import { EditorArea } from './components/EditorArea.js';
import { ChatPanel } from './components/ChatPanel.js';
import { BottomPanel } from './components/BottomPanel.js';
import { OnboardingModal } from './components/OnboardingModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { CommandPaletteModal, type CommandItem } from './components/CommandPaletteModal.js';
import { NovaSettings, OllamaStatus, SystemMetrics, AppMode } from '@common/types.js';
import { DEFAULT_SETTINGS } from '@common/constants.js';
import {
  ActivityView,
  AgentExecutionMode,
  BottomPanelTab,
  DEFAULT_EDITOR_TABS,
  EditorTab,
  OFFLINE_AGENT_PLACEHOLDERS,
} from './types/workbench.js';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<NovaSettings>(DEFAULT_SETTINGS);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // VS Code + Antigravity workbench state
  const [activeView, setActiveView] = useState<ActivityView>('explorer');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isBottomPanelVisible, setIsBottomPanelVisible] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomPanelTab>('terminal');
  const [isAgentPanelVisible, setIsAgentPanelVisible] = useState(true);
  const [tabs, setTabs] = useState<EditorTab[]>(DEFAULT_EDITOR_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('welcome');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('ollama-coder');
  const [agentMode, setAgentMode] = useState<AgentExecutionMode>('planning');

  const activeAgent =
    OFFLINE_AGENT_PLACEHOLDERS.find((a) => a.id === selectedAgentId) ??
    OFFLINE_AGENT_PLACEHOLDERS[0];

  // Load initial settings and system info from Electron main via Preload
  const loadInitialData = useCallback(async () => {
    if (typeof window !== 'undefined' && window.novaApi) {
      try {
        const loadedSettings = await window.novaApi.getSettings();
        setSettings(loadedSettings);
        setCurrentWorkspace(loadedSettings.workspacePath);

        const metrics = await window.novaApi.getSystemMetrics();
        setSystemMetrics(metrics);

        const status = await window.novaApi.checkOllamaStatus(loadedSettings.ollamaEndpoint);
        setOllamaStatus(status);

        // If Ollama is offline on first launch, open the non-intrusive onboarding prompt
        if (!status.isAvailable) {
          setIsOnboardingOpen(true);
        }
      } catch (err) {
        console.error('Failed to load initial data from preload:', err);
      }
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Synchronize theme attribute on body
  useEffect(() => {
    document.body.className = `theme-${settings.theme}`;
  }, [settings.theme]);

  const handleSaveSetting = useCallback(
    async <K extends keyof NovaSettings>(key: K, value: NovaSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      if (typeof window !== 'undefined' && window.novaApi) {
        await window.novaApi.setSetting(key, value);
      }
    },
    []
  );

  const handleSelectWorkspace = useCallback(async () => {
    if (typeof window !== 'undefined' && window.novaApi) {
      const res = await window.novaApi.selectWorkspaceDirectory();
      if (!res.canceled && res.path) {
        setCurrentWorkspace(res.path);
        setSettings((prev) => ({ ...prev, workspacePath: res.path }));
      }
    }
  }, []);

  const handleRefreshOllama = useCallback(async () => {
    if (typeof window !== 'undefined' && window.novaApi) {
      const status = await window.novaApi.checkOllamaStatus(settings.ollamaEndpoint);
      setOllamaStatus(status);
    }
  }, [settings.ollamaEndpoint]);

  const handleSelectActivityView = (view: ActivityView) => {
    if (isSidebarVisible && activeView === view) {
      setIsSidebarVisible(false);
      return;
    }
    setActiveView(view);
    setIsSidebarVisible(true);
  };

  const handleOpenSampleFile = (title: string, path: string, content: string) => {
    const id = `file-${title}`;
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      return [...prev, { id, title, path, kind: 'code', content }];
    });
    setActiveTabId(id);
  };

  const handleCloseTab = (tabId: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId && next[0]) {
        setActiveTabId(next[0].id);
      }
      return next;
    });
  };

  // Global VS Code-style keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();

      if (e.shiftKey && key === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen((v) => !v);
      } else if (!e.shiftKey && key === 'b') {
        e.preventDefault();
        setIsSidebarVisible((v) => !v);
      } else if (!e.shiftKey && key === 'j') {
        e.preventDefault();
        setIsBottomPanelVisible((v) => !v);
      } else if (!e.shiftKey && key === 'l') {
        e.preventDefault();
        setIsAgentPanelVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commandItems: CommandItem[] = useMemo(
    () => [
      { id: 'cmd-workspace', category: 'Workspace', label: 'Open Workspace Folder', action: handleSelectWorkspace },
      { id: 'cmd-sidebar', category: 'View', label: 'Toggle Primary Side Bar', hint: 'Ctrl+B', action: () => setIsSidebarVisible((v) => !v) },
      { id: 'cmd-panel', category: 'Panel', label: 'Toggle Bottom Terminal / Problems Panel', hint: 'Ctrl+J', action: () => setIsBottomPanelVisible((v) => !v) },
      { id: 'cmd-agent-panel', category: 'Agent', label: 'Toggle Athena Agent Side Bar', hint: 'Ctrl+L', action: () => setIsAgentPanelVisible((v) => !v) },
      {
        id: 'cmd-agents-hub',
        category: 'Agent',
        label: 'Open Local Offline Agents Hub',
        action: () => {
          setActiveView('agents');
          setIsSidebarVisible(true);
        },
      },
      {
        id: 'cmd-theme',
        category: 'Theme',
        label: `Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} Modern Theme`,
        action: () => handleSaveSetting('theme', settings.theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'cmd-mode',
        category: 'View',
        label: `Switch to ${settings.mode === 'beginner' ? 'Developer' : 'Beginner'} Mode`,
        action: () => handleSaveSetting('mode', settings.mode === 'beginner' ? 'developer' : 'beginner'),
      },
      { id: 'cmd-ollama', category: 'Runtime', label: 'Check Local Ollama Setup', action: () => setIsOnboardingOpen(true) },
      { id: 'cmd-settings', category: 'Preferences', label: 'Open Settings', action: () => setIsSettingsOpen(true) },
    ],
    [handleSaveSetting, handleSelectWorkspace, settings.mode, settings.theme]
  );

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
        onSelectWorkspace={handleSelectWorkspace}
        onToggleMode={(mode: AppMode) => handleSaveSetting('mode', mode)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      {/* VS Code + Antigravity Main Workbench Area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <ActivityBar
          activeView={activeView}
          isSidebarVisible={isSidebarVisible}
          isOllamaOnline={ollamaStatus?.isAvailable ?? false}
          onSelectView={handleSelectActivityView}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <Sidebar
          activeView={activeView}
          isVisible={isSidebarVisible}
          currentWorkspace={currentWorkspace}
          selectedAgentId={selectedAgentId}
          ollamaStatus={ollamaStatus}
          onSelectWorkspace={handleSelectWorkspace}
          onSelectAgent={(id) => {
            setSelectedAgentId(id);
            setIsAgentPanelVisible(true);
          }}
          onOpenSampleFile={handleOpenSampleFile}
        />

        <EditorArea
          mode={settings.mode}
          currentWorkspace={currentWorkspace}
          tabs={tabs}
          activeTabId={activeTabId}
          isBottomPanelVisible={isBottomPanelVisible}
          activeBottomTab={activeBottomTab}
          activeAgentName={activeAgent.name}
          onSelectTab={setActiveTabId}
          onCloseTab={handleCloseTab}
          onSelectWorkspace={handleSelectWorkspace}
          onSelectBottomTab={setActiveBottomTab}
          onCloseBottomPanel={() => setIsBottomPanelVisible(false)}
          onOpenAgentsSidebar={() => {
            setActiveView('agents');
            setIsSidebarVisible(true);
          }}
        />

        <ChatPanel
          settings={settings}
          ollamaStatus={ollamaStatus}
          isVisible={isAgentPanelVisible}
          selectedAgentId={selectedAgentId}
          agentMode={agentMode}
          onSelectAgent={setSelectedAgentId}
          onChangeAgentMode={setAgentMode}
          onClose={() => setIsAgentPanelVisible(false)}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
        />
      </div>

      {/* VS Code Status Bar */}
      <BottomPanel
        systemMetrics={systemMetrics}
        ollamaStatus={ollamaStatus}
        activeAgentName={activeAgent.name}
        isBottomPanelVisible={isBottomPanelVisible}
        onToggleBottomPanel={() => setIsBottomPanelVisible((v) => !v)}
      />

      {/* Modals */}
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
        onSaveSetting={handleSaveSetting}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        ollamaStatus={ollamaStatus}
        settings={settings}
        onRefresh={handleRefreshOllama}
      />
    </div>
  );
};
