import React from 'react';
import { AppMode } from '@common/types.js';
import {
  FileCode2,
  Eye,
  FolderOpen,
  Bot,
  X,
  ChevronRight,
  Terminal,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { BottomPanelTab, EditorTab } from '../types/workbench.js';
import { AthenaMark } from './AthenaMark.js';

interface EditorAreaProps {
  mode: AppMode;
  currentWorkspace: string | null;
  tabs: EditorTab[];
  activeTabId: string;
  isBottomPanelVisible: boolean;
  activeBottomTab: BottomPanelTab;
  activeAgentName: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSelectWorkspace: () => void;
  onSelectBottomTab: (tab: BottomPanelTab) => void;
  onCloseBottomPanel: () => void;
  onOpenAgentsSidebar: () => void;
}

const BOTTOM_TABS: Array<{ id: BottomPanelTab; label: string }> = [
  { id: 'problems', label: 'Problems' },
  { id: 'output', label: 'Output' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'agent-logs', label: 'Agent Logs' },
];

export const EditorArea: React.FC<EditorAreaProps> = ({
  mode,
  currentWorkspace,
  tabs,
  activeTabId,
  isBottomPanelVisible,
  activeBottomTab,
  activeAgentName,
  onSelectTab,
  onCloseTab,
  onSelectWorkspace,
  onSelectBottomTab,
  onCloseBottomPanel,
  onOpenAgentsSidebar,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const renderTabContent = () => {
    if (!activeTab) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)' }}>
          <AthenaMark size={42} />
          <p>No editor tab open — select a file or open Welcome.</p>
        </div>
      );
    }

    if (activeTab.kind === 'welcome') {
      return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <AthenaMark size={40} />
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-bright)' }}>
                Athena.IDE
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {mode === 'beginner'
                  ? 'Beginner Mode — Describe your app in plain language and build locally.'
                  : 'Developer Mode — VS Code Modern workbench powered by offline coding agents.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-bright)' }}>
                <FolderOpen size={15} color="var(--accent-cyan)" />
                <span>1. Workspace</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {currentWorkspace
                  ? `Active folder: ${currentWorkspace}`
                  : 'Choose a local folder where Athena.IDE can create and inspect files.'}
              </p>
              <button
                type="button"
                onClick={onSelectWorkspace}
                style={{
                  alignSelf: 'flex-start',
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '5px 10px',
                  fontSize: '11px',
                }}
              >
                {currentWorkspace ? 'Change Workspace' : 'Open Folder'}
              </button>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-bright)' }}>
                <Bot size={15} color="var(--accent-violet)" />
                <span>2. Offline Coding Agents</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Active preset: <strong>{activeAgentName}</strong> (Placeholder). Switch between Ollama Coder, Qwen2.5 Coder, DeepSeek Coder & more.
              </p>
              <button
                type="button"
                onClick={onOpenAgentsSidebar}
                style={{
                  alignSelf: 'flex-start',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-strong)',
                  padding: '5px 10px',
                  fontSize: '11px',
                }}
              >
                Browse Local Agents
              </button>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-bright)' }}>
                <Sparkles size={15} color="var(--success)" />
                <span>3. Antigravity Workflow</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Use the right-side Agent Panel in <strong>Planning</strong> or <strong>Fast</strong> mode. Execution, diffs, and preview connect in Milestones 2–5.
              </p>
              <span style={{ fontSize: '11px', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Local-Only Security Active
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab.kind === 'preview') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
          <div style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ fontWeight: 600 }}>Localhost Project Preview (Placeholder)</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>127.0.0.1 Isolated</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px', textAlign: 'center' }}>
              No dev server running yet. Managed local preview attaches here in Milestone 5.
            </div>
          </div>
        </div>
      );
    }

    const lines = (activeTab.content ?? '').split('\n');
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 0', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.6 }}>
        {lines.map((line, index) => (
          <div key={index} style={{ display: 'flex', padding: '0 16px' }}>
            <span style={{ width: '40px', flexShrink: 0, textAlign: 'right', paddingRight: '16px', color: 'var(--text-muted)', userSelect: 'none' }}>
              {index + 1}
            </span>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{line || ' '}</pre>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-editor)',
      }}
    >
      {/* VS Code Editor Tabs Bar */}
      <div
        style={{
          height: '35px',
          background: 'var(--bg-tab-inactive)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '0 10px 0 12px',
                fontSize: '12px',
                cursor: 'pointer',
                background: isActive ? 'var(--bg-tab-active)' : 'var(--bg-tab-inactive)',
                color: isActive ? 'var(--text-bright)' : 'var(--text-secondary)',
                borderRight: '1px solid var(--border-subtle)',
                borderTop: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.kind === 'preview' ? (
                <Eye size={13} color="var(--success)" />
              ) : tab.kind === 'welcome' ? (
                <AthenaMark size={13} />
              ) : (
                <FileCode2 size={13} color="var(--accent-cyan)" />
              )}
              <span>{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  style={{ padding: '2px', color: 'var(--text-muted)' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* VS Code Breadcrumbs */}
      {activeTab && (
        <div
          style={{
            height: '22px',
            padding: '0 14px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        >
          {activeTab.path.split(' / ').map((segment, idx, arr) => (
            <React.Fragment key={`${segment}-${idx}`}>
              <span>{segment}</span>
              {idx < arr.length - 1 && <ChevronRight size={11} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Main Editor Canvas */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTabContent()}
      </div>

      {/* Collapsible VS Code Bottom Panel */}
      {isBottomPanelVisible && (
        <section
          aria-label="Bottom Panel"
          style={{
            height: '180px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-strong)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: '32px',
              padding: '0 12px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {BOTTOM_TABS.map((tab) => {
                const isActive = activeBottomTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSelectBottomTab(tab.id)}
                    style={{
                      height: '32px',
                      borderRadius: 0,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: isActive ? 'var(--text-bright)' : 'var(--text-muted)',
                      borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="workbench-icon-btn"
              onClick={onCloseBottomPanel}
              title="Close Panel"
              aria-label="Close Panel"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {activeBottomTab === 'terminal' && (
              <div>
                <p style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Terminal size={12} /> Managed Terminal (Placeholder — Milestone 5)
                </p>
                <p style={{ marginTop: '6px', color: 'var(--text-muted)' }}>
                  {currentWorkspace ? `${currentWorkspace}>` : 'C:\\Athena.IDE>'} _
                </p>
              </div>
            )}
            {activeBottomTab === 'problems' && (
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={13} color="var(--success)" /> No problems detected in workspace.
              </p>
            )}
            {activeBottomTab === 'output' && (
              <p>[Athena.IDE] Shell initialized in Local-Only mode. IPC & path sandboxing active.</p>
            )}
            {activeBottomTab === 'agent-logs' && (
              <p>[Agent Placeholder] Active preset: {activeAgentName}. Runtime inference hooks connect in Milestone 2/4.</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
};
