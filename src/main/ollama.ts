import { ChildProcess, execFile, spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import https from 'https';
import os from 'os';
import path from 'path';
import {
  ModelVerificationResult,
  OllamaChatMessage,
  OllamaEnvironmentStatus,
  OllamaModelInfo,
  OllamaPullProgressEvent,
  OllamaStatus,
} from '../common/types.js';
import { DEFAULT_OLLAMA_ENDPOINT } from '../common/constants.js';

const activeChatRequests = new Map<string, http.ClientRequest>();
const activePullRequests = new Map<string, http.ClientRequest>();
let activeInstallProc: ChildProcess | null = null;
let startedOllamaChild: ChildProcess | null = null;

function assertSafeLocalEndpoint(endpoint: string): URL {
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported protocol for Ollama endpoint');
  }
  const host = url.hostname.toLowerCase();
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    throw new Error(
      `Security policy restricts Ollama endpoint to loopback (127.0.0.1 / localhost), got "${host}"`
    );
  }
  return url;
}

function getLocalJson<T>(url: URL, timeoutMs = 2000): Promise<T | null> {
  const transport = url.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const req = transport.get(
      {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname,
        timeout: timeoutMs,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c.toString('utf8')));
        res.on('end', () => {
          if (res.statusCode !== 200) return resolve(null);
          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => resolve(null));
  });
}

function execSafe(cmd: string, args: string[], timeoutMs = 3000): Promise<{ ok: boolean; stdout: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout) => {
      if (err) resolve({ ok: false, stdout: '' });
      else resolve({ ok: true, stdout: stdout ?? '' });
    });
  });
}

export async function findOllamaExecutable(): Promise<{
  executablePath: string | null;
  version: string | null;
}> {
  const candidates: string[] = [];

  if (process.platform === 'win32') {
    const whereRes = await execSafe('where.exe', ['ollama']);
    if (whereRes.ok && whereRes.stdout.trim()) {
      candidates.push(whereRes.stdout.trim().split(/\r?\n/)[0]!.trim());
    }
    const localApp = process.env.LOCALAPPDATA || '';
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
    candidates.push(
      path.join(localApp, 'Programs', 'Ollama', 'ollama.exe'),
      path.join(localApp, 'Ollama', 'ollama.exe'),
      path.join(progFiles, 'Ollama', 'ollama.exe')
    );
  } else {
    const whichRes = await execSafe('which', ['ollama']);
    if (whichRes.ok && whichRes.stdout.trim()) {
      candidates.push(whichRes.stdout.trim().split(/\r?\n/)[0]!.trim());
    }
    candidates.push(
      '/usr/local/bin/ollama',
      '/opt/homebrew/bin/ollama',
      '/usr/bin/ollama',
      '/Applications/Ollama.app/Contents/Resources/ollama'
    );
  }

  for (const candidate of candidates) {
    if (!candidate || !fs.existsSync(candidate)) continue;
    const verRes = await execSafe(candidate, ['--version']);
    return {
      executablePath: candidate,
      version: verRes.ok ? verRes.stdout.trim() || null : null,
    };
  }

  return { executablePath: null, version: null };
}

export async function findWingetExecutable(): Promise<string | null> {
  if (process.platform !== 'win32') return null;
  const localApp = process.env.LOCALAPPDATA || '';
  const candidate = path.join(localApp, 'Microsoft', 'WindowsApps', 'winget.exe');
  if (fs.existsSync(candidate)) return candidate;
  const whereRes = await execSafe('where.exe', ['winget']);
  if (whereRes.ok && whereRes.stdout.trim()) {
    return whereRes.stdout.trim().split(/\r?\n/)[0]!.trim();
  }
  return null;
}

/**
 * Checks connection to local Ollama instance with timeout.
 * Zero cloud dependency - strictly queries localhost/127.0.0.1.
 */
export async function checkOllamaAvailability(
  endpoint = DEFAULT_OLLAMA_ENDPOINT,
  timeoutMs = 2500
): Promise<OllamaStatus> {
  const startTime = Date.now();

  try {
    const base = assertSafeLocalEndpoint(endpoint);
    const url = new URL('/api/tags', base);
    const transport = url.protocol === 'https:' ? https : http;

    return await new Promise<OllamaStatus>((resolve) => {
      const req = transport.get(
        {
          hostname: url.hostname,
          port: url.port || 11434,
          path: url.pathname,
          timeout: timeoutMs,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', async () => {
            const latencyMs = Date.now() - startTime;
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                const models: OllamaModelInfo[] = (parsed.models || []).map((m: any) => ({
                  name: m.name,
                  size: m.size || 0,
                  modifiedAt: m.modified_at || '',
                  family: m.details?.family,
                  format: m.details?.format,
                  parameterSize: m.details?.parameter_size,
                }));

                const [verRes, psRes] = await Promise.all([
                  getLocalJson<{ version?: string }>(new URL('/api/version', base), 1000),
                  getLocalJson<{ models?: Array<{ name?: string }> }>(new URL('/api/ps', base), 1000),
                ]);

                resolve({
                  isAvailable: true,
                  endpoint,
                  latencyMs,
                  version: verRes?.version,
                  models,
                  runningModels: (psRes?.models ?? []).map((m) => m.name || '').filter(Boolean),
                });
              } catch {
                resolve({
                  isAvailable: false,
                  endpoint,
                  models: [],
                  errorMessage: 'Invalid JSON response from Ollama API',
                });
              }
            } else {
              resolve({
                isAvailable: false,
                endpoint,
                models: [],
                errorMessage: `Ollama returned HTTP status ${res.statusCode}`,
              });
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({
          isAvailable: false,
          endpoint,
          models: [],
          errorMessage: `Connection timed out after ${timeoutMs}ms`,
        });
      });

      req.on('error', (err) => {
        resolve({
          isAvailable: false,
          endpoint,
          models: [],
          errorMessage: `Ollama offline or unreachable: ${err.message}`,
        });
      });
    });
  } catch (err: any) {
    return {
      isAvailable: false,
      endpoint,
      models: [],
      errorMessage: err.message || 'Invalid endpoint configuration',
    };
  }
}

export async function inspectOllamaEnvironment(
  endpoint = DEFAULT_OLLAMA_ENDPOINT,
  timeoutMs = 1200
): Promise<OllamaEnvironmentStatus> {
  const [{ executablePath, version }, apiStatus, wingetExe] = await Promise.all([
    findOllamaExecutable(),
    checkOllamaAvailability(endpoint, timeoutMs),
    findWingetExecutable(),
  ]);

  const modelsDirExists = fs.existsSync(path.join(os.homedir(), '.ollama', 'models'));

  return {
    installed: Boolean(executablePath || apiStatus.isAvailable),
    executablePath,
    executableVersion: version ?? apiStatus.version ?? null,
    running: apiStatus.isAvailable,
    apiReachable: apiStatus.isAvailable,
    endpoint,
    modelsDirExists,
    wingetAvailable: Boolean(wingetExe),
    models: apiStatus.models,
    runningModels: apiStatus.runningModels ?? [],
    error: apiStatus.errorMessage,
  };
}

export async function startOllamaRuntime(
  endpoint = DEFAULT_OLLAMA_ENDPOINT
): Promise<{ ok: boolean; started: boolean; error?: string; status?: OllamaStatus }> {
  const preCheck = await checkOllamaAvailability(endpoint, 1500);
  if (preCheck.isAvailable) {
    return { ok: true, started: false, status: preCheck };
  }

  const { executablePath } = await findOllamaExecutable();
  if (!executablePath) {
    return {
      ok: false,
      started: false,
      error: 'Ollama executable was not found on this machine. Please install Ollama first.',
    };
  }

  if (!startedOllamaChild || startedOllamaChild.killed) {
    try {
      const base = assertSafeLocalEndpoint(endpoint);
      const child = spawn(executablePath, ['serve'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: {
          ...process.env,
          OLLAMA_HOST: `${base.hostname}:${base.port || 11434}`,
        },
      });
      child.unref();
      startedOllamaChild = child;
    } catch (err) {
      return {
        ok: false,
        started: false,
        error: err instanceof Error ? err.message : 'Failed to spawn ollama serve',
      };
    }
  }

  // Poll up to 8 seconds for loopback API readiness
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const status = await checkOllamaAvailability(endpoint, 1200);
    if (status.isAvailable) {
      return { ok: true, started: true, status };
    }
  }

  return {
    ok: false,
    started: false,
    error: `Started "${executablePath} serve", but API at ${endpoint} did not respond within 8 seconds.`,
  };
}

export function stopManagedOllamaIfStarted(): void {
  if (startedOllamaChild && !startedOllamaChild.killed) {
    try {
      startedOllamaChild.kill();
    } catch {
      // Ignore cleanup error
    }
    startedOllamaChild = null;
  }
}

export async function installOllamaViaWinget(
  onLog: (line: string) => void
): Promise<{ ok: boolean; error?: string }> {
  if (activeInstallProc && !activeInstallProc.killed) {
    return { ok: false, error: 'An Ollama installation is already in progress.' };
  }
  const wingetExe = await findWingetExecutable();
  if (!wingetExe) {
    return {
      ok: false,
      error: 'Windows Package Manager (winget) is not available. Please download from https://ollama.com/download.',
    };
  }

  return new Promise((resolve) => {
    const args = [
      'install',
      '-e',
      '--id',
      'Ollama.Ollama',
      '--accept-source-agreements',
      '--accept-package-agreements',
    ];
    onLog(`Running: winget ${args.join(' ')}\n`);

    const proc = spawn(wingetExe, args, {
      stdio: 'pipe',
      windowsHide: true,
    });
    activeInstallProc = proc;

    proc.stdout?.on('data', (buf: Buffer) => onLog(buf.toString('utf8')));
    proc.stderr?.on('data', (buf: Buffer) => onLog(buf.toString('utf8')));
    proc.on('error', (err) => {
      activeInstallProc = null;
      resolve({ ok: false, error: err.message });
    });
    proc.on('exit', (code) => {
      activeInstallProc = null;
      if (code === 0) {
        onLog('\nOllama installation via winget completed.\n');
        resolve({ ok: true });
      } else {
        resolve({ ok: false, error: `winget exited with code ${code ?? 'unknown'}` });
      }
    });
  });
}

export function cancelOllamaInstall(): boolean {
  if (!activeInstallProc || activeInstallProc.killed) return false;
  try {
    activeInstallProc.kill();
    activeInstallProc = null;
    return true;
  } catch {
    return false;
  }
}

export async function verifyOllamaModel(
  model: string,
  endpoint = DEFAULT_OLLAMA_ENDPOINT
): Promise<ModelVerificationResult> {
  if (!model.trim()) {
    return { ok: false, model, error: 'No model selected for verification.' };
  }
  const start = Date.now();
  const status = await checkOllamaAvailability(endpoint, 2500);
  if (!status.isAvailable) {
    return { ok: false, model, error: status.errorMessage || 'Ollama API is not reachable.' };
  }

  const found = status.models.some((m) => m.name === model || m.name.startsWith(`${model}:`));
  if (!found) {
    return {
      ok: false,
      model,
      error: `Model "${model}" is not installed in Ollama yet.`,
    };
  }

  const genRes = await generateOllamaCompletion(
    model,
    'Respond with only the word READY:',
    '',
    endpoint
  );
  const latencyMs = Date.now() - start;

  if (!genRes.ok || !genRes.response.trim()) {
    return {
      ok: false,
      model,
      latencyMs,
      error: genRes.error || 'Model returned an empty inference response.',
    };
  }

  return {
    ok: true,
    model,
    latencyMs,
    sampleOutput: genRes.response.trim().slice(0, 120),
  };
}

export function abortOllamaChat(requestId: string): boolean {
  const req = activeChatRequests.get(requestId);
  if (!req) return false;
  req.destroy();
  activeChatRequests.delete(requestId);
  return true;
}

export function abortOllamaPull(model: string): boolean {
  const req = activePullRequests.get(model);
  if (!req) return false;
  req.destroy();
  activePullRequests.delete(model);
  return true;
}

export async function streamOllamaChat(
  requestId: string,
  model: string,
  messages: OllamaChatMessage[],
  endpoint = DEFAULT_OLLAMA_ENDPOINT,
  onChunk: (delta: string, done: boolean) => void
): Promise<{ ok: boolean; fullText?: string; error?: string }> {
  try {
    const base = assertSafeLocalEndpoint(endpoint);
    const url = new URL('/api/chat', base);
    const payload = JSON.stringify({ model, messages, stream: true });
    const transport = url.protocol === 'https:' ? https : http;

    return await new Promise((resolve) => {
      let fullText = '';
      let buffer = '';

      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || 11434,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            let errBody = '';
            res.on('data', (c) => (errBody += c.toString('utf8')));
            res.on('end', () => {
              activeChatRequests.delete(requestId);
              resolve({
                ok: false,
                error: `Ollama HTTP ${res.statusCode}: ${errBody || 'Request failed'}`,
              });
            });
            return;
          }

          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const parsed = JSON.parse(trimmed) as {
                  message?: { content?: string };
                  done?: boolean;
                  error?: string;
                };
                if (parsed.error) {
                  activeChatRequests.delete(requestId);
                  resolve({ ok: false, error: parsed.error });
                  return;
                }
                const delta = parsed.message?.content ?? '';
                if (delta) {
                  fullText += delta;
                  onChunk(delta, Boolean(parsed.done));
                } else if (parsed.done) {
                  onChunk('', true);
                }
              } catch {
                // Ignore partial NDJSON line
              }
            }
          });

          res.on('end', () => {
            activeChatRequests.delete(requestId);
            onChunk('', true);
            resolve({ ok: true, fullText });
          });
        }
      );

      activeChatRequests.set(requestId, req);

      req.on('error', (err) => {
        activeChatRequests.delete(requestId);
        resolve({
          ok: false,
          fullText,
          error: err.message || 'Ollama chat stream interrupted',
        });
      });

      req.write(payload);
      req.end();
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid Ollama endpoint',
    };
  }
}

export async function generateOllamaCompletion(
  model: string,
  prefix: string,
  suffix = '',
  endpoint = DEFAULT_OLLAMA_ENDPOINT
): Promise<{ ok: boolean; response: string; error?: string }> {
  try {
    const base = assertSafeLocalEndpoint(endpoint);
    const url = new URL('/api/generate', base);
    const prompt = suffix ? `<PRE> ${prefix} <SUF>${suffix} <MID>` : prefix;
    const payload = JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.15, num_predict: 96, stop: ['\n\n', '<EOT>'] },
    });
    const transport = url.protocol === 'https:' ? https : http;

    return await new Promise((resolve) => {
      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || 11434,
          path: url.pathname,
          method: 'POST',
          timeout: 25000,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c.toString('utf8')));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              resolve({ ok: false, response: '', error: `HTTP ${res.statusCode}: ${raw}` });
              return;
            }
            try {
              const parsed = JSON.parse(raw) as { response?: string; error?: string };
              if (parsed.error) {
                resolve({ ok: false, response: '', error: parsed.error });
              } else {
                resolve({ ok: true, response: parsed.response ?? '' });
              }
            } catch {
              resolve({ ok: false, response: '', error: 'Invalid JSON from Ollama' });
            }
          });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, response: '', error: 'Completion timed out' });
      });
      req.on('error', (err) => resolve({ ok: false, response: '', error: err.message }));
      req.write(payload);
      req.end();
    });
  } catch (err) {
    return {
      ok: false,
      response: '',
      error: err instanceof Error ? err.message : 'Invalid Ollama endpoint',
    };
  }
}

export async function pullOllamaModel(
  model: string,
  endpoint = DEFAULT_OLLAMA_ENDPOINT,
  onProgress: (ev: OllamaPullProgressEvent) => void
): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = assertSafeLocalEndpoint(endpoint);
    const url = new URL('/api/pull', base);
    const payload = JSON.stringify({ model, stream: true });
    const transport = url.protocol === 'https:' ? https : http;

    return await new Promise((resolve) => {
      let buffer = '';
      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || 11434,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            activePullRequests.delete(model);
            resolve({ ok: false, error: `Ollama pull returned HTTP ${res.statusCode}` });
            return;
          }
          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const parsed = JSON.parse(trimmed) as {
                  status?: string;
                  completed?: number;
                  total?: number;
                  error?: string;
                };
                if (parsed.error) {
                  activePullRequests.delete(model);
                  onProgress({ model, status: 'error', done: true, error: parsed.error });
                  resolve({ ok: false, error: parsed.error });
                  return;
                }
                onProgress({
                  model,
                  status: parsed.status ?? 'downloading',
                  completed: parsed.completed,
                  total: parsed.total,
                  done: false,
                });
              } catch {
                // Ignore partial line
              }
            }
          });
          res.on('end', () => {
            activePullRequests.delete(model);
            onProgress({ model, status: 'success', done: true });
            resolve({ ok: true });
          });
        }
      );

      activePullRequests.set(model, req);

      req.on('error', (err) => {
        activePullRequests.delete(model);
        onProgress({ model, status: 'canceled', done: true, error: err.message });
        resolve({ ok: false, error: err.message });
      });
      req.write(payload);
      req.end();
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid endpoint' };
  }
}

export async function deleteOllamaModel(
  model: string,
  endpoint = DEFAULT_OLLAMA_ENDPOINT
): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = assertSafeLocalEndpoint(endpoint);
    const url = new URL('/api/delete', base);
    const payload = JSON.stringify({ model });
    const transport = url.protocol === 'https:' ? https : http;

    return await new Promise((resolve) => {
      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || 11434,
          path: url.pathname,
          method: 'DELETE',
          timeout: 8000,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          if (res.statusCode === 200) {
            resolve({ ok: true });
          } else {
            resolve({ ok: false, error: `Ollama delete returned HTTP ${res.statusCode}` });
          }
        }
      );
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.write(payload);
      req.end();
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid endpoint' };
  }
}
