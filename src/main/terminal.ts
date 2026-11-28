import fs from 'fs';
import os from 'os';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { isPathInsideWorkspace } from './security.js';

interface TerminalSession {
  id: string;
  process: ChildProcessWithoutNullStreams;
  cwd: string;
}

export class TerminalManager {
  private sessions = new Map<string, TerminalSession>();

  public createSession(
    workspaceRoot: string | null,
    requestedCwd: string | undefined,
    onData: (sessionId: string, chunk: string) => void,
    onExit: (sessionId: string, code: number | null) => void
  ): { ok: boolean; sessionId?: string; cwd?: string; error?: string } {
    let cwd = workspaceRoot || os.homedir();
    if (requestedCwd && workspaceRoot && isPathInsideWorkspace(workspaceRoot, requestedCwd)) {
      cwd = requestedCwd;
    }

    if (!fs.existsSync(cwd)) {
      cwd = os.homedir();
    }

    const sessionId = `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isWin = process.platform === 'win32';
    const shellExe = isWin ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
    const shellArgs = isWin ? ['-NoLogo', '-NoExit'] : ['-i'];

    try {
      const child = spawn(shellExe, shellArgs, {
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
        },
        stdio: 'pipe',
        windowsHide: true,
      });

      this.sessions.set(sessionId, { id: sessionId, process: child, cwd });

      child.stdout.on('data', (buf: Buffer) => {
        onData(sessionId, buf.toString('utf8'));
      });

      child.stderr.on('data', (buf: Buffer) => {
        onData(sessionId, buf.toString('utf8'));
      });

      child.on('exit', (code) => {
        this.sessions.delete(sessionId);
        onExit(sessionId, code);
      });

      child.on('error', (err) => {
        onData(sessionId, `\r\n[Terminal error: ${err.message}]\r\n`);
      });

      return { ok: true, sessionId, cwd };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to start terminal session',
      };
    }
  }

  public write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.process.killed) return false;
    try {
      session.process.stdin.write(data);
      return true;
    } catch {
      return false;
    }
  }

  public close(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    try {
      session.process.kill();
    } catch {
      // Ignore kill error
    }
    this.sessions.delete(sessionId);
    return true;
  }

  public closeAll(): void {
    for (const id of [...this.sessions.keys()]) {
      this.close(id);
    }
  }
}
