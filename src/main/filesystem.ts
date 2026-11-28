import fs from 'fs';
import path from 'path';
import {
  ApplyEditsResult,
  FileOpResult,
  FileReadResult,
  FileTreeNode,
  ProposedFileEdit,
  SearchResultItem,
} from '../common/types.js';
import {
  isExcludedDirectory,
  isPathInsideWorkspace,
  isSensitiveFile,
} from './security.js';
import { AthenaDataManager } from './athenaData.js';

const MAX_READ_BYTES = 2 * 1024 * 1024; // 2 MB text guard
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.exe',
  '.dll', '.so', '.dylib', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4',
]);

export function detectLanguageFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.html':
    case '.htm':
      return 'html';
    case '.css':
    case '.scss':
      return 'css';
    case '.json':
      return 'json';
    case '.md':
    case '.markdown':
      return 'markdown';
    case '.py':
      return 'python';
    case '.yml':
    case '.yaml':
      return 'yaml';
    case '.sh':
      return 'shell';
    case '.ps1':
      return 'powershell';
    default:
      return 'plaintext';
  }
}

export function readWorkspaceTree(
  workspaceRoot: string,
  maxDepth = 5
): { ok: boolean; tree: FileTreeNode[]; error?: string } {
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
    return { ok: false, tree: [], error: 'Workspace directory does not exist' };
  }

  const walk = (currentDir: string, depth: number): FileTreeNode[] => {
    if (depth > maxDepth) return [];
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const dirs: FileTreeNode[] = [];
    const files: FileTreeNode[] = [];

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (!isPathInsideWorkspace(workspaceRoot, fullPath)) continue;

      if (entry.isDirectory()) {
        if (isExcludedDirectory(fullPath)) continue;
        dirs.push({
          name: entry.name,
          path: fullPath,
          relativePath: path.relative(workspaceRoot, fullPath),
          kind: 'directory',
          children: walk(fullPath, depth + 1),
        });
      } else if (entry.isFile()) {
        let sizeBytes = 0;
        try {
          sizeBytes = fs.statSync(fullPath).size;
        } catch {
          // Ignore stat error
        }
        files.push({
          name: entry.name,
          path: fullPath,
          relativePath: path.relative(workspaceRoot, fullPath),
          kind: 'file',
          sizeBytes,
        });
      }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    return [...dirs, ...files];
  };

  return { ok: true, tree: walk(workspaceRoot, 0) };
}

export function readWorkspaceFile(
  workspaceRoot: string,
  targetPath: string
): FileReadResult {
  if (!isPathInsideWorkspace(workspaceRoot, targetPath)) {
    return { ok: false, path: targetPath, error: 'Access denied: path outside workspace boundary' };
  }

  if (!fs.existsSync(targetPath)) {
    return { ok: false, path: targetPath, error: 'File does not exist' };
  }

  const stat = fs.statSync(targetPath);
  if (!stat.isFile()) {
    return { ok: false, path: targetPath, error: 'Target path is not a file' };
  }

  if (stat.size > MAX_READ_BYTES) {
    return { ok: false, path: targetPath, error: 'File exceeds 2 MB editor read limit' };
  }

  const ext = path.extname(targetPath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return { ok: false, path: targetPath, error: `Binary file (${ext}) cannot be opened in text editor` };
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf8');
    return {
      ok: true,
      path: targetPath,
      content,
      language: detectLanguageFromPath(targetPath),
    };
  } catch (err) {
    return {
      ok: false,
      path: targetPath,
      error: err instanceof Error ? err.message : 'Unable to read file',
    };
  }
}

export function writeWorkspaceFile(
  workspaceRoot: string,
  targetPath: string,
  content: string
): FileOpResult {
  if (!isPathInsideWorkspace(workspaceRoot, targetPath)) {
    return { ok: false, error: 'Access denied: path outside workspace boundary' };
  }

  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
    return { ok: true, path: targetPath };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unable to write file' };
  }
}

export function createWorkspaceFile(
  workspaceRoot: string,
  targetPath: string,
  content = ''
): FileOpResult {
  if (!isPathInsideWorkspace(workspaceRoot, targetPath)) {
    return { ok: false, error: 'Access denied: path outside workspace boundary' };
  }
  if (fs.existsSync(targetPath)) {
    return { ok: false, error: 'File already exists' };
  }
  return writeWorkspaceFile(workspaceRoot, targetPath, content);
}

export function createWorkspaceDirectory(
  workspaceRoot: string,
  targetPath: string
): FileOpResult {
  if (!isPathInsideWorkspace(workspaceRoot, targetPath)) {
    return { ok: false, error: 'Access denied: path outside workspace boundary' };
  }
  try {
    fs.mkdirSync(targetPath, { recursive: true });
    return { ok: true, path: targetPath };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unable to create directory' };
  }
}

export function renameWorkspacePath(
  workspaceRoot: string,
  oldPath: string,
  newPath: string
): FileOpResult {
  if (
    !isPathInsideWorkspace(workspaceRoot, oldPath) ||
    !isPathInsideWorkspace(workspaceRoot, newPath)
  ) {
    return { ok: false, error: 'Access denied: path outside workspace boundary' };
  }
  if (path.resolve(oldPath).toLowerCase() === path.resolve(workspaceRoot).toLowerCase()) {
    return { ok: false, error: 'Cannot rename workspace root' };
  }
  if (!fs.existsSync(oldPath)) {
    return { ok: false, error: 'Source path does not exist' };
  }
  if (fs.existsSync(newPath)) {
    return { ok: false, error: 'Destination path already exists' };
  }

  try {
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
    return { ok: true, path: newPath };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unable to rename path' };
  }
}

export function deleteWorkspacePath(
  workspaceRoot: string,
  targetPath: string
): FileOpResult {
  if (!isPathInsideWorkspace(workspaceRoot, targetPath)) {
    return { ok: false, error: 'Access denied: path outside workspace boundary' };
  }
  if (path.resolve(targetPath).toLowerCase() === path.resolve(workspaceRoot).toLowerCase()) {
    return { ok: false, error: 'Cannot delete workspace root' };
  }
  if (!fs.existsSync(targetPath)) {
    return { ok: false, error: 'Target does not exist' };
  }

  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
    return { ok: true, path: targetPath };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unable to delete path' };
  }
}

export function searchWorkspaceFiles(
  workspaceRoot: string,
  query: string,
  maxResults = 100
): { ok: boolean; results: SearchResultItem[]; error?: string } {
  const trimmed = query.trim();
  if (!trimmed) return { ok: true, results: [] };
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
    return { ok: false, results: [], error: 'Workspace directory not found' };
  }

  const lowerQuery = trimmed.toLowerCase();
  const results: SearchResultItem[] = [];

  const scan = (dir: string) => {
    if (results.length >= maxResults) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxResults) break;
      const fullPath = path.join(dir, entry.name);
      if (!isPathInsideWorkspace(workspaceRoot, fullPath)) continue;

      if (entry.isDirectory()) {
        if (isExcludedDirectory(fullPath)) continue;
        scan(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (isSensitiveFile(fullPath)) continue;
      const ext = path.extname(fullPath).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) continue;

      const relPath = path.relative(workspaceRoot, fullPath);
      if (relPath.toLowerCase().includes(lowerQuery)) {
        results.push({
          filePath: fullPath,
          relativePath: relPath,
          line: 1,
          column: 1,
          preview: relPath,
          matchType: 'filename',
        });
      }

      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 512 * 1024) continue;
        const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
        for (let i = 0; i < lines.length && results.length < maxResults; i++) {
          const lineText = lines[i] ?? '';
          const col = lineText.toLowerCase().indexOf(lowerQuery);
          if (col !== -1) {
            results.push({
              filePath: fullPath,
              relativePath: relPath,
              line: i + 1,
              column: col + 1,
              preview: lineText.trim().slice(0, 140),
              matchType: 'content',
            });
          }
        }
      } catch {
        // Ignore unreadable file
      }
    }
  };

  scan(workspaceRoot);
  return { ok: true, results };
}

export function applyProposedEdits(
  workspaceRoot: string,
  dataManager: AthenaDataManager,
  edits: ProposedFileEdit[],
  label = 'AI Proposed Changes'
): ApplyEditsResult {
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
    return { ok: false, appliedFiles: [], errors: ['No active workspace directory'] };
  }

  // Validate all edits before mutating anything
  const validated: Array<{ edit: ProposedFileEdit; absPath: string }> = [];
  for (const edit of edits) {
    const absPath = path.resolve(workspaceRoot, edit.relativePath);
    if (!isPathInsideWorkspace(workspaceRoot, absPath)) {
      return {
        ok: false,
        appliedFiles: [],
        errors: [`Blocked path outside workspace: ${edit.relativePath}`],
      };
    }
    if (isSensitiveFile(absPath)) {
      return {
        ok: false,
        appliedFiles: [],
        errors: [`Blocked modification of sensitive file: ${edit.relativePath}`],
      };
    }
    validated.push({ edit, absPath });
  }

  const snapshot = dataManager.createSnapshot(
    workspaceRoot,
    validated.map((v) => v.edit.relativePath),
    label
  );

  const appliedFiles: string[] = [];
  const errors: string[] = [];

  for (const { edit, absPath } of validated) {
    try {
      if (edit.action === 'delete') {
        if (fs.existsSync(absPath)) {
          fs.rmSync(absPath, { force: true });
        }
        appliedFiles.push(edit.relativePath);
      } else {
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, edit.newContent ?? '', 'utf8');
        appliedFiles.push(edit.relativePath);
      }
    } catch (err) {
      errors.push(
        `${edit.relativePath}: ${err instanceof Error ? err.message : 'Write failed'}`
      );
    }
  }

  return {
    ok: errors.length === 0,
    snapshotId: snapshot.id,
    appliedFiles,
    errors,
  };
}
