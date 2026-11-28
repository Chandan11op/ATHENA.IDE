import React from 'react';
import { X, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { OllamaStatus, AthenaSettings } from '@common/types.js';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ollamaStatus: OllamaStatus | null;
  settings: AthenaSettings;
  onRefresh: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  ollamaStatus,
  settings,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const isAvailable = ollamaStatus?.isAvailable ?? false;

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
        aria-label="Local AI Prerequisite Check"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          width: 540,
          maxWidth: '95vw',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Local AI Prerequisite Check</h2>
          <button type="button" onClick={onClose} style={{ padding: 4, color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            padding: '10px 14px',
            borderRadius: 4,
            background: isAvailable ? 'rgba(78, 201, 176, 0.1)' : 'rgba(204, 167, 0, 0.1)',
            border: `1px solid ${isAvailable ? 'var(--success)' : 'var(--warning)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
          }}
        >
          {isAvailable ? <CheckCircle size={20} color="var(--success)" /> : <AlertTriangle size={20} color="var(--warning)" />}
          <div>
            <p style={{ fontWeight: 600, color: isAvailable ? 'var(--success)' : 'var(--warning)' }}>
              {isAvailable ? 'Ollama Detected and Connected' : 'Ollama Offline or Not Reachable'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Endpoint: <code>{settings.ollamaEndpoint}</code>
              {ollamaStatus?.errorMessage && ` — ${ollamaStatus.errorMessage}`}
            </p>
          </div>
        </div>

        {!isAvailable ? (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <p style={{ fontWeight: 600 }}>Manual Setup (Offline-Capable After Setup)</p>
            <div style={{ background: 'var(--bg-app)', padding: 10, borderRadius: 4, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <strong>1. Install Ollama:</strong> Download from <code>https://ollama.com/</code>
              </div>
              <div>
                <strong>2. Pull a lightweight coding model:</strong>
                <code style={{ display: 'block', background: 'var(--bg-surface-elevated)', padding: '5px 8px', marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  ollama run qwen2.5-coder:1.5b
                </code>
              </div>
              <div>
                <strong>3. Click Re-check Ollama below.</strong>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Installed Local Models ({ollamaStatus?.models.length || 0}):
            </h3>
            {ollamaStatus?.models.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--warning)' }}>
                No models installed yet. Run <code>ollama pull qwen2.5-coder:1.5b</code>.
              </p>
            ) : (
              <ul style={{ maxHeight: 140, overflowY: 'auto', listStyle: 'none', background: 'var(--bg-app)', borderRadius: 4, padding: 6, border: '1px solid var(--border-subtle)' }}>
                {ollamaStatus?.models.map((m) => (
                  <li key={m.name} style={{ padding: '4px 6px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>{m.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="athena-btn-secondary" onClick={onRefresh}>
            <RefreshCw size={13} /> Re-check Ollama
          </button>
          <button type="button" className="athena-btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
