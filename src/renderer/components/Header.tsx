import React from 'react';
import {
  Search,
  PanelLeft,
  PanelBottom,
  PanelRight,
  Settings,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  Laptop,
  Code2,
} from 'lucide-react';
import { AppMode, OllamaStatus, AthenaSettings } from '@common/types.js';
import { AthenaMark } from './AthenaMark.js';

interface HeaderProps {
  settings: AthenaSettings;
  ollamaStatus: OllamaStatus | null;
  currentWorkspace: string | null;
  isSidebarVisible: boolean;
  isBottomPanelVisible: boolean;
  isAgentPanelVisible: boolean;
  onToggleSidebar: () => void;
  onToggleBottomPanel: () => void;
  onToggleAgentPanel: () => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  onSelectWorkspace: () => void;
  onToggleMode: (mode: AppMode) => void;
  onOpenOnboarding: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  ollamaStatus,
  currentWorkspace,
  isSidebarVisible,
  isBottomPanelVisible,
  isAgentPanelVisible,
  onToggleSidebar,
  onToggleBottomPanel,
  onToggleAgentPanel,
  onOpenCommandPalette,
  onOpenSettings,
  onSelectWorkspace,
  onToggleMode,
  onOpenOnboarding,
}) => {
  const isOnline = ollamaStatus?.isAvailable ?? false;
  const projectName = currentWorkspace
    ? currentWorkspace.split(/[\\/]/).pop()
    : 'No Workspace';

  return (
    <header
      style={{
        height: '36px',
        background: 'var(--bg-titlebar)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        gap: '10px',
        flexShrink: 0,
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Left: Brand, Workspace, Mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600 }}>
          <AthenaMark size={18} />
          <span style={{ fontSize: '12px', color: 'var(--text-bright)', letterSpacing: '0.2px' }}>
            Athena<span style={{ color: 'var(--accent-cyan)' }}>.IDE</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onSelectWorkspace}
          title={currentWorkspace || 'Open workspace folder'}
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            color: currentWorkspace ? 'var(--text-primary)' : 'var(--text-muted)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <FolderOpen size={12} />
          <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectName}
          </span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-app)',
            padding: '2px',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => onToggleMode('beginner')}
            style={{
              padding: '2px 7px',
              fontSize: '11px',
              background: settings.mode === 'beginner' ? 'var(--accent-primary)' : 'transparent',
              color: settings.mode === 'beginner' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <Laptop size={11} />
            Beginner
          </button>
          <button
            type="button"
            onClick={() => onToggleMode('developer')}
            style={{
              padding: '2px 7px',
              fontSize: '11px',
              background: settings.mode === 'developer' ? 'var(--accent-primary)' : 'transparent',
              color: settings.mode === 'developer' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <Code2 size={11} />
            Developer
          </button>
        </div>
      </div>

      {/* Center: VS Code Command Center Pill */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        title="Command Palette (Ctrl+Shift+P)"
        style={{
          flex: '0 1 380px',
          height: '24px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: '6px',
          padding: '0 10px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          justifyContent: 'center',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <Search size={12} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentWorkspace ? projectName : 'Athena.IDE'} — Search commands (Ctrl+Shift+P)
        </span>
      </button>

      {/* Right: Layout Toggles, Ollama Badge, Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          type="button"
          className={`workbench-icon-btn ${isSidebarVisible ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="Toggle Primary Side Bar (Ctrl+B)"
          aria-label="Toggle Primary Side Bar"
        >
          <PanelLeft size={15} />
        </button>
        <button
          type="button"
          className={`workbench-icon-btn ${isBottomPanelVisible ? 'active' : ''}`}
          onClick={onToggleBottomPanel}
          title="Toggle Bottom Panel (Ctrl+J)"
          aria-label="Toggle Bottom Panel"
        >
          <PanelBottom size={15} />
        </button>
        <button
          type="button"
          className={`workbench-icon-btn ${isAgentPanelVisible ? 'active' : ''}`}
          onClick={onToggleAgentPanel}
          title="Toggle Athena Agent Side Bar (Ctrl+L)"
          aria-label="Toggle Agent Side Bar"
        >
          <PanelRight size={15} />
        </button>

        <div style={{ height: '14px', width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />

        <button
          type="button"
          onClick={onOpenOnboarding}
          title={isOnline ? `Ollama Ready (${ollamaStatus?.models.length || 0} models)` : 'Ollama Offline — Setup'}
          style={{
            background: 'var(--bg-surface-elevated)',
            border: `1px solid ${isOnline ? 'var(--success)' : 'var(--warning)'}`,
            padding: '2px 8px',
            fontSize: '11px',
            color: isOnline ? 'var(--success)' : 'var(--warning)',
          }}
        >
          {isOnline ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
          <span>{isOnline ? 'Local AI Ready' : 'AI Offline'}</span>
        </button>

        <button
          type="button"
          className="workbench-icon-btn"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
