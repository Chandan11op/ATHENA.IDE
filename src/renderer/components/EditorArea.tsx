import React from 'react';
import { AppMode } from '@common/types.js';
import { Sparkles, Play, Eye, FileCode, CheckCircle2 } from 'lucide-react';

interface EditorAreaProps {
  mode: AppMode;
  currentWorkspace: string | null;
  onSelectWorkspace: () => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({ mode, currentWorkspace, onSelectWorkspace }) => {
  if (mode === 'beginner') {
    return (
      <main style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        background: 'var(--bg-app)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {/* Beginner Hero Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            What do you want to build today?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
            Describe your software idea in plain language in the assistant panel on the right. 
            NOVA will create the project files locally, let you preview the result, and help fix errors automatically.
          </p>
        </div>

        {/* Guided Steps Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 600 }}>
              <FileCode size={18} />
              <span>1. Choose Workspace</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Select a safe local folder where NOVA creates and saves all project code.
            </p>
            {currentWorkspace ? (
              <span style={{ color: 'var(--success)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Selected
              </span>
            ) : (
              <button
                onClick={onSelectWorkspace}
                style={{
                  marginTop: 'auto',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-strong)',
                  padding: '5px 10px',
                  fontSize: '12px',
                }}
              >
                Select Folder
              </button>
            )}
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontWeight: 600 }}>
              <Sparkles size={18} />
              <span>2. Describe Project</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              E.g., "Build a personal portfolio website with a dark theme and contact form."
            </p>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 600 }}>
              <Eye size={18} />
              <span>3. Preview & Run</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              View the running website live on your computer with full offline verification.
            </p>
          </div>
        </div>

        {/* Live Preview Area Placeholder */}
        <div style={{
          flex: 1,
          minHeight: '260px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '8px 14px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Project Preview
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Localhost Isolated
            </span>
          </div>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '12px',
          }}>
            No running web project to preview yet. Describe a project to begin!
          </div>
        </div>
      </main>
    );
  }

  // Developer Mode View
  return (
    <main style={{
      flex: 1,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-app)',
    }}>
      {/* Editor Tabs */}
      <div style={{
        height: '34px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
      }}>
        <div style={{
          background: 'var(--bg-app)',
          padding: '6px 12px',
          borderTop: '2px solid var(--accent-primary)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span>Welcome.txt</span>
        </div>
      </div>

      {/* Code Editor Placeholder */}
      <div style={{
        flex: 1,
        padding: '20px',
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        lineHeight: '1.7',
        color: 'var(--text-secondary)',
        overflowY: 'auto',
      }}>
        <p style={{ color: 'var(--accent-primary)' }}>// Welcome to NOVA IDE — Developer Mode</p>
        <p>// Offline-first, secure local AI software development environment.</p>
        <br />
        <p>1. Connect to local Ollama on 127.0.0.1:11434</p>
        <p>2. Select or import a project workspace</p>
        <p>3. Plan and execute supervised web projects (HTML/CSS/JS, Vite)</p>
      </div>
    </main>
  );
};
