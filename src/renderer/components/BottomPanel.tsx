import React from 'react';
import {
  WifiOff,
  GitBranch,
  AlertCircle,
  AlertTriangle,
  Activity,
  Bot,
  Terminal,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { SystemMetrics, OllamaStatus } from '@common/types.js';

interface BottomPanelProps {
  systemMetrics: SystemMetrics | null;
  ollamaStatus: OllamaStatus | null;
  activeAgentName?: string;
  isBottomPanelVisible?: boolean;
  onToggleBottomPanel?: () => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  systemMetrics,
  ollamaStatus,
  activeAgentName = 'Ollama Coder',
  isBottomPanelVisible = false,
  onToggleBottomPanel,
}) => {
  const freeRamMb = systemMetrics ? Math.round(systemMetrics.freeMemoryBytes / (1024 * 1024)) : 0;
  const totalRamMb = systemMetrics ? Math.round(systemMetrics.totalMemoryBytes / (1024 * 1024)) : 0;

  return (
    <footer
      style={{
        height: '22px',
        background: 'var(--statusbar-bg)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: '10px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        flexShrink: 0,
      }}
    >
      {/* Left: VS Code remote/local pill + branch + problems + active agent */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '10px' }}>
        <div
          style={{
            height: '100%',
            background: 'var(--statusbar-badge-bg)',
            color: '#ffffff',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: 500,
          }}
          title="100% Local-First Offline Mode"
        >
          <WifiOff size={11} />
          <span>Local Only</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Git branch (Placeholder)">
          <GitBranch size={11} />
          <span>main</span>
        </div>

        <button
          type="button"
          onClick={onToggleBottomPanel}
          title="Toggle Problems / Terminal Panel (Ctrl+J)"
          style={{ padding: '0 4px', height: '100%', fontSize: '11px', gap: '6px' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <AlertCircle size={11} /> 0
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <AlertTriangle size={11} /> 0
          </span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Activity size={11} color="var(--success)" />
          <span>Athena Engine: Ready</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)' }}>
          <Bot size={11} />
          <span>{activeAgentName} (Placeholder)</span>
        </div>
      </div>

      {/* Right: Terminal toggle, Ollama latency, Hardware diagnostics, Encoding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onToggleBottomPanel && (
          <button
            type="button"
            onClick={onToggleBottomPanel}
            style={{
              padding: '0 4px',
              height: '100%',
              fontSize: '11px',
              color: isBottomPanelVisible ? 'var(--text-bright)' : 'var(--text-secondary)',
            }}
            title="Toggle Bottom Panel (Ctrl+J)"
          >
            <Terminal size={11} />
            <span>Panel</span>
          </button>
        )}

        {ollamaStatus && ollamaStatus.latencyMs !== undefined && (
          <span>Ping: {ollamaStatus.latencyMs}ms</span>
        )}

        {systemMetrics && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Available System RAM">
              <HardDrive size={11} />
              <span>{freeRamMb} / {totalRamMb} MB</span>
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              title={`${systemMetrics.cpuModel} (${systemMetrics.cpuCores} cores)`}
            >
              <Cpu size={11} />
              <span>{systemMetrics.cpuCores} Cores</span>
            </div>
          </>
        )}

        <span>UTF-8</span>
      </div>
    </footer>
  );
};
