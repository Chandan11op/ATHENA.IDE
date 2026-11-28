import fs from 'fs';
import path from 'path';
import { KnowledgeHit, KnowledgeSource } from '../common/types.js';
import { AthenaDataManager } from './athenaData.js';
import {
  isExcludedDirectory,
  isPathInsideWorkspace,
  isSensitiveFile,
} from './security.js';

interface IndexedChunk {
  sourceId: string;
  sourceLabel: string;
  filePath: string;
  text: string;
}

interface KnowledgeManifest {
  sources: KnowledgeSource[];
  chunks: IndexedChunk[];
}

const INDEXABLE_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.html', '.css',
  '.json', '.md', '.txt', '.py', '.yml', '.yaml',
]);

export class KnowledgeService {
  private readonly manifestPath: string;
  private manifest: KnowledgeManifest;

  constructor(private readonly dataManager: AthenaDataManager) {
    this.manifestPath = path.join(this.dataManager.getSubdir('indexes'), 'knowledge-index.json');
    this.manifest = this.loadManifest();
  }

  private loadManifest(): KnowledgeManifest {
    try {
      if (fs.existsSync(this.manifestPath)) {
        return JSON.parse(fs.readFileSync(this.manifestPath, 'utf8')) as KnowledgeManifest;
      }
    } catch {
      // Fallback to clean manifest
    }
    return { sources: [], chunks: [] };
  }

  private saveManifest(): void {
    const temp = `${this.manifestPath}.tmp.${Date.now()}`;
    fs.writeFileSync(temp, JSON.stringify(this.manifest, null, 2), 'utf8');
    fs.renameSync(temp, this.manifestPath);
  }

  public listSources(): KnowledgeSource[] {
    return [...this.manifest.sources];
  }

  private chunkText(text: string, chunkSize = 700): string[] {
    const chunks: string[] = [];
    const lines = text.split(/\r?\n/);
    let current = '';
    for (const line of lines) {
      if (current.length + line.length + 1 > chunkSize && current.length > 0) {
        chunks.push(current);
        current = line;
      } else {
        current = current ? `${current}\n${line}` : line;
      }
    }
    if (current.trim()) chunks.push(current);
    return chunks;
  }

  private collectDirectoryChunks(
    rootDir: string,
    sourceId: string,
    sourceLabel: string
  ): IndexedChunk[] {
    const chunks: IndexedChunk[] = [];
    const walk = (dir: string) => {
      if (chunks.length >= 1200) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (chunks.length >= 1200) break;
        const full = path.join(dir, entry.name);
        if (!isPathInsideWorkspace(rootDir, full)) continue;
        if (entry.isDirectory()) {
          if (!isExcludedDirectory(full)) walk(full);
          continue;
        }
        if (!entry.isFile() || isSensitiveFile(full)) continue;
        if (!INDEXABLE_EXTS.has(path.extname(full).toLowerCase())) continue;

        try {
          const stat = fs.statSync(full);
          if (stat.size > 256 * 1024) continue;
          const rel = path.relative(rootDir, full);
          const content = fs.readFileSync(full, 'utf8');
          for (const piece of this.chunkText(content)) {
            chunks.push({ sourceId, sourceLabel, filePath: rel, text: piece });
          }
        } catch {
          // Skip unreadable file
        }
      }
    };
    walk(rootDir);
    return chunks;
  }

  public indexWorkspace(workspacePath: string): { ok: boolean; source?: KnowledgeSource; error?: string } {
    if (!workspacePath || !fs.existsSync(workspacePath)) {
      return { ok: false, error: 'Workspace directory not found' };
    }

    const existing = this.manifest.sources.find(
      (s) => s.kind === 'workspace' && path.resolve(s.sourcePath).toLowerCase() === path.resolve(workspacePath).toLowerCase()
    );
    const sourceId = existing?.id ?? `ws-${Date.now()}`;
    const label = `Workspace: ${path.basename(workspacePath)}`;
    const chunks = this.collectDirectoryChunks(workspacePath, sourceId, label);

    this.manifest.chunks = this.manifest.chunks.filter((c) => c.sourceId !== sourceId);
    this.manifest.chunks.push(...chunks);

    const source: KnowledgeSource = {
      id: sourceId,
      label,
      sourcePath: workspacePath,
      kind: 'workspace',
      addedAt: new Date().toISOString(),
      chunkCount: chunks.length,
      attribution: 'User local workspace',
    };

    this.manifest.sources = [
      ...this.manifest.sources.filter((s) => s.id !== sourceId),
      source,
    ];
    this.saveManifest();
    return { ok: true, source };
  }

  public addReferenceFiles(filePaths: string[]): { ok: boolean; added: KnowledgeSource[]; error?: string } {
    const knowledgeDir = this.dataManager.getSubdir('knowledge');
    const added: KnowledgeSource[] = [];

    for (const srcPath of filePaths) {
      if (!fs.existsSync(srcPath) || isSensitiveFile(srcPath)) continue;
      const stat = fs.statSync(srcPath);
      if (!stat.isFile() || stat.size > 512 * 1024) continue;

      const base = path.basename(srcPath);
      const copiedPath = path.join(knowledgeDir, `${Date.now()}-${base}`);
      fs.copyFileSync(srcPath, copiedPath);

      const content = fs.readFileSync(copiedPath, 'utf8');
      const sourceId = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const pieces = this.chunkText(content);
      for (const piece of pieces) {
        this.manifest.chunks.push({
          sourceId,
          sourceLabel: base,
          filePath: base,
          text: piece,
        });
      }

      const source: KnowledgeSource = {
        id: sourceId,
        label: base,
        sourcePath: copiedPath,
        kind: 'file',
        addedAt: new Date().toISOString(),
        chunkCount: pieces.length,
        attribution: `User-provided reference (${srcPath})`,
      };
      this.manifest.sources.push(source);
      added.push(source);
    }

    this.saveManifest();
    return { ok: true, added };
  }

  public removeSource(id: string): boolean {
    this.manifest.sources = this.manifest.sources.filter((s) => s.id !== id);
    this.manifest.chunks = this.manifest.chunks.filter((c) => c.sourceId !== id);
    this.saveManifest();
    return true;
  }

  public rebuildAll(): { ok: boolean; count: number; error?: string } {
    const nextChunks: IndexedChunk[] = [];
    const nextSources: KnowledgeSource[] = [];

    for (const src of this.manifest.sources) {
      if (!fs.existsSync(src.sourcePath)) continue;
      if (src.kind === 'workspace') {
        const chunks = this.collectDirectoryChunks(src.sourcePath, src.id, src.label);
        nextChunks.push(...chunks);
        nextSources.push({ ...src, chunkCount: chunks.length, addedAt: new Date().toISOString() });
      } else {
        const content = fs.readFileSync(src.sourcePath, 'utf8');
        const pieces = this.chunkText(content);
        for (const p of pieces) {
          nextChunks.push({ sourceId: src.id, sourceLabel: src.label, filePath: src.label, text: p });
        }
        nextSources.push({ ...src, chunkCount: pieces.length, addedAt: new Date().toISOString() });
      }
    }

    this.manifest = { sources: nextSources, chunks: nextChunks };
    this.saveManifest();
    return { ok: true, count: nextChunks.length };
  }

  public query(queryText: string, limit = 5): KnowledgeHit[] {
    const tokens = queryText
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((t) => t.length >= 2);
    if (tokens.length === 0) return [];

    const scored: KnowledgeHit[] = [];
    for (const chunk of this.manifest.chunks) {
      const hay = `${chunk.filePath} ${chunk.text}`.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (hay.includes(tok)) {
          score += chunk.filePath.toLowerCase().includes(tok) ? 3 : 1;
        }
      }
      if (score > 0) {
        scored.push({
          sourceId: chunk.sourceId,
          sourceLabel: chunk.sourceLabel,
          filePath: chunk.filePath,
          score,
          excerpt: chunk.text.slice(0, 320),
        });
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
