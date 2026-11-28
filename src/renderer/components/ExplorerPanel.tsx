import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  FileCode2,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { FileTreeNode } from '@common/types.js';

interface ExplorerPanelProps {
  currentWorkspace: string | null;
  tree: FileTreeNode[];
  activeFilePath?: string;
  onSelectWorkspace: () => void;
  onRefreshTree: () => void;
  onOpenFile: (filePath: string) => void;
  onCreateFile: (parentDir: string, name: string) => Promise<void>;
  onCreateFolder: (parentDir: string, name: string) => Promise<void>;
  onRenamePath: (oldPath: string, newName: string) => Promise<void>;
  onDeletePath: (targetPath: string, name: string) => Promise<void>;
}

export const ExplorerPanel: React.FC<ExplorerPanelProps> = ({
  currentWorkspace,
  tree,
  activeFilePath,
  onSelectWorkspace,
  onRefreshTree,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onRenamePath,
  onDeletePath,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [creatingKind, setCreatingKind] = useState<'file' | 'folder' | null>(null);
  const [creatingParent, setCreatingParent] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  if (!currentWorkspace) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          padding: 16,
          color: 'var(--text-muted)',
          gap: 10,
        }}
      >
        <Folder size={30} strokeWidth={1.5} />
        <p style={{ fontSize: 12 }}>No folder opened yet.</p>
        <button type="button" className="athena-btn-primary" onClick={onSelectWorkspace}>
          Open Folder
        </button>
      </div>
    );
  }

  const toggleDir = (dirPath: string) => {
    setExpanded((prev) => ({ ...prev, [dirPath]: !prev[dirPath] }));
  };

  const startCreate = (kind: 'file' | 'folder', parentDir: string) => {
    setCreatingKind(kind);
    setCreatingParent(parentDir);
    setNewName('');
    setExpanded((prev) => ({ ...prev, [parentDir]: true }));
  };

  const submitCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !creatingKind) {
      setCreatingKind(null);
      return;
    }
    if (creatingKind === 'file') {
      await onCreateFile(creatingParent, trimmed);
    } else {
      await onCreateFolder(creatingParent, trimmed);
    }
    setCreatingKind(null);
    setNewName('');
  };

  const submitRename = async (oldPath: string) => {
    const trimmed = renameValue.trim();
    setRenamingPath(null);
    if (trimmed) {
      await onRenamePath(oldPath, trimmed);
    }
  };

  const renderNode = (node: FileTreeNode, depth: number) => {
    const isDir = node.kind === 'directory';
    const isOpen = Boolean(expanded[node.path]);
    const isSelected = activeFilePath === node.path;

    return (
      <div key={node.path}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            paddingLeft: depth * 12 + 4,
            paddingRight: 4,
            height: 24,
            borderRadius: 3,
            background: isSelected ? 'var(--bg-active-item)' : 'transparent',
            color: isSelected ? 'var(--text-bright)' : 'var(--text-primary)',
            cursor: 'pointer',
          }}
          onClick={() => (isDir ? toggleDir(node.path) : onOpenFile(node.path))}
        >
          {isDir ? (
            isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />
          ) : (
            <span style={{ width: 13 }} />
          )}
          {isDir ? (
            isOpen ? <FolderOpen size={14} color="var(--accent-cyan)" /> : <Folder size={14} color="var(--accent-cyan)" />
          ) : (
            <FileCode2 size={14} color="var(--text-secondary)" />
          )}

          {renamingPath === node.path ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitRename(node.path);
                if (e.key === 'Escape') setRenamingPath(null);
              }}
              onBlur={() => setRenamingPath(null)}
              style={{ flex: 1, fontSize: 12, padding: '1px 4px', height: 20 }}
            />
          ) : (
            <span
              style={{
                flex: 1,
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={node.relativePath}
            >
              {node.name}
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={(e) => e.stopPropagation()}>
            {isDir && (
              <button
                type="button"
                title="New File Inside"
                aria-label={`New file inside ${node.name}`}
                className="workbench-icon-btn"
                style={{ width: 20, height: 20 }}
                onClick={() => startCreate('file', node.path)}
              >
                <FilePlus size={11} />
              </button>
            )}
            <button
              type="button"
              title="Rename"
              aria-label={`Rename ${node.name}`}
              className="workbench-icon-btn"
              style={{ width: 20, height: 20 }}
              onClick={() => {
                setRenamingPath(node.path);
                setRenameValue(node.name);
              }}
            >
              <Edit3 size={11} />
            </button>
            <button
              type="button"
              title="Delete"
              aria-label={`Delete ${node.name}`}
              className="workbench-icon-btn"
              style={{ width: 20, height: 20 }}
              onClick={() => void onDeletePath(node.path, node.name)}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {isDir && isOpen && creatingKind && creatingParent === node.path && (
          <div style={{ paddingLeft: (depth + 1) * 12 + 16, paddingRight: 6, paddingBlock: 3 }}>
            <input
              autoFocus
              placeholder={creatingKind === 'file' ? 'filename.ts' : 'folder-name'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitCreate();
                if (e.key === 'Escape') setCreatingKind(null);
              }}
              onBlur={() => setCreatingKind(null)}
              style={{ width: '100%', fontSize: 12, padding: '2px 6px' }}
            />
          </div>
        )}

        {isDir && isOpen && node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 4px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 6,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: 12,
            color: 'var(--text-bright)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={currentWorkspace}
        >
          {currentWorkspace.split(/[\\/]/).pop()}
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            type="button"
            className="workbench-icon-btn"
            style={{ width: 22, height: 22 }}
            title="New File"
            aria-label="New File"
            onClick={() => startCreate('file', currentWorkspace)}
          >
            <FilePlus size={13} />
          </button>
          <button
            type="button"
            className="workbench-icon-btn"
            style={{ width: 22, height: 22 }}
            title="New Folder"
            aria-label="New Folder"
            onClick={() => startCreate('folder', currentWorkspace)}
          >
            <FolderPlus size={13} />
          </button>
          <button
            type="button"
            className="workbench-icon-btn"
            style={{ width: 22, height: 22 }}
            title="Refresh Explorer"
            aria-label="Refresh Explorer"
            onClick={onRefreshTree}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {creatingKind && creatingParent === currentWorkspace && (
        <div style={{ padding: '2px 4px' }}>
          <input
            autoFocus
            placeholder={creatingKind === 'file' ? 'newfile.ts' : 'new-folder'}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submitCreate();
              if (e.key === 'Escape') setCreatingKind(null);
            }}
            onBlur={() => setCreatingKind(null)}
            style={{ width: '100%', fontSize: 12 }}
          />
        </div>
      )}

      {tree.length === 0 ? (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8 }}>
          Empty workspace folder. Use + icons above to create a file or folder.
        </p>
      ) : (
        tree.map((node) => renderNode(node, 0))
      )}
    </div>
  );
};
