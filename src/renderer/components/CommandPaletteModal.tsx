import React, { useEffect, useState } from 'react';
import { Command, FolderOpen, Moon, Sun, Terminal, PanelLeft, Bot, Settings, Cpu } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  category: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  commands,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();
  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(trimmed) ||
      cmd.category.toLowerCase().includes(trimmed)
  );

  const pickIcon = (category: string) => {
    switch (category) {
      case 'Workspace':
        return <FolderOpen size={14} />;
      case 'Theme':
        return <Sun size={14} />;
      case 'Panel':
        return <Terminal size={14} />;
      case 'View':
        return <PanelLeft size={14} />;
      case 'Agent':
        return <Bot size={14} />;
      case 'Runtime':
        return <Cpu size={14} />;
      case 'Preferences':
        return <Settings size={14} />;
      default:
        return <Moon size={14} />;
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '48px',
        zIndex: 1200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command Palette"
        style={{
          width: '560px',
          maxWidth: '92vw',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: '8px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Command size={14} color="var(--accent-primary)" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or switch local agent..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered[0]) {
                filtered[0].action();
                onClose();
              }
            }}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              padding: '4px',
              outline: 'none',
              fontSize: '13px',
            }}
          />
        </div>

        <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '4px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No matching commands
            </div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{pickIcon(cmd.category)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{cmd.category}:</span>
                  <span>{cmd.label}</span>
                </span>
                {cmd.hint && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {cmd.hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

