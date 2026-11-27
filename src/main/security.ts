import path from 'path';
import { BrowserWindow, shell } from 'electron';
import { SENSITIVE_FILE_PATTERNS, EXCLUDED_DIR_PATTERNS } from '../common/constants.js';

/**
 * Validates that a target path is strictly contained within the canonical workspace boundary.
 * Throws an error or returns false if directory traversal or escape is detected.
 */
export function isPathInsideWorkspace(workspaceRoot: string, targetPath: string): boolean {
  if (!workspaceRoot || !targetPath) {
    return false;
  }

  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedTarget = path.resolve(targetPath);

  // Normalize case for Windows
  const lowerRoot = resolvedRoot.toLowerCase();
  const lowerTarget = resolvedTarget.toLowerCase();

  // Must start with root path and either equal it or follow with path separator
  if (lowerTarget === lowerRoot) {
    return true;
  }

  const rootWithSep = lowerRoot.endsWith(path.sep) ? lowerRoot : lowerRoot + path.sep;
  return lowerTarget.startsWith(rootWithSep);
}

/**
 * Checks whether a file path matches known sensitive patterns (e.g. .env, private keys)
 */
export function isSensitiveFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

/**
 * Checks whether a directory is excluded (e.g. .git, node_modules, .nova-checkpoints)
 */
export function isExcludedDirectory(dirPath: string): boolean {
  const dirName = path.basename(dirPath);
  return EXCLUDED_DIR_PATTERNS.some((pattern) => pattern.test(dirName));
}

/**
 * Applies security constraints to an Electron BrowserWindow instance:
 * - Prevents external navigation
 * - Intercepts new window opening
 * - Disables navigation away from safe origin
 */
export function hardenBrowserWindow(win: BrowserWindow): void {
  // Prevent renderer from navigating to arbitrary external URLs
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // Allow local file loading or localhost/127.0.0.1 preview URLs
    const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    const isFileScheme = parsedUrl.protocol === 'file:';

    if (!isLocalhost && !isFileScheme) {
      event.preventDefault();
      console.warn(`[Security] Blocked external navigation in main window to: ${navigationUrl}`);
    }
  });

  // Intercept window.open calls and open external URLs in external browser safely
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        // Only open safe web URLs externally if needed
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
