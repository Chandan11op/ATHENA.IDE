import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Plus, Trash2, TerminalSquare } from 'lucide-react';
import { AppTheme } from '@common/types.js';

interface TerminalPanelProps {
  theme: AppTheme;
  workspacePath: string | null;
  newSessionSignal?: number;
}

interface TermTab {
  sessionId: string;
  label: string;
  cwd: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  theme,
  workspacePath,
  newSessionSignal = 0,
}) => {
  const [sessions, setSessions] = useState<TermTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermMapRef = useRef<Map<string, { term: XTerm; fit: FitAddon }>>(new Map());
  const pendingOutputRef = useRef<Map<string, string[]>>(new Map());

  const createSession = async () => {
    if (!window.athenaApi) return;
    setError(null);
    const res = await window.athenaApi.createTerminal(workspacePath ?? undefined);
    if (!res.ok || !res.sessionId) {
      setError(res.error ?? 'Failed to open shell session');
      return;
    }

    const sessionId = res.sessionId;
    setSessions((prev) => {
      const nextNum = prev.length + 1;
      return [...prev, { sessionId, label: `Shell ${nextNum}`, cwd: res.cwd ?? '' }];
    });
    setActiveId(sessionId);
  };

  useEffect(() => {
    if (sessions.length === 0) {
      void createSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (newSessionSignal > 0) {
      void createSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSessionSignal]);

  useEffect(() => {
    if (!window.athenaApi) return;
    const unsubData = window.athenaApi.onTerminalData(({ sessionId, chunk }) => {
      const entry = xtermMapRef.current.get(sessionId);
      if (entry) {
        entry.term.write(chunk);
      } else {
        const queue = pendingOutputRef.current.get(sessionId) ?? [];
        queue.push(chunk);
        pendingOutputRef.current.set(sessionId, queue);
      }
    });
    const unsubExit = window.athenaApi.onTerminalExit(({ sessionId, code }) => {
      const entry = xtermMapRef.current.get(sessionId);
      entry?.term.writeln(`\r\n[Process exited with code ${code ?? 'null'}]`);
    });
    return () => {
      unsubData();
      unsubExit();
    };
  }, []);

  useEffect(() => {
    if (!activeId || !containerRef.current) return;
    const host = containerRef.current;
    host.innerHTML = '';

    let entry = xtermMapRef.current.get(activeId);
    if (!entry) {
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 12,
        fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
        theme:
          theme === 'dark'
            ? { background: '#1e1e1e', foreground: '#cccccc', cursor: '#ffffff' }
            : { background: '#ffffff', foreground: '#333333', cursor: '#000000' },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.onData((data) => {
        void window.athenaApi?.writeTerminal(activeId, data);
      });
      entry = { term, fit };
      xtermMapRef.current.set(activeId, entry);

      const queued = pendingOutputRef.current.get(activeId);
      if (queued) {
        for (const chunk of queued) term.write(chunk);
        pendingOutputRef.current.delete(activeId);
      }
    }

    entry.term.options.theme =
      theme === 'dark'
        ? { background: '#1e1e1e', foreground: '#cccccc', cursor: '#ffffff' }
        : { background: '#ffffff', foreground: '#333333', cursor: '#000000' };

    entry.term.open(host);
    try {
      entry.fit.fit();
    } catch {
      // Ignore transient fit when panel collapses
    }

    const observer = new ResizeObserver(() => {
      try {
        entry?.fit.fit();
      } catch {
        // Ignore resize fit error
      }
    });
    observer.observe(host);

    return () => observer.disconnect();
  }, [activeId, theme]);

  const closeSession = async (sessionId: string) => {
    await window.athenaApi?.closeTerminal(sessionId);
    const entry = xtermMapRef.current.get(sessionId);
    entry?.term.dispose();
    xtermMapRef.current.delete(sessionId);
    setSessions((prev) => {
      const next = prev.filter((s) => s.sessionId !== sessionId);
      if (activeId === sessionId) {
        setActiveId(next[0]?.sessionId ?? null);
      }
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '4px 8px' }}>
        {error && (
          <div style={{ fontSize: 11, color: 'var(--danger)', paddingBottom: 4 }}>{error}</div>
        )}
        <div ref={containerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} />
      </div>

      <div
        style={{
          width: 150,
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          padding: 4,
          gap: 3,
          overflowY: 'auto',
        }}
      >
        <button
          type="button"
          className="athena-btn-secondary"
          onClick={createSession}
          style={{ width: '100%', justifyContent: 'flex-start', fontSize: 11, padding: '3px 6px' }}
        >
          <Plus size={12} />
          New Shell
        </button>

        {sessions.map((s) => (
          <div
            key={s.sessionId}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '3px 6px',
              borderRadius: 3,
              background: activeId === s.sessionId ? 'var(--bg-active-item)' : 'transparent',
              fontSize: 11,
              cursor: 'pointer',
            }}
            onClick={() => setActiveId(s.sessionId)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
              <TerminalSquare size={12} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
            </span>
            <button
              type="button"
              aria-label={`Kill ${s.label}`}
              onClick={(e) => {
                e.stopPropagation();
                void closeSession(s.sessionId);
              }}
              style={{ padding: 2, color: 'var(--text-muted)' }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
