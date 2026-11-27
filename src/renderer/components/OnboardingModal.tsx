import React from 'react';
import { X, CheckCircle, AlertTriangle, ExternalLink, RefreshCw, Download } from 'lucide-react';
import { OllamaStatus, NovaSettings } from '@common/types.js';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ollamaStatus: OllamaStatus | null;
  settings: NovaSettings;
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
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: '10px',
        width: '560px',
        maxWidth: '95vw',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Local AI Prerequisite Check</h2>
          <button onClick={onClose} style={{ padding: '4px', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Status Alert */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: isAvailable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${isAvailable ? 'var(--success)' : 'var(--warning)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}>
          {isAvailable ? <CheckCircle size={22} color="var(--success)" /> : <AlertTriangle size={22} color="var(--warning)" />}
          <div>
            <p style={{ fontWeight: 600, color: isAvailable ? 'var(--success)' : 'var(--warning)' }}>
              {isAvailable ? 'Ollama Detected and Connected' : 'Ollama Offline or Not Reachable'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Endpoint: <code>{settings.ollamaEndpoint}</code>
              {ollamaStatus?.errorMessage && ` — ${ollamaStatus.errorMessage}`}
            </p>
          </div>
        </div>

        {/* Guided Setup Steps */}
        {!isAvailable && (
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Manual Setup Instructions (100% Offline Capable After Setup)
            </h3>
            
            <div style={{
              background: 'var(--bg-app)',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div>
                <strong>Step 1: Install Ollama</strong>
                <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                  Download and install Ollama for Windows from <code>https://ollama.com/download</code>.
                </p>
              </div>

              <div>
                <strong>Step 2: Pull a lightweight coding model</strong>
                <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                  Open PowerShell and run one of the recommended models:
                </p>
                <code style={{
                  display: 'block',
                  background: 'var(--bg-surface-elevated)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  marginTop: '4px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-primary)',
                }}>
                  ollama pull qwen2.5-coder:1.5b
                </code>
              </div>

              <div>
                <strong>Step 3: Verify & Refresh</strong>
                <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                  Make sure Ollama is running in your taskbar, then click Refresh below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Models list if available */}
        {isAvailable && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              Installed Local Models ({ollamaStatus?.models.length || 0}):
            </h3>
            {ollamaStatus?.models.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--warning)' }}>
                No models installed yet. Run <code>ollama pull qwen2.5-coder:1.5b</code> in your terminal.
              </p>
            ) : (
              <ul style={{
                maxHeight: '140px',
                overflowY: 'auto',
                listStyle: 'none',
                background: 'var(--bg-app)',
                borderRadius: '6px',
                padding: '8px',
                border: '1px solid var(--border-subtle)',
              }}>
                {ollamaStatus?.models.map((m) => (
                  <li key={m.name} style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}>
                    <span style={{ fontWeight: 500 }}>{m.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onRefresh}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              padding: '6px 14px',
              fontSize: '12px',
            }}
          >
            <RefreshCw size={13} />
            Re-check Ollama
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'var(--accent-primary)',
              color: '#ffffff',
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
