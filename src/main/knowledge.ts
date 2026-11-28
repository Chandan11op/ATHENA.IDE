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

const INITIAL_KNOWLEDGE_DOCS: Array<{
  id: string;
  fileName: string;
  subdir: 'docs' | 'snippets';
  title: string;
  content: string;
}> = [
  {
    id: 'pack-html-css',
    fileName: 'html-css-essentials.md',
    subdir: 'docs',
    title: 'HTML5 & CSS3 Offline Reference',
    content: `# HTML5 & CSS3 Essentials (Athena.IDE Reference)
- Semantic landmarks: <header>, <nav>, <main>, <section>, <article>, <footer>.
- Responsive layouts: CSS Grid (grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))) and Flexbox.
- Accessible forms: pair <label for="id"> with input id, preserve :focus-visible outlines.
`,
  },
  {
    id: 'pack-js-ts',
    fileName: 'javascript-typescript-basics.md',
    subdir: 'docs',
    title: 'JavaScript & TypeScript Essentials',
    content: `# JavaScript & TypeScript Offline Reference
- Prefer strict TypeScript interfaces and explicit error handling with try/catch.
- Use async/await with Promise.all for independent asynchronous operations.
- Validate untrusted paths and inputs before filesystem or network operations.
`,
  },
  {
    id: 'pack-react-vite',
    fileName: 'react-vite-offline-guide.md',
    subdir: 'snippets',
    title: 'React & Vite Offline Workflow',
    content: `# React + Vite Local Workflow
- Manage component state with useState, derived state with useMemo, and cleanup in useEffect.
- Local dev server: run \`npm run dev\` after inspecting package.json scripts.
- Static HTML/CSS/JS workspaces can be previewed directly on 127.0.0.1 without Node dependencies.
`,
  },
  {
    id: 'pack-ollama',
    fileName: 'ollama-local-models.md',
    subdir: 'docs',
    title: 'Ollama Local Loopback API Reference',
    content: `# Ollama Local Runtime Reference
- Default loopback endpoint: http://127.0.0.1:11434
- Endpoints: GET /api/tags (list models), POST /api/chat (streaming chat), POST /api/generate (completions), POST /api/pull (download model).
- Lightweight coding model baseline: qwen2.5-coder:1.5b (~1.0 GB, 4-8 GB RAM systems).
`,
  },
];

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

  public seedInitialPack(): { ok: boolean; added: KnowledgeSource[]; error?: string } {
    try {
      const added: KnowledgeSource[] = [];
      for (const doc of INITIAL_KNOWLEDGE_DOCS) {
        const subdir = doc.subdir === 'docs' ? 'knowledge/docs' : 'knowledge/snippets';
        const targetPath = path.join(this.dataManager.getSubdir(subdir), doc.fileName);
        if (!fs.existsSync(targetPath)) {
          fs.writeFileSync(targetPath, doc.content, 'utf8');
        }

        const alreadyIndexed = this.manifest.sources.some((s) => s.id === doc.id);
        if (!alreadyIndexed) {
          const pieces = this.chunkText(doc.content);
          for (const piece of pieces) {
            this.manifest.chunks.push({
              sourceId: doc.id,
              sourceLabel: doc.title,
              filePath: doc.fileName,
              text: piece,
            });
          }
          const src: KnowledgeSource = {
            id: doc.id,
            label: doc.title,
            sourcePath: targetPath,
            kind: 'file',
            addedAt: new Date().toISOString(),
            chunkCount: pieces.length,
            attribution: 'Athena.IDE Built-in Open Reference Pack (CC0 / Project Authored)',
          };
          this.manifest.sources.push(src);
          added.push(src);
        }
      }

      const packManifestPath = path.join(
        this.dataManager.getSubdir('knowledge/manifests'),
        'initial-pack.json'
      );
      fs.writeFileSync(
        packManifestPath,
        JSON.stringify(
          {
            schemaVersion: 1,
            license: 'CC0-1.0 / MIT (Athena.IDE Project Authored)',
            items: INITIAL_KNOWLEDGE_DOCS.map((d) => ({
              id: d.id,
              fileName: d.fileName,
              title: d.title,
            })),
          },
          null,
          2
        ),
        'utf8'
      );

      this.saveManifest();
      return { ok: true, added };
    } catch (err) {
      return {
        ok: false,
        added: [],
        error: err instanceof Error ? err.message : 'Failed to seed knowledge pack',
      };
    }
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
    const knowledgeDir = this.dataManager.getSubdir('knowledge/resources');
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
