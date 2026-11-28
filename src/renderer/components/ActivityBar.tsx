import React from 'react';
import {
  Files,
  Search,
  GitBranch,
  Play,
  Blocks,
  Bot,
  Settings,
  Cpu,
} from 'lucide-react';
import { ActivityView } from '../types/workbench.js';

interface ActivityBarProps {
  activeView: ActivityView;
  isSidebarVisible: boolean;
  isOllamaOnline: boolean;
  gitChangesCount?: number;
  onSelectView: (view: ActivityView) => void;
  onOpenOnboarding: () => void;
  onOpenSettings: () => void;
}

const ACTIVITY_ITEMS: Array<{
  id: ActivityView;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { id: 'explorer', label: 'Explorer (Ctrl+Shift+E)', icon: Files },
  { id: 'search', label: 'Search (Ctrl+Shift+F)', icon: Search },
  { id: 'git', label: 'Source Control (Ctrl+Shift+G)', icon: GitBranch },
  { id: 'run', label: 'Run and Debug (Ctrl+Shift+D)', icon: Play },
  { id: 'extensions', label: 'Extensions (Ctrl+Shift+X)', icon: Blocks },
  { id: 'ai', label: 'Athena AI Models & Knowledge', icon: Bot },
];

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  isSidebarVisible,
  isOllamaOnline,
  gitChangesCount = 0,
  onSelectView,
  onOpenOnboarding,
  onOpenSettings,
}) => {
  return (
    <nav
      aria-label="Activity Bar"
      style={{
        width: '48px',
        background: 'var(--bg-activitybar)',
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
                height: '46px',
                borderRadius: 0,
                color: isActive ? '#ffffff' : '#9d9d9d',
              }}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '4px',
                    bottom: '4px',
                    width: '2px',
                    background: '#ffffff',
                  }}
                />
              )}
              <Icon size={21} />
              {id === 'git' && gitChangesCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    right: '7px',
                    bottom: '7px',
                    minWidth: '15px',
                    height: '15px',
                    borderRadius: '999px',
                    background: 'var(--accent-primary)',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                  }}
                >
                  {gitChangesCount > 99 ? '99+' : gitChangesCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          alignItems: 'center',
          gap: '4px',
          paddingBottom: '4px',
        }}
      >
        <button
          type="button"
          title={isOllamaOnline ? 'Local Ollama Connected' : 'Local AI Offline — Setup'}
          aria-label="Local AI Status"
          onClick={onOpenOnboarding}
          style={{
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
          title="Settings (Ctrl+,)"
          aria-label="Settings"
          onClick={onOpenSettings}
          style={{
            width: '48px',
            height: '40px',
            borderRadius: 0,
            color: '#9d9d9d',
          }}
        >
          <Settings size={19} />
        </button>
      </div>
    </nav>
  );
};
