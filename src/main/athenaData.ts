import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import {
  AthenaDataStats,
  ConversationRecord,
  SnapshotRecord,
} from '../common/types.js';
import { isPathInsideWorkspace } from './security.js';

export const ATHENA_DATA_SUBDIRS = [
  'models',
  'knowledge',
  'indexes',
  'embeddings',
  'cache',
  'conversations',
  'settings',
  'logs',
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
