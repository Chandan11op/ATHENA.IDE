import fs from 'fs';
import http from 'http';
import path from 'path';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { ProjectDetectionResult, RunnerStatus } from '../common/types.js';
import { isPathInsideWorkspace } from './security.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

export function detectProject(workspaceRoot: string | null): ProjectDetectionResult {
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
    return {
      projectType: 'unknown',
      hasPackageJson: false,
      scripts: [],
      entryHtml: null,
      recommendedCommand: null,
    };
  }

  const pkgPath = path.join(workspaceRoot, 'package.json');
  const htmlPath = path.join(workspaceRoot, 'index.html');
  const hasHtml = fs.existsSync(htmlPath);

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const scripts = Object.keys(pkg.scripts ?? {});
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const isViteOrReact = Boolean(allDeps.vite || allDeps.react);
      const recommended = scripts.includes('dev')
        ? 'dev'
        : scripts.includes('start')
        ? 'start'
        : null;

      return {
        projectType: isViteOrReact ? 'vite-react' : 'node',
        hasPackageJson: true,
        scripts,
        entryHtml: hasHtml ? 'index.html' : null,
        recommendedCommand: recommended,
      };
    } catch {
      // Fall through to static check
    }
  }

  if (hasHtml) {
    return {
      projectType: 'html-static',
      hasPackageJson: false,
      scripts: [],
      entryHtml: 'index.html',
      recommendedCommand: 'static-preview',
    };
  }

  return {
    projectType: 'unknown',
    hasPackageJson: false,
    scripts: [],
    entryHtml: null,
    recommendedCommand: null,
  };
}

export class ProjectRunner {
  private staticServer: http.Server | null = null;
  private childProcess: ChildProcessWithoutNullStreams | null = null;
  private status: RunnerStatus = {
    running: false,
    mode: null,
    previewUrl: null,
    command: null,
  };

  public getStatus(): RunnerStatus {
    return { ...this.status };
  }

  public async startStatic(
    workspaceRoot: string,
    onOutput: (stream: 'stdout' | 'stderr' | 'system', text: string) => void,
    onStatus: (status: RunnerStatus) => void
  ): Promise<RunnerStatus> {
    await this.stop(onStatus);

    if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
      const errStatus: RunnerStatus = {
        running: false,
        mode: null,
        previewUrl: null,
        command: null,
        error: 'No valid workspace opened.',
      };
      this.status = errStatus;
      onStatus(errStatus);
      return errStatus;
    }

    return new Promise((resolve) => {
      const server = http.createServer((req, res) => {
        const rawUrl = (req.url || '/').split('?')[0] || '/';
        let decoded: string;
        try {
          decoded = decodeURIComponent(rawUrl.replace(/^\/+/, ''));
        } catch {
          res.writeHead(400);
          res.end('Bad request');
          return;
        }
        const relPath = rawUrl === '/' ? 'index.html' : decoded;
        const absFile = path.resolve(workspaceRoot, relPath);

        if (!isPathInsideWorkspace(workspaceRoot, absFile)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        let target = absFile;
        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
          target = path.join(target, 'index.html');
        }

        if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const ext = path.extname(target).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        fs.createReadStream(target).pipe(res);
      });

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        const previewUrl = `http://127.0.0.1:${port}/`;
        this.staticServer = server;
        this.status = {
          running: true,
          mode: 'static',
          previewUrl,
          command: 'Static Local Preview',
        };
        onOutput('system', `[Preview] Serving ${workspaceRoot} at ${previewUrl}\n`);
        onStatus(this.status);
        resolve(this.status);
      });

      server.on('error', (err) => {
        const errStatus: RunnerStatus = {
          running: false,
          mode: null,
          previewUrl: null,
          command: null,
          error: err.message,
        };
        this.status = errStatus;
        onStatus(errStatus);
        resolve(errStatus);
      });
    });
  }

  public async startScript(
    workspaceRoot: string,
    scriptName: string,
    consentGranted: boolean,
    onOutput: (stream: 'stdout' | 'stderr' | 'system', text: string) => void,
    onStatus: (status: RunnerStatus) => void
  ): Promise<RunnerStatus> {
    if (!consentGranted) {
      return {
        running: false,
        mode: null,
        previewUrl: null,
        command: null,
        error: 'Explicit user consent is required before executing project scripts.',
      };
    }

    const detection = detectProject(workspaceRoot);
    if (!detection.scripts.includes(scriptName)) {
      return {
        running: false,
        mode: null,
        previewUrl: null,
        command: null,
        error: `Script "${scriptName}" not found in workspace package.json.`,
      };
    }

    await this.stop(onStatus);

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['run', scriptName], {
      cwd: workspaceRoot,
      stdio: 'pipe',
      windowsHide: true,
    });

    this.childProcess = child;
    this.status = {
      running: true,
      mode: 'script',
      previewUrl: null,
      command: `npm run ${scriptName}`,
      pid: child.pid,
    };
    onOutput('system', `[Runner] Started: npm run ${scriptName} (PID ${child.pid ?? '?'})\n`);
    onStatus(this.status);

    const inspectUrls = (text: string) => {
      const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d{2,5})\/?/i);
      if (match && !this.status.previewUrl) {
        this.status = { ...this.status, previewUrl: match[0] };
        onStatus(this.status);
      }
    };

    child.stdout.on('data', (buf: Buffer) => {
      const text = buf.toString('utf8');
      inspectUrls(text);
      onOutput('stdout', text);
    });

    child.stderr.on('data', (buf: Buffer) => {
      const text = buf.toString('utf8');
      inspectUrls(text);
      onOutput('stderr', text);
    });

    child.on('exit', (code) => {
      this.childProcess = null;
      this.status = {
        running: false,
        mode: null,
        previewUrl: null,
        command: null,
      };
      onOutput('system', `\n[Runner] Process exited with code ${code ?? 'null'}\n`);
      onStatus(this.status);
    });

    return this.status;
  }

  public async stop(onStatus?: (status: RunnerStatus) => void): Promise<RunnerStatus> {
    if (this.staticServer) {
      await new Promise<void>((resolve) => {
        this.staticServer?.close(() => resolve());
      });
      this.staticServer = null;
    }

    if (this.childProcess) {
      try {
        if (process.platform === 'win32' && this.childProcess.pid) {
          spawn('taskkill', ['/pid', String(this.childProcess.pid), '/f', '/t'], {
            windowsHide: true,
          });
        } else {
          this.childProcess.kill('SIGTERM');
        }
      } catch {
        // Ignore kill error
      }
      this.childProcess = null;
    }

    this.status = {
      running: false,
      mode: null,
      previewUrl: null,
      command: null,
    };
    onStatus?.(this.status);
    return this.status;
  }
}
