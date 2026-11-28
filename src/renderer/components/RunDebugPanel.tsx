import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe, Play, RefreshCw, Square } from 'lucide-react';
import { ProjectDetectionResult, RunnerStatus } from '@common/types.js';

interface RunDebugPanelProps {
  currentWorkspace: string | null;
  runnerStatus: RunnerStatus;
  onOpenPreview: (url: string) => void;
}

export const RunDebugPanel: React.FC<RunDebugPanelProps> = ({
  currentWorkspace,
  runnerStatus,
  onOpenPreview,
}) => {
  const [detection, setDetection] = useState<ProjectDetectionResult | null>(null);
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const refreshDetection = async () => {
    if (!currentWorkspace || !window.athenaApi) return;
    const res = await window.athenaApi.detectProject();
    setDetection(res);
    if (res.recommendedCommand && res.recommendedCommand !== 'static-preview') {
      setSelectedScript(res.recommendedCommand);
    } else if (res.scripts[0]) {
      setSelectedScript(res.scripts[0]);
    }
  };

  useEffect(() => {
    void refreshDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace]);

  if (!currentWorkspace) {
    return (
      <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>
        Open a workspace folder to detect HTML, Vite, or Node.js run configurations.
      </p>
    );
  }

  const startStatic = async () => {
    setError(null);
    const res = await window.athenaApi.startRunner('static');
    if (res.error) setError(res.error);
    else if (res.previewUrl) onOpenPreview(res.previewUrl);
  };

  const startScript = async () => {
    if (!selectedScript) return;
    const approved = window.confirm(
      `Run project script "npm run ${selectedScript}" inside ${currentWorkspace}?`
    );
    if (!approved) return;
    setError(null);
    const res = await window.athenaApi.startRunner('script', selectedScript, true);
    if (res.error) setError(res.error);
  };

  const stopRunner = async () => {
    await window.athenaApi.stopRunner();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Detected: <strong style={{ color: 'var(--text-bright)' }}>{detection?.projectType ?? '...'}</strong>
        </span>
        <button
          type="button"
          className="workbench-icon-btn"
          title="Re-detect Project"
          onClick={() => void refreshDetection()}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {detection?.entryHtml && (
        <button type="button" className="athena-btn-primary" onClick={() => void startStatic()}>
          <Globe size={13} />
          Start Local HTML Preview
        </button>
      )}

      {detection && detection.scripts.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
          }}
        >
          <label style={{ fontSize: 11, fontWeight: 600 }}>package.json Script</label>
          <select
            value={selectedScript}
            onChange={(e) => setSelectedScript(e.target.value)}
            style={{ fontSize: 12 }}
          >
            {detection.scripts.map((s) => (
              <option key={s} value={s}>
                npm run {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="athena-btn-primary"
            onClick={() => void startScript()}
            disabled={!selectedScript}
          >
            <Play size={13} />
            Run Script (Requires Approval)
          </button>
        </div>
      )}

      {runnerStatus.running && (
        <div
          style={{
            padding: 8,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--success)',
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 11,
          }}
        >
          <div style={{ color: 'var(--success)', fontWeight: 600 }}>
            Running: {runnerStatus.command}
          </div>
          {runnerStatus.previewUrl && (
            <button
              type="button"
              className="athena-btn-secondary"
              onClick={() => onOpenPreview(runnerStatus.previewUrl!)}
            >
              <ExternalLink size={12} />
              Open Preview ({runnerStatus.previewUrl})
            </button>
          )}
          <button type="button" className="athena-btn-secondary" onClick={() => void stopRunner()}>
            <Square size={12} color="var(--danger)" />
            Stop Process
          </button>
        </div>
      )}

      {error && <p style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
};
