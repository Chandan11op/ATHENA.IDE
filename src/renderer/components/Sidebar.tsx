import React from 'react';
import {
  FolderPlus,
  FileCode2,
  ChevronDown,
  Folder,
  Bot,
  Search,
  GitBranch,
  Blocks,
  Check,
} from 'lucide-react';
import { OllamaStatus } from '@common/types.js';
import {
  ActivityView,
  LocalAgentPreset,
  OFFLINE_AGENT_PLACEHOLDERS,
} from '../types/workbench.js';

interface SidebarProps {
  activeView: ActivityView;
  isVisible: boolean;
  currentWorkspace: string | null;
  selectedAgentId: string;
  ollamaStatus: OllamaStatus | null;
  onSelectWorkspace: () => void;
  onSelectAgent: (agentId: string) => void;
  onOpenSampleFile: (title: string, path: string, content: string) => void;
}

const VIEW_TITLES: Record<ActivityView, string> = {
  explorer: 'Explorer',
  search: 'Search',
  git: 'Source Control',
  agents: 'Local Offline Agents',
  extensions: 'Tools & MCP',
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  isVisible,
  currentWorkspace,
  selectedAgentId,
  ollamaStatus,
  onSelectWorkspace,
  onSelectAgent,
  onOpenSampleFile,
}) => {
  if (!isVisible) return null;

  const renderAgentCard = (agent: LocalAgentPreset) => {
    const isSelected = selectedAgentId === agent.id;
    return (
      <button
        key={agent.id}
        type="button"
        onClick={() => onSelectAgent(agent.id)}
        style={{
          width: '100%',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '8px 10px',
          borderRadius: '6px',
          textAlign: 'left',
          background: isSelected ? 'var(--bg-active-item)' : 'var(--bg-surface-elevated)',
          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
          gap: '4px',
        }}
      >
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bot size={13} color="var(--accent-cyan)" />
            {agent.name}
          </span>
          {isSelected && <Check size={13} color="var(--accent-cyan)" />}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
          {agent.tagline}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {agent.modelHint}
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '0 5px',
              borderRadius: '3px',
              background: 'var(--bg-app)',
              color: 'var(--warning)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Placeholder
          </span>
        </div>
      </button>
    );
  };

  return (
    <aside
      style={{
        width: '250px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* Side Bar Header */}
      <div
        style={{
          height: '35px',
          padding: '0 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
          }}
        >
          {VIEW_TITLES[activeView]}
        </span>
        {activeView === 'explorer' && (
          <button
            type="button"
            className="workbench-icon-btn"
            onClick={onSelectWorkspace}
            title="Open Workspace Folder"
            aria-label="Open Workspace Folder"
          >
            <FolderPlus size={14} />
          </button>
        )}
      </div>

      {/* Side Bar Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {activeView === 'explorer' && (
          currentWorkspace ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  color: 'var(--text-bright)',
                  fontWeight: 600,
                  fontSize: '12px',
                }}
              >
                <ChevronDown size={14} />
                <Folder size={14} color="var(--accent-cyan)" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentWorkspace.split(/[\\/]/).pop()}
                </span>
              </div>

              <div style={{ paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() =>
                    onOpenSampleFile(
                      'index.html',
                      `${currentWorkspace}\\index.html`,
                      '<!DOCTYPE html>\n<html>\n  <head><title>Workspace Preview</title></head>\n  <body>\n    <!-- Live workspace file tree arrives in Milestone 3 -->\n    <div id="root"></div>\n  </body>\n</html>'
                    )
                  }
                  style={{ justifyContent: 'flex-start', padding: '4px 8px', fontSize: '12px', color: 'var(--text-primary)' }}
                >
                  <FileCode2 size={13} color="var(--accent-cyan)" />
                  <span>index.html</span>
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>preview</span>
                </button>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 8px' }}>
                  Full filesystem tree loads in Milestone 3.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                padding: '16px',
                color: 'var(--text-muted)',
                gap: '10px',
              }}
            >
              <Folder size={30} strokeWidth={1.5} />
              <p style={{ fontSize: '12px' }}>No folder opened yet.</p>
              <button
                type="button"
                onClick={onSelectWorkspace}
                style={{
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Open Folder
              </button>
            </div>
          )
        )}

        {activeView === 'agents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 4px' }}>
              Select an offline coding agent preset for the Agent Panel (UI placeholder until Milestone 2/4 runtime wiring):
            </p>
            {OFFLINE_AGENT_PLACEHOLDERS.map(renderAgentCard)}

            {ollamaStatus?.isAvailable && ollamaStatus.models.length > 0 && (
              <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)', marginBottom: '4px' }}>
                  Detected Local Ollama Models ({ollamaStatus.models.length})
                </p>
                {ollamaStatus.models.map((m) => (
                  <div
                    key={m.name}
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      padding: '3px 6px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    • {m.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
            <input type="text" placeholder="Search workspace (Placeholder)" disabled />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={12} /> Workspace search activates with file indexing in Milestone 3.
            </p>
          </div>
        )}

        {activeView === 'git' && (
          <div style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 500 }}>
              <GitBranch size={14} color="var(--accent-cyan)" />
              <span>Source Control (Placeholder)</span>
            </div>
            <p style={{ fontSize: '11px' }}>
              Local Git checkpoints and diff review will connect here in Milestone 6.
            </p>
          </div>
        )}

        {activeView === 'extensions' && (
          <div style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 500 }}>
              <Blocks size={14} color="var(--accent-violet)" />
              <span>Offline Tools & MCP (Placeholder)</span>
            </div>
            <p style={{ fontSize: '11px' }}>
              Workspace file tools, terminal runner, and local verifier plugins will register here in Milestone 4.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
