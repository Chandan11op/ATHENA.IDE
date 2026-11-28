import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Cpu,
  GitBranch,
  HardDrive,
  Terminal,
  WifiOff,
} from 'lucide-react';
import { GitStatusSummary, OllamaStatus, SystemMetrics } from '@common/types.js';
import { EditorTab } from '../types/workbench.js';

interface BottomPanelProps {
  systemMetrics: SystemMetrics | null;
  ollamaStatus: OllamaStatus | null;
  selectedModel: string;
  gitStatus: GitStatusSummary | null;
  activeTab?: EditorTab;
  cursorLine: number;
  cursorColumn: number;
  errorCount: number;
  warningCount: number;
  isBottomPanelVisible: boolean;
  onToggleBottomPanel: () => void;
  onOpenProblems: () => void;
  onOpenGit: () => void;
  onOpenAiModels: () => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  systemMetrics,
  ollamaStatus,
  selectedModel,
  gitStatus,
  activeTab,
  cursorLine,
  cursorColumn,
  errorCount,
  warningCount,
  isBottomPanelVisible,
  onToggleBottomPanel,
  onOpenProblems,
  onOpenGit,
  onOpenAiModels,
}) => {
  const freeRamGb = systemMetrics
    ? (systemMetrics.freeMemoryBytes / (1024 * 1024 * 1024)).toFixed(1)
    : '0';
  const totalRamGb = systemMetrics
    ? (systemMetrics.totalMemoryBytes / (1024 * 1024 * 1024)).toFixed(1)
    : '0';

  return (
    <footer
      style={{
        height: 22,
        background: 'var(--statusbar-bg)',
        color: 'var(--statusbar-fg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 10,
        fontSize: 11,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 10 }}>
        <div
          style={{
            height: '100%',
            background: 'var(--statusbar-badge-bg)',
            color: '#ffffff',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontWeight: 600,
          }}
          title="Offline-First Local Execution"
        >
          <WifiOff size={11} />
          <span>Local Only</span>
        </div>

        <button type="button" onClick={onOpenGit} title="Source Control" style={{ padding: '0 4px', height: '100%', fontSize: 11 }}>
          <GitBranch size={11} />
          <span>{gitStatus?.branch ?? 'no-git'}</span>
        </button>

        <button type="button" onClick={onOpenProblems} title="Problems" style={{ padding: '0 4px', height: '100%', fontSize: 11, gap: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <AlertCircle size={11} /> {errorCount}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <AlertTriangle size={11} /> {warningCount}
          </span>
        </button>

        <button type="button" onClick={onOpenAiModels} title="Active Ollama Model" style={{ padding: '0 4px', height: '100%', fontSize: 11 }}>
          <Bot size={11} />
          <span>
            {ollamaStatus?.isAvailable
              ? selectedModel || ollamaStatus.models[0]?.name || 'Ollama Online (No model)'
              : 'Ollama Offline'}
          </span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {activeTab?.kind === 'code' && (
          <>
            <span>Ln {cursorLine}, Col {cursorColumn}</span>
            <span>{activeTab.language ?? 'plaintext'}</span>
          </>
        )}

        <button
          type="button"
          onClick={onToggleBottomPanel}
          style={{ padding: '0 4px', height: '100%', fontSize: 11, opacity: isBottomPanelVisible ? 1 : 0.85 }}
          title="Toggle Terminal Panel (Ctrl+J)"
        >
          <Terminal size={11} />
          <span>Terminal</span>
        </button>

        {systemMetrics && (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Free / Total System RAM">
              <HardDrive size={11} />
              {freeRamGb}/{totalRamGb} GB
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title={systemMetrics.cpuModel}>
              <Cpu size={11} />
              {systemMetrics.cpuCores}c
            </span>
          </>
        )}

        <span>UTF-8</span>
      </div>
    </footer>
  );
};
