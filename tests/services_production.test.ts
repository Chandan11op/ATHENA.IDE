import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AthenaDataManager, ATHENA_DATA_SUBDIRS } from '../src/main/athenaData.js';
import { ExtensionManager } from '../src/main/extensions.js';
import {
  applyProposedEdits,
  createWorkspaceFile,
  deleteWorkspacePath,
  readWorkspaceFile,
  readWorkspaceTree,
  searchWorkspaceFiles,
  writeWorkspaceFile,
} from '../src/main/filesystem.js';
import { KnowledgeService } from '../src/main/knowledge.js';
import { checkOllamaAvailability } from '../src/main/ollama.js';
import { detectProject, ProjectRunner } from '../src/main/runner.js';

describe('Athena.IDE Production Services', () => {
  let tempRoot: string;
  let dataDir: string;
  let workspaceDir: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'athena-prod-'));
    dataDir = path.join(tempRoot, 'athena.data');
    workspaceDir = path.join(tempRoot, 'workspace');
    fs.mkdirSync(workspaceDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('initializes structured athena.data directories, conversations, and snapshots', () => {
    const manager = new AthenaDataManager(dataDir);
    for (const sub of ATHENA_DATA_SUBDIRS) {
      expect(fs.existsSync(path.join(dataDir, sub))).toBe(true);
    }

    const saved = manager.saveConversation({
      id: 'thread-1',
      title: 'Test Thread',
      model: 'qwen2.5-coder:1.5b',
      workspacePath: workspaceDir,
      updatedAt: new Date().toISOString(),
      messages: [{ id: 'm1', role: 'user', content: 'Hello', timestamp: '12:00' }],
    });
    expect(saved).toBe(true);
    expect(manager.listConversations()).toHaveLength(1);
    expect(manager.deleteConversation('thread-1')).toBe(true);
    expect(manager.listConversations()).toHaveLength(0);

    const filePath = path.join(workspaceDir, 'app.ts');
    fs.writeFileSync(filePath, 'const v = 1;\n', 'utf8');
    const applyRes = applyProposedEdits(
      workspaceDir,
      manager,
      [{ relativePath: 'app.ts', action: 'modify', newContent: 'const v = 2;\n' }],
      'Test edit'
    );
    expect(applyRes.ok).toBe(true);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('const v = 2;\n');

    const restoreRes = manager.restoreSnapshot(applyRes.snapshotId!, workspaceDir);
    expect(restoreRes.ok).toBe(true);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('const v = 1;\n');
  });

  it('enforces workspace sandboxing across file CRUD, search, and proposed edits', () => {
    const manager = new AthenaDataManager(dataDir);
    const target = path.join(workspaceDir, 'src', 'index.ts');

    expect(createWorkspaceFile(workspaceDir, target, 'export const hello = "athena";').ok).toBe(true);
    expect(readWorkspaceFile(workspaceDir, target).content).toContain('athena');
    expect(writeWorkspaceFile(workspaceDir, target, 'export const hello = "updated";').ok).toBe(true);

    // Traversal must be rejected
    const outside = path.join(workspaceDir, '..', 'escape.txt');
    expect(writeWorkspaceFile(workspaceDir, outside, 'bad').ok).toBe(false);
    expect(
      applyProposedEdits(workspaceDir, manager, [
        { relativePath: '../escape.txt', action: 'create', newContent: 'bad' },
      ]).ok
    ).toBe(false);

    // Sensitive files must be excluded from search and AI edits
    fs.writeFileSync(path.join(workspaceDir, '.env'), 'SECRET_TOKEN=12345\n', 'utf8');
    expect(
      applyProposedEdits(workspaceDir, manager, [
        { relativePath: '.env', action: 'modify', newContent: 'hacked' },
      ]).ok
    ).toBe(false);

    const searchRes = searchWorkspaceFiles(workspaceDir, 'SECRET_TOKEN');
    expect(searchRes.ok).toBe(true);
    expect(searchRes.results).toHaveLength(0);

    const codeSearch = searchWorkspaceFiles(workspaceDir, 'updated');
    expect(codeSearch.results.length).toBeGreaterThan(0);

    const treeRes = readWorkspaceTree(workspaceDir);
    expect(treeRes.ok).toBe(true);
    expect(deleteWorkspacePath(workspaceDir, target).ok).toBe(true);
  });

  it('indexes workspace knowledge safely and retrieves relevant excerpts', () => {
    const manager = new AthenaDataManager(dataDir);
    const kb = new KnowledgeService(manager);
    fs.writeFileSync(
      path.join(workspaceDir, 'guide.md'),
      '# Offline Setup\nUse local Ollama on 127.0.0.1:11434 for offline coding.',
      'utf8'
    );
    fs.writeFileSync(path.join(workspaceDir, '.env'), 'API_KEY=do_not_index', 'utf8');

    const idx = kb.indexWorkspace(workspaceDir);
    expect(idx.ok).toBe(true);
    expect(idx.source?.chunkCount).toBeGreaterThan(0);

    const hits = kb.query('Ollama offline');
    expect(hits.length).toBeGreaterThan(0);
    expect(kb.query('do_not_index')).toHaveLength(0);
  });

  it('manages built-in and custom extensions in athena.data/extensions', () => {
    const manager = new AthenaDataManager(dataDir);
    const extMgr = new ExtensionManager(manager);

    const initial = extMgr.list();
    expect(initial.some((e) => e.id === 'athena.ollama-inline' && e.enabled)).toBe(true);

    const toggled = extMgr.toggle('athena.ollama-inline', false);
    expect(toggled.find((e) => e.id === 'athena.ollama-inline')?.enabled).toBe(false);

    const manifestPath = path.join(tempRoot, 'custom.ext.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({ id: 'user.sample', name: 'Sample Tool', version: '1.0.0' }),
      'utf8'
    );
    const installRes = extMgr.installFromManifestFile(manifestPath);
    expect(installRes.ok).toBe(true);
    expect(extMgr.uninstall('user.sample').ok).toBe(true);
    expect(extMgr.uninstall('athena.ollama-inline').ok).toBe(false);
  });

  it('detects project types, serves static preview on 127.0.0.1, and requires script consent', async () => {
    fs.writeFileSync(path.join(workspaceDir, 'index.html'), '<h1>Hello Athena</h1>', 'utf8');
    const detected = detectProject(workspaceDir);
    expect(detected.projectType).toBe('html-static');
    expect(detected.entryHtml).toBe('index.html');

    const runner = new ProjectRunner();
    const stat = await runner.startStatic(
      workspaceDir,
      () => {},
      () => {}
    );
    expect(stat.running).toBe(true);
    expect(stat.previewUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);

    const htmlRes = await fetch(stat.previewUrl!);
    expect(htmlRes.status).toBe(200);
    expect(await htmlRes.text()).toContain('Hello Athena');

    // Raw HTTP traversal over wire must be rejected with 403
    const parsed = new URL(stat.previewUrl!);
    const rawStatus = await new Promise<number>((resolve, reject) => {
      http
        .get({ hostname: '127.0.0.1', port: Number(parsed.port), path: '/../secret' }, (res) => {
          resolve(res.statusCode ?? 0);
          res.resume();
        })
        .on('error', reject);
    });
    expect(rawStatus).toBe(403);

    await runner.stop();

    const deniedScript = await runner.startScript(
      workspaceDir,
      'dev',
      false,
      () => {},
      () => {}
    );
    expect(deniedScript.running).toBe(false);
    expect(deniedScript.error).toContain('consent');
  });

  it('restricts Ollama connections strictly to loopback hosts', async () => {
    const remoteRes = await checkOllamaAvailability('https://remote-cloud-ai.example.com', 500);
    expect(remoteRes.isAvailable).toBe(false);
    expect(remoteRes.errorMessage).toContain('loopback');
  });
});
