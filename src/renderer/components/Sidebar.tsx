import React from 'react';
import {
  AthenaExtension,
  FileTreeNode,
  GitStatusSummary,
  OllamaStatus,
  RunnerStatus,
  SystemMetrics,
} from '@common/types.js';
import { ActivityView } from '../types/workbench.js';
import { ExplorerPanel } from './ExplorerPanel.js';
import { SearchPanel } from './SearchPanel.js';
import { SourceControlPanel } from './SourceControlPanel.js';
import { RunDebugPanel } from './RunDebugPanel.js';
import { ExtensionsPanel } from './ExtensionsPanel.js';
import { OllamaManagerPanel } from './OllamaManagerPanel.js';

interface SidebarProps {
  activeView: ActivityView;
  isVisible: boolean;
  width: number;
  currentWorkspace: string | null;
  tree: FileTreeNode[];
  activeFilePath?: string;
  ollamaStatus: OllamaStatus | null;
  selectedModel: string;
  systemMetrics: SystemMetrics | null;
  gitStatus: GitStatusSummary | null;
  runnerStatus: RunnerStatus;
  onSelectWorkspace: () => void;
  onRefreshTree: () => void;
  onOpenFile: (filePath: string, line?: number, column?: number) => void;
  onCreateFile: (parentDir: string, name: string) => Promise<void>;
  onCreateFolder: (parentDir: string, name: string) => Promise<void>;
  onRenamePath: (oldPath: string, newName: string) => Promise<void>;
  onDeletePath: (targetPath: string, name: string) => Promise<void>;
  onRefreshGit: () => Promise<void>;
  onOpenDiff: (filePath: string, diffText: string) => void;
  onWorkspaceChanged: (newPath: string) => void;
  onOpenPreview: (url: string) => void;
  onSelectModel: (model: string) => void;
  onRefreshOllama: () => Promise<void>;
  onExtensionsChanged: (list: AthenaExtension[]) => void;
}

const VIEW_TITLES: Record<ActivityView, string> = {
  explorer: 'Explorer',
  search: 'Search',
  git: 'Source Control',
  run: 'Run and Debug',
  extensions: 'Extensions',
  ai: 'Athena AI & Data',
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
  if (!props.isVisible) return null;

  return (
    <aside
      style={{
        width: `${props.width}px`,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: '35px',
          padding: '0 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
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
          {VIEW_TITLES[props.activeView]}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {props.activeView === 'explorer' && (
          <ExplorerPanel
            currentWorkspace={props.currentWorkspace}
            tree={props.tree}
            activeFilePath={props.activeFilePath}
            onSelectWorkspace={props.onSelectWorkspace}
            onRefreshTree={props.onRefreshTree}
            onOpenFile={(fp) => props.onOpenFile(fp)}
            onCreateFile={props.onCreateFile}
            onCreateFolder={props.onCreateFolder}
            onRenamePath={props.onRenamePath}
            onDeletePath={props.onDeletePath}
          />
        )}

        {props.activeView === 'search' && (
          <SearchPanel
            currentWorkspace={props.currentWorkspace}
            onOpenFileAtLine={(fp, line, col) => props.onOpenFile(fp, line, col)}
          />
        )}

        {props.activeView === 'git' && (
          <SourceControlPanel
            currentWorkspace={props.currentWorkspace}
            onRefreshStatus={props.onRefreshGit}
            gitStatus={props.gitStatus}
            onOpenDiff={props.onOpenDiff}
            onWorkspaceChanged={props.onWorkspaceChanged}
          />
        )}

        {props.activeView === 'run' && (
          <RunDebugPanel
            currentWorkspace={props.currentWorkspace}
            runnerStatus={props.runnerStatus}
            onOpenPreview={props.onOpenPreview}
          />
        )}

        {props.activeView === 'extensions' && (
          <ExtensionsPanel onExtensionsChanged={props.onExtensionsChanged} />
        )}

        {props.activeView === 'ai' && (
          <OllamaManagerPanel
            ollamaStatus={props.ollamaStatus}
            selectedModel={props.selectedModel}
            systemMetrics={props.systemMetrics}
            onSelectModel={props.onSelectModel}
            onRefreshOllama={props.onRefreshOllama}
          />
        )}
      </div>
    </aside>
  );
};
