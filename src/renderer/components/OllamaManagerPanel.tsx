import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Cpu,
  Download,
  FilePlus,
  FolderSearch,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { RECOMMENDED_MODELS } from '@common/constants.js';
import {
  KnowledgeHit,
  KnowledgeSource,
  OllamaStatus,
  SystemMetrics,
} from '@common/types.js';

interface OllamaManagerPanelProps {
  ollamaStatus: OllamaStatus | null;
  selectedModel: string;
  systemMetrics: SystemMetrics | null;
  onSelectModel: (model: string) => void;
  onRefreshOllama: () => Promise<void>;
}

export const OllamaManagerPanel: React.FC<OllamaManagerPanelProps> = ({
  ollamaStatus,
  selectedModel,
  systemMetrics,
  onSelectModel,
  onRefreshOllama,
}) => {
  const [pullName, setPullName] = useState('qwen2.5-coder:1.5b');
  const [pullProgress, setPullProgress] = useState<string | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [kbQuery, setKbQuery] = useState('');
  const [kbHits, setKbHits] = useState<KnowledgeHit[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const totalRamGb = systemMetrics
    ? Math.round(systemMetrics.totalMemoryBytes / (1024 * 1024 * 1024))
    : 8;

  const loadKnowledge = async () => {
    if (!window.athenaApi) return;
    setSources(await window.athenaApi.listKnowledgeSources());
  };

  useEffect(() => {
    void loadKnowledge();
    if (!window.athenaApi) return;
    return window.athenaApi.onOllamaPullProgress((ev) => {
      if (ev.error) {
        setPullProgress(`Error: ${ev.error}`);
      } else if (ev.done) {
        setPullProgress(`Pulled ${ev.model}`);
        void onRefreshOllama();
      } else if (ev.total && ev.completed) {
        const pct = Math.round((ev.completed / ev.total) * 100);
        setPullProgress(`${ev.status} (${pct}%)`);
      } else {
        setPullProgress(ev.status);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePull = async () => {
    const target = pullName.trim();
    if (!target || !window.athenaApi) return;
    const confirmed = window.confirm(
      `Download model "${target}" using local Ollama? This requires internet access.`
    );
    if (!confirmed) return;
    setPullProgress(`Starting pull for ${target}...`);
    await window.athenaApi.pullOllamaModel(target);
  };

  const handleDeleteModel = async (name: string) => {
    const confirmed = window.confirm(`Remove local Ollama model "${name}"?`);
    if (!confirmed) return;
    await window.athenaApi.deleteOllamaModel(name);
    await onRefreshOllama();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Ollama Runtime */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Cpu size={13} color={ollamaStatus?.isAvailable ? 'var(--success)' : 'var(--warning)'} />
            Local Ollama ({ollamaStatus?.isAvailable ? 'Online' : 'Offline'})
          </span>
          <button type="button" className="workbench-icon-btn" onClick={() => void onRefreshOllama()}>
            <RefreshCw size={12} />
          </button>
        </div>

        {ollamaStatus?.isAvailable ? (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Installed Models ({ollamaStatus.models.length})
            </div>
            {ollamaStatus.models.map((m) => (
              <div
                key={m.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  borderRadius: 3,
                  background: selectedModel === m.name ? 'var(--bg-active-item)' : 'transparent',
                  fontSize: 11,
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectModel(m.name)}
                  style={{ flex: 1, justifyContent: 'flex-start', overflow: 'hidden', fontFamily: 'var(--font-mono)' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                </button>
                <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>
                  {(m.size / (1024 * 1024 * 1024)).toFixed(1)}G
                </span>
                <button
                  type="button"
                  title="Remove model"
                  onClick={() => void handleDeleteModel(m.name)}
                  style={{ padding: 2, color: 'var(--text-muted)' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              <input
                type="text"
                value={pullName}
                onChange={(e) => setPullName(e.target.value)}
                placeholder="e.g. qwen2.5-coder:1.5b"
                style={{ flex: 1, fontSize: 11 }}
              />
              <button type="button" className="athena-btn-primary" onClick={() => void handlePull()} title="Pull via Ollama">
                <Download size={12} />
              </button>
            </div>
            {pullProgress && <p style={{ fontSize: 10, color: 'var(--accent-cyan)', marginTop: 4 }}>{pullProgress}</p>}
          </>
        ) : (
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Start Ollama from https://ollama.com/ on <code>127.0.0.1:11434</code> to manage local models.
          </p>
        )}
      </div>

      {/* RAM-Aware Recommendations */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
          Recommended Coding Models (System RAM: ~{totalRamGb} GB)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {RECOMMENDED_MODELS.map((rec) => {
            const fitsRam = totalRamGb >= rec.minRamGb;
            return (
              <div
                key={rec.id}
                style={{
                  padding: 6,
                  borderRadius: 4,
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 11,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{rec.id}</span>
                  <span style={{ color: fitsRam ? 'var(--success)' : 'var(--warning)', fontSize: 10 }}>
                    {rec.minRamGb}GB+ RAM
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{rec.notes}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* athena.data Knowledge Library */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <BookOpen size={13} color="var(--accent-cyan)" />
          athena.data Knowledge Index ({sources.length})
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="athena-btn-secondary"
            style={{ fontSize: 11 }}
            onClick={async () => {
              const res = await window.athenaApi.indexWorkspaceKnowledge();
              setNotice(res.ok ? `Indexed ${res.source?.chunkCount ?? 0} chunks.` : res.error ?? 'Failed');
              await loadKnowledge();
            }}
          >
            <FolderSearch size={12} />
            Index Workspace
          </button>
          <button
            type="button"
            className="athena-btn-secondary"
            style={{ fontSize: 11 }}
            onClick={async () => {
              const res = await window.athenaApi.addKnowledgeFiles();
              if (res.ok) setNotice(`Added ${res.added.length} file(s).`);
              await loadKnowledge();
            }}
          >
            <FilePlus size={12} />
            Add Docs
          </button>
        </div>

        {sources.map((s) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.label} ({s.chunkCount})
            </span>
            <button
              type="button"
              onClick={() => void window.athenaApi.removeKnowledgeSource(s.id).then(loadKnowledge)}
              style={{ padding: 2, color: 'var(--text-muted)' }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 4 }}>
          <input
            type="text"
            placeholder="Query local index..."
            value={kbQuery}
            onChange={(e) => setKbQuery(e.target.value)}
            style={{ flex: 1, fontSize: 11 }}
          />
          <button
            type="button"
            className="athena-btn-secondary"
            onClick={async () => setKbHits(await window.athenaApi.queryKnowledge(kbQuery, 4))}
          >
            Query
          </button>
        </div>
        {kbHits.map((h, i) => (
          <div key={`${h.filePath}-${i}`} style={{ fontSize: 10, color: 'var(--text-secondary)', padding: 4, background: 'var(--bg-app)', borderRadius: 3 }}>
            <strong>{h.filePath}</strong>: {h.excerpt.slice(0, 120)}...
          </div>
        ))}
        {notice && <p style={{ fontSize: 10, color: 'var(--accent-cyan)' }}>{notice}</p>}
      </div>
    </div>
  );
};
