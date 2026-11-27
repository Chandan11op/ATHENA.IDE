import http from 'http';
import { OllamaModelInfo, OllamaStatus } from '../common/types.js';
import { DEFAULT_OLLAMA_ENDPOINT } from '../common/constants.js';

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
    const url = new URL('/api/tags', endpoint);

    return await new Promise<OllamaStatus>((resolve) => {
      const req = http.get(
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
              } catch (parseErr) {
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
