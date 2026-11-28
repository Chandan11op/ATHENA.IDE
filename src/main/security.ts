import fs from 'fs';
import path from 'path';
import { BrowserWindow, shell } from 'electron';
import { SENSITIVE_FILE_PATTERNS, EXCLUDED_DIR_PATTERNS } from '../common/constants.js';

function resolveRealOrLexical(targetPath: string): string {
  const lexical = path.resolve(targetPath);
  if (fs.existsSync(lexical)) {
    try {
      return fs.realpathSync(lexical);
    } catch {
      return lexical;
    }
  }
  const parent = path.dirname(lexical);
  if (parent !== lexical && fs.existsSync(parent)) {
    try {
      return path.join(fs.realpathSync(parent), path.basename(lexical));
    } catch {
      return lexical;
    }
  }
  return lexical;
}

/**
 * Validates that a target path is strictly contained within the canonical workspace boundary.
 * Resolves symlinks when present so symlink escapes cannot bypass containment.
 */
export function isPathInsideWorkspace(workspaceRoot: string, targetPath: string): boolean {
  if (!workspaceRoot || !targetPath) {
    return false;
  }

  const resolvedRoot = resolveRealOrLexical(workspaceRoot);
  const resolvedTarget = resolveRealOrLexical(targetPath);

  const lowerRoot = resolvedRoot.toLowerCase();
  const lowerTarget = resolvedTarget.toLowerCase();

  if (lowerTarget === lowerRoot) {
    return true;
  }

  const rootWithSep = lowerRoot.endsWith(path.sep) ? lowerRoot : lowerRoot + path.sep;
  return lowerTarget.startsWith(rootWithSep);
}

/**
 * Checks whether a file path matches known sensitive patterns (e.g. .env, private keys).
 */
export function isSensitiveFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

/**
 * Checks whether a directory is excluded (e.g. .git, node_modules, .athena-checkpoints).
 */
export function isExcludedDirectory(dirPath: string): boolean {
  const dirName = path.basename(dirPath);
  return EXCLUDED_DIR_PATTERNS.some((pattern) => pattern.test(dirName));
}

/**
 * Applies security constraints to an Electron BrowserWindow instance:
 * - Prevents external navigation
 * - Intercepts window.open calls to safe http/https URLs via external browser
 */
export function hardenBrowserWindow(win: BrowserWindow): void {
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
      const isFileScheme = parsedUrl.protocol === 'file:';

      if (!isLocalhost && !isFileScheme) {
        event.preventDefault();
        console.warn(`[Security] Blocked external navigation in main window to: ${navigationUrl}`);
      }
    } catch {
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        shell.openExternal(url).catch((err) => {
          console.error('[Security] Failed to open external URL:', err);
        });
      }
    } catch {
      // Invalid URL - deny
    }
    return { action: 'deny' };
  });
}
