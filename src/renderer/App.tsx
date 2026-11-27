import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { EditorArea } from './components/EditorArea.js';
import { ChatPanel } from './components/ChatPanel.js';
import { BottomPanel } from './components/BottomPanel.js';
import { OnboardingModal } from './components/OnboardingModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { NovaSettings, OllamaStatus, SystemMetrics, AppMode } from '@common/types.js';
import { DEFAULT_SETTINGS } from '@common/constants.js';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<NovaSettings>(DEFAULT_SETTINGS);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

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

  // Handler for saving settings via preload IPC
  const handleSaveSetting = async <K extends keyof NovaSettings>(key: K, value: NovaSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (typeof window !== 'undefined' && window.novaApi) {
      await window.novaApi.setSetting(key, value);
    }
  };

  // Handler for workspace selection via Electron native dialog
  const handleSelectWorkspace = async () => {
    if (typeof window !== 'undefined' && window.novaApi) {
      const res = await window.novaApi.selectWorkspaceDirectory();
      if (!res.canceled && res.path) {
        setCurrentWorkspace(res.path);
        setSettings((prev) => ({ ...prev, workspacePath: res.path }));
      }
    }
  };

  const handleRefreshOllama = async () => {
    if (typeof window !== 'undefined' && window.novaApi) {
      const status = await window.novaApi.checkOllamaStatus(settings.ollamaEndpoint);
      setOllamaStatus(status);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: 'var(--bg-app)',
      overflow: 'hidden',
    }}>
      {/* Top Header */}
      <Header
        settings={settings}
        ollamaStatus={ollamaStatus}
        currentWorkspace={currentWorkspace}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectWorkspace={handleSelectWorkspace}
        onToggleMode={(mode: AppMode) => handleSaveSetting('mode', mode)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          currentWorkspace={currentWorkspace}
          onSelectWorkspace={handleSelectWorkspace}
        />
        <EditorArea
          mode={settings.mode}
          currentWorkspace={currentWorkspace}
          onSelectWorkspace={handleSelectWorkspace}
        />
        <ChatPanel
          settings={settings}
          ollamaStatus={ollamaStatus}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
        />
      </div>

      {/* Status Bar */}
      <BottomPanel
        systemMetrics={systemMetrics}
        ollamaStatus={ollamaStatus}
      />

      {/* Modals */}
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
