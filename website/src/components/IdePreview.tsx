import React, { useState } from 'react';
import { FileCode2, FolderOpen, Terminal, WifiOff } from 'lucide-react';
import './IdePreview.css';

type PreviewFileId = 'app' | 'styles' | 'ollama';

const PREVIEW_FILES: Record<
  PreviewFileId,
  { name: string; code: string }
> = {
  app: {
    name: 'src/App.tsx',
    code: `export function CounterApp() {
  const [count, setCount] = useState(0);

  return (
    <main className="panel">
      <h1>Local Workspace Preview</h1>
      <button onClick={() => setCount((c) => c + 1)}>
        Count: {count}
      </button>
    </main>
  );
}`,
  },
  styles: {
    name: 'src/styles.css',
    code: `.panel {
  background: #0f131b;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  padding: 1.5rem;
  color: #f1f5f9;
}`,
  },
  ollama: {
    name: 'athena.config.json',
    code: `{
  "ollamaEndpoint": "http://127.0.0.1:11434",
  "selectedModel": "qwen2.5-coder:1.5b",
  "autoCheckpoint": true,
  "maxRepairRetries": 3
}`,
  },
};

export const IdePreview: React.FC = () => {
  const [activeFile, setActiveFile] = useState<PreviewFileId>('app');
  const [mode, setMode] = useState<'beginner' | 'developer'>('beginner');

  const current = PREVIEW_FILES[activeFile];

  return (
    <div
      className="ide-preview-shell"
      role="region"
      aria-label="Interactive illustration of the ATHENA.IDE desktop interface"
    >
      <div className="ide-titlebar">
        <div className="ide-titlebar-left">
          <div className="ide-window-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="ide-brand-pill">ATHENA.IDE</span>
          <span className="ide-illustrative-tag">Illustrative MVP Preview</span>
        </div>

        <div className="ide-titlebar-right">
          <div className="ide-mode-switch" role="group" aria-label="IDE Mode">
            <button
              type="button"
              className={`ide-mode-btn ${mode === 'beginner' ? 'active' : ''}`}
              onClick={() => setMode('beginner')}
              aria-pressed={mode === 'beginner'}
            >
              Beginner
            </button>
            <button
              type="button"
              className={`ide-mode-btn ${mode === 'developer' ? 'active' : ''}`}
              onClick={() => setMode('developer')}
              aria-pressed={mode === 'developer'}
            >
              Developer
            </button>
          </div>
          <span className="ide-ollama-pill">
            <WifiOff size={12} aria-hidden="true" />
            Local Ollama · 127.0.0.1
          </span>
        </div>
      </div>

      <div className="ide-workbench">
        <aside className="ide-sidebar" aria-label="Workspace files">
          <div className="ide-pane-label">
            <FolderOpen size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Workspace
          </div>
          <div className="ide-file-list">
            {(Object.keys(PREVIEW_FILES) as PreviewFileId[]).map((fileId) => (
              <button
                key={fileId}
                type="button"
                className={`ide-file-btn ${activeFile === fileId ? 'active' : ''}`}
                onClick={() => setActiveFile(fileId)}
              >
                <FileCode2 size={13} aria-hidden="true" />
                <span>{PREVIEW_FILES[fileId].name}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="ide-editor-col">
          <div className="ide-tabs">
            <span className="ide-tab active">{current.name}</span>
          </div>
          <pre className="ide-code-area">
            <code>{current.code}</code>
          </pre>
          <div className="ide-bottom-panel">
            <span>
              <Terminal size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              {mode === 'beginner'
                ? 'Checkpoint ready · Local preview sandboxed to workspace'
                : 'vite dev · Localhost preview · 0 external API calls'}
            </span>
            <span>Mode: {mode === 'beginner' ? 'Beginner' : 'Developer'}</span>
          </div>
        </div>

        <aside className="ide-chat" aria-label="Local AI assistant panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div className="ide-pane-label">Local AI Assistant</div>
            <div className="ide-chat-msg user">
              Add a reset button to the counter component and keep the dark card styling.
            </div>
            <div className="ide-chat-msg assistant">
              {mode === 'beginner'
                ? 'I can update CounterApp in src/App.tsx and save a local checkpoint before applying changes.'
                : 'Ready to patch src/App.tsx using qwen2.5-coder:1.5b via http://127.0.0.1:11434.'}
            </div>
          </div>
          <div className="ide-chat-footer">
            Model: qwen2.5-coder:1.5b (Local) · Illustrative workflow
          </div>
        </aside>
      </div>
    </div>
  );
};
