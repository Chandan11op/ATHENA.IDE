import http from 'http';
import https from 'https';
import {
  OllamaChatMessage,
  OllamaModelInfo,
  OllamaPullProgressEvent,
  OllamaStatus,
} from '../common/types.js';
import { DEFAULT_OLLAMA_ENDPOINT } from '../common/constants.js';

const activeChatRequests = new Map<string, http.ClientRequest>();

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

          res.on('end', () => {
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

                resolve({
                  isAvailable: true,
                  endpoint,
                  latencyMs,
                  models,
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

export function abortOllamaChat(requestId: string): boolean {
  const req = activeChatRequests.get(requestId);
  if (!req) return false;
  req.destroy();
  activeChatRequests.delete(requestId);
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
          timeout: 12000,
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
              resolve({ ok: false, response: '', error: `HTTP ${res.statusCode}` });
              return;
            }
            try {
              const parsed = JSON.parse(raw) as { response?: string };
              resolve({ ok: true, response: parsed.response ?? '' });
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
            onProgress({ model, status: 'success', done: true });
            resolve({ ok: true });
          });
        }
      );
      req.on('error', (err) => {
        onProgress({ model, status: 'error', done: true, error: err.message });
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
