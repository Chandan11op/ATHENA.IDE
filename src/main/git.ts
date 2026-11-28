import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  GitBranchInfo,
  GitCommitEntry,
  GitFileChange,
  GitStatusSummary,
} from '../common/types.js';
import { isPathInsideWorkspace } from './security.js';

function runGit(
  args: string[],
  cwd: string,
  timeoutMs = 15000
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      'git',
      args,
      { cwd, timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          resolve({
            ok: false,
            stdout: stdout ?? '',
            stderr: stderr || err.message,
          });
        } else {
          resolve({ ok: true, stdout: stdout ?? '', stderr: stderr ?? '' });
        }
      }
    );
  });
}

async function isGitInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('git', ['--version'], { timeout: 3000, windowsHide: true }, (err) => {
      resolve(!err);
    });
  });
}

function mapStatusCode(code: string): GitFileChange['status'] {
  if (code.includes('?')) return 'untracked';
  if (code.includes('U')) return 'conflicted';
  if (code.includes('A')) return 'added';
  if (code.includes('D')) return 'deleted';
  if (code.includes('R')) return 'renamed';
  return 'modified';
}

export async function getGitStatus(workspaceRoot: string | null): Promise<GitStatusSummary> {
  const gitInstalled = await isGitInstalled();
  if (!gitInstalled) {
    return {
      gitInstalled: false,
      isRepo: false,
      branch: null,
      ahead: 0,
      behind: 0,
      remoteUrl: null,
      changes: [],
      error: 'Git CLI is not installed or not found in PATH.',
    };
  }

  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
    return {
      gitInstalled: true,
      isRepo: false,
      branch: null,
      ahead: 0,
      behind: 0,
      remoteUrl: null,
      changes: [],
      error: 'No workspace directory opened.',
    };
  }

  const checkRepo = await runGit(['rev-parse', '--is-inside-work-tree'], workspaceRoot);
  if (!checkRepo.ok || checkRepo.stdout.trim() !== 'true') {
    return {
      gitInstalled: true,
      isRepo: false,
      branch: null,
      ahead: 0,
      behind: 0,
      remoteUrl: null,
      changes: [],
    };
  }

  const statusRes = await runGit(['status', '--porcelain=v1', '-b'], workspaceRoot);
  const remoteRes = await runGit(['remote', 'get-url', 'origin'], workspaceRoot);
  const lines = statusRes.stdout.split(/\r?\n/).filter(Boolean);

  let branch: string | null = null;
  let ahead = 0;
  let behind = 0;
  const changes: GitFileChange[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const header = line.slice(3);
      const branchMatch = header.match(/^([^\s.]+)/);
      branch = branchMatch ? branchMatch[1] : null;
      const aheadMatch = header.match(/ahead (\d+)/);
      const behindMatch = header.match(/behind (\d+)/);
      if (aheadMatch) ahead = Number(aheadMatch[1]);
      if (behindMatch) behind = Number(behindMatch[1]);
      continue;
    }

    const indexCode = line[0] ?? ' ';
    const workCode = line[1] ?? ' ';
    const filePath = line.slice(3).trim();
    if (!filePath) continue;

    if (indexCode !== ' ' && indexCode !== '?') {
      changes.push({
        path: filePath,
        status: mapStatusCode(indexCode),
        staged: true,
        rawCode: `${indexCode}${workCode}`,
      });
    }
    if (workCode !== ' ') {
      changes.push({
        path: filePath,
        status: mapStatusCode(workCode),
        staged: false,
        rawCode: `${indexCode}${workCode}`,
      });
    }
  }

  return {
    gitInstalled: true,
    isRepo: true,
    branch,
    ahead,
    behind,
    remoteUrl: remoteRes.ok ? remoteRes.stdout.trim() : null,
    changes,
  };
}

export async function getGitDiff(
  workspaceRoot: string,
  filePath?: string,
  staged = false
): Promise<{ ok: boolean; diff: string; error?: string }> {
  const args = ['diff'];
  if (staged) args.push('--cached');
  if (filePath) {
    const abs = path.resolve(workspaceRoot, filePath);
    if (!isPathInsideWorkspace(workspaceRoot, abs)) {
      return { ok: false, diff: '', error: 'Path outside workspace boundary' };
    }
    args.push('--', filePath);
  }
  const res = await runGit(args, workspaceRoot);
  return { ok: res.ok, diff: res.stdout, error: res.ok ? undefined : res.stderr };
}

export async function stageGitFiles(
  workspaceRoot: string,
  paths: string[]
): Promise<{ ok: boolean; error?: string }> {
  const cleanPaths = paths.filter((p) => isPathInsideWorkspace(workspaceRoot, path.resolve(workspaceRoot, p)));
  if (cleanPaths.length === 0) return { ok: false, error: 'No valid workspace paths specified' };
  const res = await runGit(['add', '--', ...cleanPaths], workspaceRoot);
  return { ok: res.ok, error: res.ok ? undefined : res.stderr };
}

export async function unstageGitFiles(
  workspaceRoot: string,
  paths: string[]
): Promise<{ ok: boolean; error?: string }> {
  const cleanPaths = paths.filter((p) => isPathInsideWorkspace(workspaceRoot, path.resolve(workspaceRoot, p)));
  if (cleanPaths.length === 0) return { ok: false, error: 'No valid workspace paths specified' };
  const res = await runGit(['restore', '--staged', '--', ...cleanPaths], workspaceRoot);
  return { ok: res.ok, error: res.ok ? undefined : res.stderr };
}

export async function commitGit(
  workspaceRoot: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, error: 'Commit message cannot be empty' };
  const res = await runGit(['commit', '-m', trimmed], workspaceRoot);
  return { ok: res.ok, error: res.ok ? undefined : res.stderr };
}

export async function listGitBranches(
  workspaceRoot: string
): Promise<{ ok: boolean; branches: GitBranchInfo[]; error?: string }> {
  const res = await runGit(['branch', '--no-color'], workspaceRoot);
  if (!res.ok) return { ok: false, branches: [], error: res.stderr };
  const branches: GitBranchInfo[] = res.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      current: line.startsWith('* '),
      name: line.replace(/^\*?\s+/, '').trim(),
    }));
  return { ok: true, branches };
}

export async function checkoutGitBranch(
  workspaceRoot: string,
  branch: string
): Promise<{ ok: boolean; error?: string }> {
  if (!branch || branch.startsWith('-')) return { ok: false, error: 'Invalid branch name' };
  const res = await runGit(['checkout', branch], workspaceRoot);
  return { ok: res.ok, error: res.ok ? undefined : res.stderr };
}

export async function createGitBranch(
  workspaceRoot: string,
  branch: string
): Promise<{ ok: boolean; error?: string }> {
  if (!branch || branch.startsWith('-') || /\s/.test(branch)) {
    return { ok: false, error: 'Invalid branch name' };
  }
  const res = await runGit(['checkout', '-b', branch], workspaceRoot);
  return { ok: res.ok, error: res.ok ? undefined : res.stderr };
}

export async function getGitLog(
  workspaceRoot: string,
  limit = 15
): Promise<{ ok: boolean; commits: GitCommitEntry[]; error?: string }> {
  const res = await runGit(
    ['log', `-${Math.min(50, Math.max(1, limit))}`, '--pretty=format:%H|%h|%an|%ad|%s', '--date=short'],
    workspaceRoot
  );
  if (!res.ok) return { ok: false, commits: [], error: res.stderr };
  const commits = res.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [hash = '', shortHash = '', author = '', date = '', ...rest] = line.split('|');
      return { hash, shortHash, author, date, message: rest.join('|') };
    });
  return { ok: true, commits };
}

export async function pullGit(workspaceRoot: string): Promise<{ ok: boolean; output?: string; error?: string }> {
  const res = await runGit(['pull'], workspaceRoot, 30000);
  return { ok: res.ok, output: res.stdout, error: res.ok ? undefined : res.stderr };
}

export async function pushGit(workspaceRoot: string): Promise<{ ok: boolean; output?: string; error?: string }> {
  const res = await runGit(['push'], workspaceRoot, 30000);
  return { ok: res.ok, output: res.stdout, error: res.ok ? undefined : res.stderr };
}

export async function fetchGit(workspaceRoot: string): Promise<{ ok: boolean; output?: string; error?: string }> {
  const res = await runGit(['fetch'], workspaceRoot, 30000);
  return { ok: res.ok, output: res.stdout, error: res.ok ? undefined : res.stderr };
}

export async function cloneGitRepo(
  repoUrl: string,
  parentDir: string
): Promise<{ ok: boolean; targetDir?: string; error?: string }> {
  try {
    const parsed = new URL(repoUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { ok: false, error: 'Only HTTP/HTTPS clone URLs are permitted' };
    }
  } catch {
    return { ok: false, error: 'Invalid repository URL' };
  }

  const repoName = path.basename(repoUrl.replace(/\.git$/i, '')) || 'cloned-repo';
  const targetDir = path.join(parentDir, repoName);
  const res = await runGit(['clone', repoUrl, targetDir], parentDir, 60000);
  return {
    ok: res.ok,
    targetDir: res.ok ? targetDir : undefined,
    error: res.ok ? undefined : res.stderr,
  };
}
