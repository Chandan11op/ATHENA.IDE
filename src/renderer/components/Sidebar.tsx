import React from 'react';
import { FolderPlus, FileText, ChevronRight, Folder } from 'lucide-react';

interface SidebarProps {
  currentWorkspace: string | null;
  onSelectWorkspace: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentWorkspace, onSelectWorkspace }) => {
  return (
    <aside style={{
      width: '240px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Explorer
        </span>
        <button
          onClick={onSelectWorkspace}
          title="Open Workspace Folder"
          style={{ padding: '4px', color: 'var(--text-secondary)' }}
        >
          <FolderPlus size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {currentWorkspace ? (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 6px',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}>
              <ChevronRight size={14} />
              <Folder size={14} color="var(--accent-primary)" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentWorkspace.split(/[\\/]/).pop()}
              </span>
            </div>
            <div style={{ paddingLeft: '18px', marginTop: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <div style={{ padding: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={13} />
                <span>(Project files will appear here)</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            padding: '16px',
            color: 'var(--text-muted)',
            gap: '12px',
          }}>
            <Folder size={32} strokeWidth={1.5} color="var(--text-muted)" />
            <p style={{ fontSize: '12px' }}>No workspace selected</p>
            <button
              onClick={onSelectWorkspace}
              style={{
                background: 'var(--accent-primary)',
                color: '#ffffff',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              Choose Workspace
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
