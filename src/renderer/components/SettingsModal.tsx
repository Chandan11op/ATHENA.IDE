import React, { useEffect, useState } from 'react';
import { Code2, Database, FolderOpen, Laptop, Moon, RotateCcw, Sun, Trash2, X } from 'lucide-react';
import { AthenaDataStats, AthenaSettings, OllamaStatus, SnapshotRecord } from '@common/types.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AthenaSettings;
  ollamaStatus: OllamaStatus | null;
  onSaveSetting: <K extends keyof AthenaSettings>(key: K, value: AthenaSettings[K]) => void;
  onSnapshotRestored?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  ollamaStatus,
  onSaveSetting,
  onSnapshotRestored,
}) => {
  const [dataStats, setDataStats] = useState<AthenaDataStats | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [dataMessage, setDataMessage] = useState<string | null>(null);

  const loadDataInfo = async () => {
    if (!window.athenaApi) return;
    const [stats, snaps] = await Promise.all([
      window.athenaApi.getDataStats(),
      window.athenaApi.listSnapshots(),
    ]);
    setDataStats(stats);
    setSnapshots(snaps);
  };

  useEffect(() => {
    if (isOpen) void loadDataInfo();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-label="Athena.IDE Settings"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          width: 600,
          maxWidth: '95vw',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Athena.IDE Settings &amp; athena.data</h2>
          <button type="button" onClick={onClose} style={{ padding: 4, color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Color Theme</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => onSaveSetting('theme', 'dark')}
                style={{
                  flex: 1,
                  padding: 7,
                  background: settings.theme === 'dark' ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                  color: settings.theme === 'dark' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <Moon size={14} /> Dark+ (Default)
              </button>
              <button
                type="button"
                onClick={() => onSaveSetting('theme', 'light')}
                style={{
                  flex: 1,
                  padding: 7,
                  background: settings.theme === 'light' ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                  color: settings.theme === 'light' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <Sun size={14} /> Light+
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Experience Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => onSaveSetting('mode', 'beginner')}
                style={{
                  flex: 1,
                  padding: 7,
                  background: settings.mode === 'beginner' ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                  color: settings.mode === 'beginner' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <Laptop size={14} /> Beginner
              </button>
              <button
                type="button"
                onClick={() => onSaveSetting('mode', 'developer')}
                style={{
                  flex: 1,
                  padding: 7,
                  background: settings.mode === 'developer' ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                  color: settings.mode === 'developer' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <Code2 size={14} /> Developer
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Editor Font Size</label>
              <input
                type="number"
                min={10}
                max={24}
                value={settings.editorFontSize}
                onChange={(e) => onSaveSetting('editorFontSize', Number(e.target.value) || 13)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Max Repair Retries</label>
              <input
                type="number"
                min={1}
                max={5}
                value={settings.maxRepairRetries}
                onChange={(e) => onSaveSetting('maxRepairRetries', Number(e.target.value) || 3)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Local Ollama Endpoint (Loopback Only)
            </label>
            <input
              type="text"
              value={settings.ollamaEndpoint}
              onChange={(e) => onSaveSetting('ollamaEndpoint', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Active Coding Model</label>
            {ollamaStatus?.isAvailable && ollamaStatus.models.length > 0 ? (
              <select
                value={settings.selectedModel}
                onChange={(e) => onSaveSetting('selectedModel', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">-- Choose installed model --</option>
                {ollamaStatus.models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB)
                  </option>
                ))}
              </select>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No local Ollama models detected.</p>
            )}
          </div>

          {/* athena.data Storage Management */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Database size={14} color="var(--accent-cyan)" />
                athena.data Local Storage
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="athena-btn-secondary"
                  onClick={() => void window.athenaApi.openDataDirectory()}
                >
                  <FolderOpen size={12} /> Open Folder
                </button>
                <button
                  type="button"
                  className="athena-btn-secondary"
                  onClick={async () => {
                    await window.athenaApi.clearCache();
                    setDataMessage('Cleared athena.data/cache.');
                    await loadDataInfo();
                  }}
                >
                  <Trash2 size={12} /> Clear Cache
                </button>
              </div>
            </div>

            {dataStats && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-app)', padding: 8, borderRadius: 4 }}>
                <div style={{ marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{dataStats.rootDir}</div>
                <div>
                  Total usage: {(dataStats.totalBytes / 1024).toFixed(1)} KB across{' '}
                  {dataStats.subdirectories.length} directories
                </div>
              </div>
            )}

            {snapshots.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                  Recoverable Checkpoints ({snapshots.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
                  {snapshots.map((snap) => (
                    <div key={snap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span>{snap.label} ({snap.files.length} files)</span>
                      <button
                        type="button"
                        className="athena-btn-secondary"
                        style={{ fontSize: 10, padding: '2px 6px' }}
                        onClick={async () => {
                          if (!window.confirm(`Restore checkpoint "${snap.label}"? Current file changes will be reverted.`)) return;
                          const res = await window.athenaApi.restoreSnapshot(snap.id);
                          setDataMessage(res.ok ? `Restored ${res.restored.length} file(s).` : res.error ?? 'Restore failed');
                          onSnapshotRestored?.();
                        }}
                      >
                        <RotateCcw size={11} /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dataMessage && <p style={{ fontSize: 11, color: 'var(--accent-cyan)', marginTop: 6 }}>{dataMessage}</p>}
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="athena-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
