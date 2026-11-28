import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/common/constants.js';
import { AthenaDataManager } from '../src/main/athenaData.js';
import { assessHardware, runReadinessDiagnostics } from '../src/main/diagnostics.js';
import { KnowledgeService } from '../src/main/knowledge.js';
import {
  checkOllamaAvailability,
  generateOllamaCompletion,
  inspectOllamaEnvironment,
  pullOllamaModel,
  startOllamaRuntime,
  streamOllamaChat,
  verifyOllamaModel,
} from '../src/main/ollama.js';

describe('Offline AI Bootstrap, Ollama Provisioning & Readiness Diagnostics', () => {
  let tempRoot: string;
  let dataDir: string;
  let workspaceDir: string;
  let mockServer: http.Server | null = null;
  let mockEndpoint = '';

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'athena-boot-'));
    dataDir = path.join(tempRoot, 'athena.data');
    workspaceDir = path.join(tempRoot, 'workspace');
    fs.mkdirSync(workspaceDir, { recursive: true });
  });

  afterEach(async () => {
    if (mockServer) {
      await new Promise<void>((resolve) => mockServer?.close(() => resolve()));
      mockServer = null;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  async function startMockOllamaServer(): Promise<string> {
    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c.toString('utf8')));
      req.on('end', () => {
        if (req.url === '/api/tags') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              models: [
                {
                  name: 'qwen2.5-coder:1.5b',
                  size: 1_000_000_000,
                  modified_at: '2026-11-28T00:00:00Z',
                  details: { family: 'qwen2', parameter_size: '1.5B' },
                },
              ],
            })
          );
          return;
        }
        if (req.url === '/api/version') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ version: '0.6.0-test' }));
          return;
        }
        if (req.url === '/api/ps') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ models: [{ name: 'qwen2.5-coder:1.5b' }] }));
          return;
        }
        if (req.url === '/api/generate') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ response: 'READY' }));
          return;
        }
        if (req.url === '/api/chat') {
          res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
          res.write(JSON.stringify({ message: { content: 'function add(a, b) ' }, done: false }) + '\n');
          res.write(JSON.stringify({ message: { content: '{ return a + b; }' }, done: true }) + '\n');
          res.end();
          return;
        }
        if (req.url === '/api/pull') {
          res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
          res.write(JSON.stringify({ status: 'pulling manifest', completed: 50, total: 100 }) + '\n');
          res.write(JSON.stringify({ status: 'success', completed: 100, total: 100 }) + '\n');
          res.end();
          return;
        }
        res.writeHead(404);
        res.end();
      });
    });

    await new Promise<void>((resolve) => {
      mockServer!.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = mockServer.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    mockEndpoint = `http://127.0.0.1:${port}`;
    return mockEndpoint;
  }

  it('initializes athena.data config, setup-state persistence, and recovers cleanly', () => {
    const manager = new AthenaDataManager(dataDir);
    const report = manager.initAndVerifyDataDir({
      ...DEFAULT_SETTINGS,
      selectedModel: 'qwen2.5-coder:1.5b',
    });

    expect(report.ok).toBe(true);
    expect(report.writable).toBe(true);
    expect(fs.existsSync(path.join(dataDir, 'config', 'config.json'))).toBe(true);
    expect(fs.existsSync(path.join(dataDir, 'setup', 'setup-state.json'))).toBe(true);
    expect(fs.existsSync(path.join(dataDir, 'knowledge', 'manifests'))).toBe(true);

    manager.updateSetupState({
      skippedAiSetup: true,
      modelVerified: {
        status: 'verified',
        modelId: 'qwen2.5-coder:1.5b',
        testLatencyMs: 42,
        sampleOutput: 'READY',
        updatedAt: new Date().toISOString(),
      },
    });

    const reloaded = new AthenaDataManager(dataDir);
    const state = reloaded.getSetupState();
    expect(state.skippedAiSetup).toBe(true);
    expect(state.modelVerified.status).toBe('verified');
    expect(state.modelVerified.modelId).toBe('qwen2.5-coder:1.5b');
  });

  it('detects live loopback Ollama API, streams chat, pulls models, and verifies inference', async () => {
    const endpoint = await startMockOllamaServer();

    const status = await checkOllamaAvailability(endpoint);
    expect(status.isAvailable).toBe(true);
    expect(status.version).toBe('0.6.0-test');
    expect(status.models[0]?.name).toBe('qwen2.5-coder:1.5b');
    expect(status.runningModels).toContain('qwen2.5-coder:1.5b');

    const env = await inspectOllamaEnvironment(endpoint);
    expect(env.apiReachable).toBe(true);
    expect(env.installed).toBe(true);

    const startRes = await startOllamaRuntime(endpoint);
    expect(startRes.ok).toBe(true);

    const verify = await verifyOllamaModel('qwen2.5-coder:1.5b', endpoint);
    expect(verify.ok).toBe(true);
    expect(verify.sampleOutput).toBe('READY');

    const gen = await generateOllamaCompletion('qwen2.5-coder:1.5b', 'const x =', '', endpoint);
    expect(gen.ok).toBe(true);
    expect(gen.response).toBe('READY');

    const chunks: string[] = [];
    const chatRes = await streamOllamaChat(
      'req-1',
      'qwen2.5-coder:1.5b',
      [{ role: 'user', content: 'Write add' }],
      endpoint,
      (delta) => {
        if (delta) chunks.push(delta);
      }
    );
    expect(chatRes.ok).toBe(true);
    expect(chunks.join('')).toContain('return a + b');

    const progressEvents: string[] = [];
    const pullRes = await pullOllamaModel('qwen2.5-coder:1.5b', endpoint, (ev) => {
      progressEvents.push(ev.status);
    });
    expect(pullRes.ok).toBe(true);
    expect(progressEvents).toContain('pulling manifest');
    expect(progressEvents).toContain('success');
  });

  it('assesses hardware, seeds initial knowledge pack, and reports accurate offline readiness states', async () => {
    const manager = new AthenaDataManager(dataDir);
    const kb = new KnowledgeService(manager);
    const hw = await assessHardware(dataDir);
    expect(hw.totalRamBytes).toBeGreaterThan(0);
    expect(hw.cpuCores).toBeGreaterThan(0);

    const seedRes = kb.seedInitialPack();
    expect(seedRes.ok).toBe(true);
    expect(seedRes.added.length).toBeGreaterThanOrEqual(4);
    expect(kb.query('loopback 11434').length).toBeGreaterThan(0);

    // Unreachable endpoint reports runtime_unavailable / not_configured
    const offlineDiag = await runReadinessDiagnostics(
      manager,
      { ...DEFAULT_SETTINGS, ollamaEndpoint: 'http://127.0.0.1:59999', workspacePath: workspaceDir },
      kb
    );
    expect(['not_configured', 'runtime_unavailable']).toContain(offlineDiag.state);

    // Connected + verified model + workspace reports offline_ready
    const endpoint = await startMockOllamaServer();
    manager.updateSetupState({
      modelVerified: {
        status: 'verified',
        modelId: 'qwen2.5-coder:1.5b',
        testLatencyMs: 12,
        sampleOutput: 'READY',
        updatedAt: new Date().toISOString(),
      },
    });
    const readyDiag = await runReadinessDiagnostics(
      manager,
      {
        ...DEFAULT_SETTINGS,
        ollamaEndpoint: endpoint,
        selectedModel: 'qwen2.5-coder:1.5b',
        workspacePath: workspaceDir,
      },
      kb
    );
    expect(readyDiag.state).toBe('offline_ready');
    expect(readyDiag.checks.find((c) => c.id === 'model-verified')?.status).toBe('passed');
    expect(readyDiag.checks.find((c) => c.id === 'offline-disconnect')?.status).toBe('not_tested');
  }, 15000);
});
