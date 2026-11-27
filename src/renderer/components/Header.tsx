import React from 'react';
import { 
  Laptop, 
  Settings, 
  WifiOff, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Code2,
  FolderOpen
} from 'lucide-react';
import { AppMode, OllamaStatus, NovaSettings } from '@common/types.js';

interface HeaderProps {
  settings: NovaSettings;
  ollamaStatus: OllamaStatus | null;
  currentWorkspace: string | null;
  onOpenSettings: () => void;
  onSelectWorkspace: () => void;
  onToggleMode: (mode: AppMode) => void;
  onOpenOnboarding: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  ollamaStatus,
  currentWorkspace,
  onOpenSettings,
  onSelectWorkspace,
  onToggleMode,
  onOpenOnboarding,
}) => {
  const isOnline = ollamaStatus?.isAvailable ?? false;
  const projectName = currentWorkspace 
    ? currentWorkspace.split(/[\\/]/).pop() 
    : 'No Project Selected';

  return (
    <header style={{
      height: '42px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      WebkitAppRegion: 'drag',
    } as React.CSSProperties}>
      {/* Left: Brand and Workspace */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, letterSpacing: '0.5px' }}>
          <Sparkles size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: '14px', background: 'linear-gradient(90deg, #60a5fa, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Athena.IDE
          </span>
          <span style={{ fontSize: '10px', background: 'var(--bg-surface-elevated)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
            MVP
          </span>
        </div>

        <div style={{ height: '16px', width: '1px', background: 'var(--border-subtle)' }} />

        {/* Workspace selector button */}
        <button
          onClick={onSelectWorkspace}
          title={currentWorkspace || 'Click to choose workspace folder'}
          style={{
            background: 'var(--bg-surface-elevated)',
            padding: '4px 8px',
            fontSize: '12px',
            color: currentWorkspace ? 'var(--text-primary)' : 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <FolderOpen size={14} />
          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectName}
          </span>
        </button>
      </div>

      {/* Center: Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-app)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => onToggleMode('beginner')}
          style={{
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 500,
            background: settings.mode === 'beginner' ? 'var(--accent-primary)' : 'transparent',
            color: settings.mode === 'beginner' ? '#ffffff' : 'var(--text-secondary)',
            borderRadius: '4px',
          }}
        >
          <Laptop size={12} />
          Beginner Mode
        </button>
        <button
          onClick={() => onToggleMode('developer')}
          style={{
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 500,
            background: settings.mode === 'developer' ? 'var(--accent-primary)' : 'transparent',
            color: settings.mode === 'developer' ? '#ffffff' : 'var(--text-secondary)',
            borderRadius: '4px',
          }}
        >
          <Code2 size={12} />
          Developer Mode
        </button>
      </div>

      {/* Right: Runtime Status, Offline Badge & Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Ollama Status Badge */}
        <button
          onClick={onOpenOnboarding}
          title={isOnline ? `Ollama Ready (${ollamaStatus?.models.length || 0} models)` : 'Ollama Offline - Click for setup'}
          style={{
            background: 'var(--bg-surface-elevated)',
            border: `1px solid ${isOnline ? 'var(--success)' : 'var(--warning)'}`,
            padding: '3px 8px',
            fontSize: '11px',
            color: isOnline ? 'var(--success)' : 'var(--warning)',
          }}
        >
          {isOnline ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
          <span>{isOnline ? 'Local AI Ready' : 'Local AI Offline'}</span>
        </button>

        {/* Local-First Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--bg-surface-elevated)',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-subtle)',
        }}>
          <WifiOff size={11} />
          <span>Local Only</span>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          style={{
            padding: '6px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
};
