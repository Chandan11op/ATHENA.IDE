import React, { useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor, OnMount } from '@monaco-editor/react';
import {
  AlertCircle,
  ChevronRight,
  Eye,
  FileCode2,
  FolderOpen,
  RefreshCw,
  Save,
  Square,
  WrapText,
  X,
} from 'lucide-react';
import {
  AppMode,
  AppTheme,
  AthenaSettings,
  OllamaStatus,
  RunnerStatus,
} from '@common/types.js';
import { monaco } from '../monacoSetup.js';
import { BottomPanelTab, EditorTab } from '../types/workbench.js';
import { AthenaMark } from './AthenaMark.js';
import { TerminalPanel } from './TerminalPanel.js';

export interface ProblemMarker {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

interface EditorAreaProps {
  mode: AppMode;
  settings: AthenaSettings;
  ollamaStatus: OllamaStatus | null;
  inlineCompletionEnabled: boolean;
  currentWorkspace: string | null;
  tabs: EditorTab[];
  activeTabId: string;
  isBottomPanelVisible: boolean;
  activeBottomTab: BottomPanelTab;
  bottomPanelHeight: number;
  runnerStatus: RunnerStatus;
  outputLogs: string[];
  newTerminalSignal: number;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onUpdateTabContent: (tabId: string, content: string) => void;
  onSaveTab: (tabId: string) => void;
  onCursorChange: (line: number, column: number, selectionText: string) => void;
  onMarkersChange: (markers: ProblemMarker[]) => void;
  onSelectWorkspace: () => void;
  onOpenRecentWorkspace: (wsPath: string) => void;
  onSelectBottomTab: (tab: BottomPanelTab) => void;
  onCloseBottomPanel: () => void;
  onResizeBottomPanel: (nextHeight: number) => void;
  onOpenAiSidebar: () => void;
  onToggleWordWrap: () => void;
  onStopRunner: () => void;
}

const BOTTOM_TABS: Array<{ id: BottomPanelTab; label: string }> = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'problems', label: 'Problems' },
  { id: 'output', label: 'Output' },
  { id: 'debug', label: 'Debug Console' },
];

export const EditorArea: React.FC<EditorAreaProps> = ({
  mode,
  settings,
  ollamaStatus,
  inlineCompletionEnabled,
  currentWorkspace,
  tabs,
  activeTabId,
  isBottomPanelVisible,
  activeBottomTab,
  bottomPanelHeight,
  runnerStatus,
  outputLogs,
  newTerminalSignal,
  onSelectTab,
  onCloseTab,
  onUpdateTabContent,
  onSaveTab,
  onCursorChange,
  onMarkersChange,
  onSelectWorkspace,
  onOpenRecentWorkspace,
  onSelectBottomTab,
  onCloseBottomPanel,
  onResizeBottomPanel,
  onOpenAiSidebar,
  onToggleWordWrap,
  onStopRunner,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const inlineProviderRef = useRef<monaco.IDisposable | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [problems, setProblems] = useState<ProblemMarker[]>([]);
  const resizingRef = useRef(false);

  const settingsRef = useRef({ settings, ollamaStatus, inlineCompletionEnabled });
  settingsRef.current = { settings, ollamaStatus, inlineCompletionEnabled };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const next = Math.max(120, Math.min(480, window.innerHeight - 24 - e.clientY));
      onResizeBottomPanel(next);
    };
    const onMouseUp = () => {
      resizingRef.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onResizeBottomPanel]);

  useEffect(() => {
    return () => {
      inlineProviderRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeTab || activeTab.kind !== 'code') return;
    if (activeTab.cursorLine) {
      editor.revealLineInCenter(activeTab.cursorLine);
      editor.setPosition({
        lineNumber: activeTab.cursorLine,
        column: activeTab.cursorColumn ?? 1,
      });
    }
  }, [activeTab?.id, activeTab?.cursorLine, activeTab?.cursorColumn]);

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      const sel = editor.getSelection();
      const selText = sel ? editor.getModel()?.getValueInRange(sel) ?? '' : '';
      onCursorChange(e.position.lineNumber, e.position.column, selText);
    });

    editor.onDidChangeCursorSelection(() => {
      const pos = editor.getPosition();
      const sel = editor.getSelection();
      const selText = sel ? editor.getModel()?.getValueInRange(sel) ?? '' : '';
      if (pos) onCursorChange(pos.lineNumber, pos.column, selText);
    });

    monacoInstance.editor.onDidChangeMarkers(() => {
      const allMarkers = monacoInstance.editor.getModelMarkers({});
      const mapped: ProblemMarker[] = allMarkers
        .filter((m: monaco.editor.IMarker) => m.severity >= monacoInstance.MarkerSeverity.Warning)
        .map((m: monaco.editor.IMarker) => ({
          file: m.resource.path,
          line: m.startLineNumber,
          column: m.startColumn,
          message: m.message,
          severity: m.severity === monacoInstance.MarkerSeverity.Error ? 'error' : 'warning',
        }));
      setProblems(mapped);
      onMarkersChange(mapped);
    });

    if (!inlineProviderRef.current) {
      inlineProviderRef.current = monacoInstance.languages.registerInlineCompletionsProvider(
        ['typescript', 'javascript', 'html', 'css', 'python'],
        {
          provideInlineCompletions: async (
            model: monaco.editor.ITextModel,
            position: monaco.Position,
            _ctx: monaco.languages.InlineCompletionContext,
            token: monaco.CancellationToken
          ) => {
            const { settings: curSettings, ollamaStatus: curOllama, inlineCompletionEnabled: enabled } =
              settingsRef.current;
            if (!enabled || !curOllama?.isAvailable || !curSettings.selectedModel || !window.athenaApi) {
              return { items: [] };
            }
            const prefix = model.getValueInRange({
              startLineNumber: Math.max(1, position.lineNumber - 25),
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });
            if (prefix.trim().length < 6) return { items: [] };
            const suffix = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: Math.min(model.getLineCount(), position.lineNumber + 12),
              endColumn: model.getLineMaxColumn(
                Math.min(model.getLineCount(), position.lineNumber + 12)
              ),
            });
            const res = await window.athenaApi.generateOllamaCompletion(
              curSettings.selectedModel,
              prefix,
              suffix,
              curSettings.ollamaEndpoint
            );
            if (token.isCancellationRequested || !res.ok || !res.response.trim()) {
              return { items: [] };
            }
            return { items: [{ insertText: res.response }] };
          },
          freeInlineCompletions: () => {},
        }
      );
    }
  };

  const renderTabContent = () => {
    if (!activeTab) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: 'var(--text-muted)',
          }}
        >
          <AthenaMark size={42} />
          <p>No editor tab open — select a file from the Explorer.</p>
        </div>
      );
    }

    if (activeTab.kind === 'welcome') {
      return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AthenaMark size={40} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-bright)' }}>
                Athena.IDE
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {mode === 'beginner'
                  ? 'Beginner Mode — Offline-first local AI coding workbench.'
                  : 'Developer Mode — VS Code-inspired workspace powered by local Ollama.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--text-bright)' }}>
                <FolderOpen size={15} color="var(--accent-cyan)" />
                <span>Start Workspace</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {currentWorkspace ? currentWorkspace : 'Open a local folder to browse, edit, run, and commit code.'}
              </p>
              <button type="button" className="athena-btn-primary" style={{ alignSelf: 'flex-start' }} onClick={onSelectWorkspace}>
                {currentWorkspace ? 'Switch Workspace' : 'Open Folder'}
              </button>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>Local Ollama Engine</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {ollamaStatus?.isAvailable
                  ? `Connected (${ollamaStatus.models.length} local model(s) installed)`
                  : 'Ollama not detected at 127.0.0.1:11434.'}
              </p>
              <button type="button" className="athena-btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={onOpenAiSidebar}>
                Manage Local Models
              </button>
            </div>
          </div>

          {settings.recentWorkspaces && settings.recentWorkspaces.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-bright)' }}>
                Recent Workspaces
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {settings.recentWorkspaces.map((ws) => (
                  <button
                    key={ws}
                    type="button"
                    onClick={() => onOpenRecentWorkspace(ws)}
                    style={{
                      justifyContent: 'flex-start',
                      padding: '4px 8px',
                      fontSize: 12,
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    {ws}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab.kind === 'preview') {
      const targetUrl = runnerStatus.previewUrl || activeTab.path;
      const isLiveUrl = /^https?:\/\/(?:127\.0\.0\.1|localhost):/i.test(targetUrl);

      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '6px 10px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {isLiveUrl ? targetUrl : 'No active local server'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {isLiveUrl && (
                <>
                  <button type="button" className="athena-btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setPreviewNonce((n) => n + 1)}>
                    <RefreshCw size={12} />
                    Refresh
                  </button>
                  <button type="button" className="athena-btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={onStopRunner}>
                    <Square size={12} color="var(--danger)" />
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>

          {isLiveUrl ? (
            <iframe
              key={`${targetUrl}-${previewNonce}`}
              src={targetUrl}
              title="Local Project Preview"
              sandbox="allow-scripts allow-forms allow-same-origin"
              style={{ flex: 1, width: '100%', border: 0, background: '#ffffff' }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Start a static preview or dev script from the Run and Debug panel to view it here.
            </div>
          )}
        </div>
      );
    }

    if (activeTab.kind === 'diff') {
      return (
        <div style={{ flex: 1, minHeight: 0 }}>
          <DiffEditor
            height="100%"
            theme={settings.theme === 'dark' ? 'vs-dark' : 'vs'}
            original={activeTab.diffOriginal ?? ''}
            modified={activeTab.diffModified ?? ''}
            language={activeTab.language || 'plaintext'}
            options={{
              readOnly: true,
              fontSize: settings.editorFontSize,
              fontFamily: settings.editorFontFamily,
              renderSideBySide: true,
            }}
          />
        </div>
      );
    }

    return (
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          theme={settings.theme === 'dark' ? 'vs-dark' : 'vs'}
          path={activeTab.path}
          language={activeTab.language || 'plaintext'}
          value={activeTab.content ?? ''}
          onChange={(val) => onUpdateTabContent(activeTab.id, val ?? '')}
          onMount={handleEditorMount}
          options={{
            fontSize: settings.editorFontSize,
            fontFamily: settings.editorFontFamily,
            wordWrap: settings.editorWordWrap ? 'on' : 'off',
            minimap: { enabled: true },
            automaticLayout: true,
            folding: true,
            lineNumbers: 'on',
            tabSize: 2,
          }}
        />
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
      {/* Tabs Bar */}
      <div
        style={{
          height: 35,
          background: 'var(--bg-tab-inactive)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', overflowX: 'auto' }}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab?.id;
            const isDirty = tab.kind === 'code' && tab.content !== tab.savedContent;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '0 10px 0 12px',
                  fontSize: 12,
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
                {isDirty && (
                  <span title="Unsaved changes" style={{ color: 'var(--warning)', fontSize: 14, lineHeight: 1 }}>
                    ●
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDirty && !window.confirm(`Close "${tab.title}" without saving changes?`)) {
                      return;
                    }
                    onCloseTab(tab.id);
                  }}
                  style={{ padding: 2, color: 'var(--text-muted)' }}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {activeTab?.kind === 'code' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 8 }}>
            <button
              type="button"
              className="workbench-icon-btn"
              title="Toggle Word Wrap"
              onClick={onToggleWordWrap}
            >
              <WrapText size={14} />
            </button>
            <button
              type="button"
              className="workbench-icon-btn"
              title="Save File (Ctrl+S)"
              onClick={() => onSaveTab(activeTab.id)}
            >
              <Save size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      {activeTab && (
        <div
          style={{
            height: 22,
            padding: '0 14px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--text-muted)',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {activeTab.path.split(/[\\/]/).filter(Boolean).map((segment, idx, arr) => (
            <React.Fragment key={`${segment}-${idx}`}>
              <span>{segment}</span>
              {idx < arr.length - 1 && <ChevronRight size={11} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Editor Canvas */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTabContent()}
      </div>

      {/* Resizable Integrated Bottom Panel */}
      {isBottomPanelVisible && (
        <section
          aria-label="Bottom Panel"
          style={{
            height: `${bottomPanelHeight}px`,
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-strong)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            onMouseDown={() => {
              resizingRef.current = true;
            }}
            title="Drag to resize panel"
            style={{ height: 4, cursor: 'ns-resize', background: 'transparent' }}
          />
          <div
            style={{
              height: 30,
              padding: '0 12px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {BOTTOM_TABS.map((tab) => {
                const isActive = activeBottomTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSelectBottomTab(tab.id)}
                    style={{
                      height: 30,
                      borderRadius: 0,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: isActive ? 'var(--text-bright)' : 'var(--text-muted)',
                      borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                    {tab.id === 'problems' && problems.length > 0 ? ` (${problems.length})` : ''}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="workbench-icon-btn"
              onClick={onCloseBottomPanel}
              title="Close Panel (Ctrl+J)"
              aria-label="Close Panel"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {activeBottomTab === 'terminal' && (
              <TerminalPanel
                theme={settings.theme as AppTheme}
                workspacePath={currentWorkspace}
                newSessionSignal={newTerminalSignal}
              />
            )}

            {activeBottomTab === 'problems' && (
              <div style={{ height: '100%', overflowY: 'auto', padding: '8px 12px', fontSize: 12 }}>
                {problems.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No problems detected in open files.</p>
                ) : (
                  problems.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                      <AlertCircle size={13} color={p.severity === 'error' ? 'var(--danger)' : 'var(--warning)'} />
                      <span>{p.message}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                        Ln {p.line}, Col {p.column}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeBottomTab === 'output' && (
              <pre
                style={{
                  height: '100%',
                  overflowY: 'auto',
                  padding: '8px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {outputLogs.length > 0
                  ? outputLogs.join('')
                  : '[Athena.IDE] Output stream ready. Local-only security active.'}
              </pre>
            )}

            {activeBottomTab === 'debug' && (
              <div style={{ height: '100%', overflowY: 'auto', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {runnerStatus.running
                  ? `Active Process: ${runnerStatus.command} ${runnerStatus.previewUrl ? `→ ${runnerStatus.previewUrl}` : ''}`
                  : 'No active project runner session.'}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
};
