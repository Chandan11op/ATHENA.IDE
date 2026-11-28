import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import {
  AthenaDataStats,
  AthenaSettings,
  AthenaSetupState,
  ConversationRecord,
  DataInitReport,
  SnapshotRecord,
} from '../common/types.js';
import { DEFAULT_OLLAMA_ENDPOINT } from '../common/constants.js';
import { isPathInsideWorkspace } from './security.js';

export const ATHENA_DATA_SUBDIRS = [
  'config',
  'models',
  'knowledge',
  'knowledge/docs',
  'knowledge/snippets',
  'knowledge/resources',
  'knowledge/manifests',
  'indexes',
  'embeddings',
  'workspace-context',
  'cache',
  'conversations',
  'settings',
  'logs',
  'diagnostics',
  'setup',
  'extensions',
  'templates',
  'snapshots',
] as const;

export type AthenaDataSubdir = (typeof ATHENA_DATA_SUBDIRS)[number];

export class AthenaDataManager {
  public readonly rootDir: string;

  constructor(customRootDir?: string) {
    if (customRootDir) {
      this.rootDir = path.resolve(customRootDir);
    } else if (app && typeof app.getPath === 'function') {
      this.rootDir = path.join(app.getPath('userData'), 'athena.data');
    } else {
      this.rootDir = path.resolve(process.cwd(), 'athena.data');
    }
    this.ensureStructure();
  }

  public ensureStructure(): void {
    fs.mkdirSync(this.rootDir, { recursive: true });
    for (const dir of ATHENA_DATA_SUBDIRS) {
      fs.mkdirSync(path.join(this.rootDir, dir), { recursive: true });
    }
  }

  public getSubdir(name: AthenaDataSubdir): string {
    const target = path.join(this.rootDir, name);
    fs.mkdirSync(target, { recursive: true });
    return target;
  }

  public initAndVerifyDataDir(settings?: AthenaSettings): DataInitReport {
    const now = new Date().toISOString();
    try {
      this.ensureStructure();

      // Verify directory permissions using write/read/delete probe in diagnostics
      const probePath = path.join(this.getSubdir('diagnostics'), `.write-probe-${Date.now()}.tmp`);
      fs.writeFileSync(probePath, 'ok', 'utf8');
      const readBack = fs.readFileSync(probePath, 'utf8');
      fs.rmSync(probePath, { force: true });
      if (readBack !== 'ok') {
        throw new Error('Read-back verification failed in diagnostics directory');
      }

      // Ensure versioned config/config.json exists without overwriting existing user config
      this.writeVersionedConfig(settings);

      // Ensure setup-state.json exists and records dataDirInitialized cleanly
      const currentSetup = this.getSetupState();
      this.updateSetupState({
        appInitialized: { status: 'done', updatedAt: currentSetup.appInitialized.updatedAt || now },
        dataDirInitialized: {
          status: 'done',
          path: this.rootDir,
          writable: true,
          updatedAt: now,
        },
        lastError: null,
      });

      return {
        ok: true,
        rootDir: this.rootDir,
        writable: true,
        stats: this.getStats(),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize athena.data';
      return {
        ok: false,
        rootDir: this.rootDir,
        writable: false,
        failedComponent: 'athena.data',
        error: msg,
        stats: { rootDir: this.rootDir, totalBytes: 0, subdirectories: [] },
      };
    }
  }

  public writeVersionedConfig(settings?: AthenaSettings): void {
    const configPath = path.join(this.getSubdir('config'), 'config.json');
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>;
      } catch {
        existing = {};
      }
    }

    const nextConfig = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      dataDirectory: this.rootDir,
      ollamaEndpoint: settings?.ollamaEndpoint ?? existing.ollamaEndpoint ?? DEFAULT_OLLAMA_ENDPOINT,
      selectedModel: settings?.selectedModel ?? existing.selectedModel ?? '',
      privacy: {
        loopbackOnlyAi: true,
        telemetryEnabled: false,
        excludeSensitiveFiles: true,
      },
      knowledge: {
        autoIndexWorkspace: false,
        maxChunkChars: 700,
      },
    };

    const temp = `${configPath}.tmp.${Date.now()}`;
    fs.writeFileSync(temp, JSON.stringify(nextConfig, null, 2), 'utf8');
    fs.renameSync(temp, configPath);
  }

  private defaultSetupState(): AthenaSetupState {
    const now = new Date().toISOString();
    return {
      schemaVersion: 1,
      appInitialized: { status: 'done', updatedAt: now },
      dataDirInitialized: {
        status: 'done',
        path: this.rootDir,
        writable: true,
        updatedAt: now,
      },
      ollamaDetected: {
        status: 'pending',
        executablePath: null,
        version: null,
        updatedAt: now,
      },
      ollamaInstalled: {
        status: 'unknown',
        updatedAt: now,
      },
      ollamaApiVerified: {
        status: 'pending',
        endpoint: DEFAULT_OLLAMA_ENDPOINT,
        updatedAt: now,
      },
      modelInstalled: {
        status: 'pending',
        modelId: null,
        updatedAt: now,
      },
      modelVerified: {
        status: 'pending',
        modelId: null,
        updatedAt: now,
      },
      aiOperational: {
        status: 'pending',
        updatedAt: now,
      },
      setupCompleted: false,
      skippedAiSetup: false,
      lastError: null,
    };
  }

  public getSetupState(): AthenaSetupState {
    const statePath = path.join(this.getSubdir('setup'), 'setup-state.json');
    if (fs.existsSync(statePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8')) as Partial<AthenaSetupState>;
        return { ...this.defaultSetupState(), ...parsed };
      } catch {
        // Recover cleanly to defaults if corrupt
      }
    }
    const fresh = this.defaultSetupState();
    this.saveSetupState(fresh);
    return fresh;
  }

  private saveSetupState(state: AthenaSetupState): void {
    const statePath = path.join(this.getSubdir('setup'), 'setup-state.json');
    const temp = `${statePath}.tmp.${Date.now()}`;
    fs.writeFileSync(temp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(temp, statePath);
  }

  public updateSetupState(partial: Partial<AthenaSetupState>): AthenaSetupState {
    const current = this.getSetupState();
    const next: AthenaSetupState = {
      ...current,
      ...partial,
    };
    this.saveSetupState(next);
    return next;
  }

  public getStats(): AthenaDataStats {
    this.ensureStructure();
    let totalBytes = 0;
    const subdirectories = ATHENA_DATA_SUBDIRS.map((name) => {
      const dirPath = path.join(this.rootDir, name);
      const { bytes, fileCount } = this.measureDirectory(dirPath);
      totalBytes += bytes;
      return { name, path: dirPath, bytes, fileCount };
    });

    return {
      rootDir: this.rootDir,
      totalBytes,
      subdirectories,
    };
  }

  private measureDirectory(dirPath: string): { bytes: number; fileCount: number } {
    let bytes = 0;
    let fileCount = 0;
    if (!fs.existsSync(dirPath)) return { bytes, fileCount };

    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = this.measureDirectory(fullPath);
        bytes += sub.bytes;
        fileCount += sub.fileCount;
      } else if (entry.isFile()) {
        fileCount += 1;
        try {
          bytes += fs.statSync(fullPath).size;
        } catch {
          // Ignore transient stat error
        }
      }
    }
    return { bytes, fileCount };
  }

  public clearCache(): boolean {
    try {
      const cacheDir = this.getSubdir('cache');
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  public listConversations(): ConversationRecord[] {
    const convDir = this.getSubdir('conversations');
    const results: ConversationRecord[] = [];
    for (const file of fs.readdirSync(convDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = fs.readFileSync(path.join(convDir, file), 'utf8');
        results.push(JSON.parse(raw) as ConversationRecord);
      } catch {
        // Skip corrupt conversation entry
      }
    }
    return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public saveConversation(record: ConversationRecord): boolean {
    if (!record.id || /[^a-zA-Z0-9_-]/.test(record.id)) return false;
    try {
      const target = path.join(this.getSubdir('conversations'), `${record.id}.json`);
      const temp = `${target}.tmp.${Date.now()}`;
      fs.writeFileSync(temp, JSON.stringify(record, null, 2), 'utf8');
      fs.renameSync(temp, target);
      return true;
    } catch {
      return false;
    }
  }

  public deleteConversation(id: string): boolean {
    if (!id || /[^a-zA-Z0-9_-]/.test(id)) return false;
    const target = path.join(this.getSubdir('conversations'), `${id}.json`);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
    return true;
  }

  public createSnapshot(
    workspacePath: string,
    relativePaths: string[],
    label: string
  ): SnapshotRecord {
    const id = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const snapDir = path.join(this.getSubdir('snapshots'), id);
    const filesDir = path.join(snapDir, 'files');
    fs.mkdirSync(filesDir, { recursive: true });

    const filesMeta: Array<{ relativePath: string; existed: boolean }> = [];

    for (const rel of relativePaths) {
      const absTarget = path.resolve(workspacePath, rel);
      if (!isPathInsideWorkspace(workspacePath, absTarget)) continue;

      const existed = fs.existsSync(absTarget) && fs.statSync(absTarget).isFile();
      filesMeta.push({ relativePath: rel, existed });
      if (existed) {
        const backupPath = path.join(filesDir, rel);
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.copyFileSync(absTarget, backupPath);
      }
    }

    const record: SnapshotRecord = {
      id,
      createdAt: new Date().toISOString(),
      label,
      workspacePath,
      files: filesMeta,
    };
    fs.writeFileSync(path.join(snapDir, 'meta.json'), JSON.stringify(record, null, 2), 'utf8');
    return record;
  }

  public listSnapshots(workspacePath?: string | null): SnapshotRecord[] {
    const root = this.getSubdir('snapshots');
    const records: SnapshotRecord[] = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const metaPath = path.join(root, entry.name, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;
      try {
        const rec = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as SnapshotRecord;
        if (!workspacePath || rec.workspacePath.toLowerCase() === workspacePath.toLowerCase()) {
          records.push(rec);
        }
      } catch {
        // Ignore malformed snapshot
      }
    }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public restoreSnapshot(
    snapshotId: string,
    workspacePath: string
  ): { ok: boolean; restored: string[]; error?: string } {
    if (!snapshotId || /[^a-zA-Z0-9_-]/.test(snapshotId)) {
      return { ok: false, restored: [], error: 'Invalid snapshot ID' };
    }
    const snapDir = path.join(this.getSubdir('snapshots'), snapshotId);
    const metaPath = path.join(snapDir, 'meta.json');
    if (!fs.existsSync(metaPath)) {
      return { ok: false, restored: [], error: 'Snapshot not found' };
    }

    const record = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as SnapshotRecord;
    if (path.resolve(record.workspacePath).toLowerCase() !== path.resolve(workspacePath).toLowerCase()) {
      return { ok: false, restored: [], error: 'Snapshot belongs to a different workspace' };
    }

    const restored: string[] = [];
    for (const fileInfo of record.files) {
      const target = path.resolve(workspacePath, fileInfo.relativePath);
      if (!isPathInsideWorkspace(workspacePath, target)) continue;

      if (fileInfo.existed) {
        const backup = path.join(snapDir, 'files', fileInfo.relativePath);
        if (fs.existsSync(backup)) {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.copyFileSync(backup, target);
          restored.push(fileInfo.relativePath);
        }
      } else if (fs.existsSync(target)) {
        fs.rmSync(target, { force: true });
        restored.push(fileInfo.relativePath);
      }
    }

    return { ok: true, restored };
  }
}
