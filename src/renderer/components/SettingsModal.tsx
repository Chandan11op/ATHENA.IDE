import React, { useState } from 'react';
import { X, Moon, Sun, Laptop, Code2, Save } from 'lucide-react';
import { NovaSettings, OllamaStatus } from '@common/types.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NovaSettings;
  ollamaStatus: OllamaStatus | null;
  onSaveSetting: <K extends keyof NovaSettings>(key: K, value: NovaSettings[K]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  ollamaStatus,
  onSaveSetting,
}) => {
  if (!isOpen) return null;

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
        width: '500px',
        maxWidth: '95vw',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>NOVA IDE Settings</h2>
          <button onClick={onClose} style={{ padding: '4px', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Settings Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Theme */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Color Theme
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onSaveSetting('theme', 'dark')}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: settings.theme === 'dark' ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                  color: settings.theme === 'dark' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <Moon size={14} />
                Dark
              </button>
              <button
                onClick={() => onSaveSetting('theme', 'light')}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: settings.theme === 'light' ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                  color: settings.theme === 'light' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <Sun size={14} />
                Light
              </button>
            </div>
          </div>

          {/* Mode */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Default Experience Mode
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onSaveSetting('mode', 'beginner')}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: settings.mode === 'beginner' ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                  color: settings.mode === 'beginner' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <Laptop size={14} />
                Beginner
              </button>
              <button
                onClick={() => onSaveSetting('mode', 'developer')}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: settings.mode === 'developer' ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                  color: settings.mode === 'developer' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <Code2 size={14} />
                Developer
              </button>
            </div>
          </div>

          {/* Ollama Endpoint */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Local Ollama Endpoint (Localhost Only)
            </label>
            <input
              type="text"
              value={settings.ollamaEndpoint}
              onChange={(e) => onSaveSetting('ollamaEndpoint', e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Model Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Active Coding Model
            </label>
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
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                No local models detected. Connect Ollama to populate model list.
              </p>
            )}
          </div>

          {/* Max Repair Retries */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Maximum Auto-Repair Retries (Default: 3)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={settings.maxRepairRetries}
              onChange={(e) => onSaveSetting('maxRepairRetries', parseInt(e.target.value) || 3)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
