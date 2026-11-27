import React from 'react';
import { Terminal, Activity, HardDrive, Cpu } from 'lucide-react';
import { SystemMetrics, OllamaStatus } from '@common/types.js';

interface BottomPanelProps {
  systemMetrics: SystemMetrics | null;
  ollamaStatus: OllamaStatus | null;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({ systemMetrics, ollamaStatus }) => {
  const freeRamMb = systemMetrics ? Math.round(systemMetrics.freeMemoryBytes / (1024 * 1024)) : 0;
  const totalRamMb = systemMetrics ? Math.round(systemMetrics.totalMemoryBytes / (1024 * 1024)) : 0;

  return (
    <footer style={{
      height: '26px',
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      fontSize: '11px',
      color: 'var(--text-muted)',
    }}>
      {/* Left: Status / Diagnostics summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Activity size={12} color="var(--accent-primary)" />
          <span>NOVA Engine: Ready</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Terminal size={12} />
          <span>Task: Idle</span>
        </div>
      </div>

      {/* Right: Hardware & Model Diagnostics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {systemMetrics && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Available System RAM">
              <HardDrive size={12} />
              <span>RAM: {freeRamMb}MB / {totalRamMb}MB</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title={`${systemMetrics.cpuModel} (${systemMetrics.cpuCores} cores)`}>
              <Cpu size={12} />
              <span>{systemMetrics.cpuCores} Cores</span>
            </div>
          </>
        )}

        {ollamaStatus && ollamaStatus.latencyMs !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Ping: {ollamaStatus.latencyMs}ms</span>
          </div>
        )}
      </div>
    </footer>
  );
};
