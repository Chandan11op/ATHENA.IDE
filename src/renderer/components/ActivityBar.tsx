import React from 'react';
import {
  Files,
  Search,
  GitBranch,
  Bot,
  Blocks,
  Settings,
  Cpu,
} from 'lucide-react';
import { ActivityView } from '../types/workbench.js';

interface ActivityBarProps {
  activeView: ActivityView;
  isSidebarVisible: boolean;
  isOllamaOnline: boolean;
  onSelectView: (view: ActivityView) => void;
  onOpenOnboarding: () => void;
  onOpenSettings: () => void;
}

const ACTIVITY_ITEMS: Array<{ id: ActivityView; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'explorer', label: 'Explorer (Ctrl+Shift+E)', icon: Files },
  { id: 'search', label: 'Search (Placeholder)', icon: Search },
  { id: 'git', label: 'Source Control (Placeholder)', icon: GitBranch },
  { id: 'agents', label: 'Local Offline Agents (Placeholder)', icon: Bot },
  { id: 'extensions', label: 'Tools & Extensions (Placeholder)', icon: Blocks },
];

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  isSidebarVisible,
  isOllamaOnline,
  onSelectView,
  onOpenOnboarding,
  onOpenSettings,
}) => {
  return (
    <nav
      aria-label="Activity Bar"
      style={{
        width: '48px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {ACTIVITY_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = isSidebarVisible && activeView === id;
          return (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={isActive}
              onClick={() => onSelectView(id)}
              style={{
                position: 'relative',
                width: '48px',
                height: '44px',
                borderRadius: 0,
                color: isActive ? 'var(--text-bright)' : 'var(--text-muted)',
              }}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '6px',
                    bottom: '6px',
                    width: '2px',
                    background: 'var(--accent-primary)',
                  }}
                />
              )}
              <Icon size={20} />
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', gap: '4px', paddingBottom: '4px' }}>
        <button
          type="button"
          title={isOllamaOnline ? 'Local Ollama Connected' : 'Local AI Offline — Setup'}
          aria-label="Local AI Status"
          onClick={onOpenOnboarding}
          style={{
            position: 'relative',
            width: '48px',
            height: '40px',
            borderRadius: 0,
            color: isOllamaOnline ? 'var(--success)' : 'var(--warning)',
          }}
        >
          <Cpu size={19} />
        </button>

        <button
          type="button"
          title="Settings"
          aria-label="Settings"
          onClick={onOpenSettings}
          style={{
            width: '48px',
            height: '40px',
            borderRadius: 0,
            color: 'var(--text-muted)',
          }}
        >
          <Settings size={19} />
        </button>
      </div>
    </nav>
  );
};

