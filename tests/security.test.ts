import { describe, it, expect } from 'vitest';
import path from 'path';
import { isPathInsideWorkspace, isSensitiveFile, isExcludedDirectory } from '../src/main/security.js';

describe('Security & Workspace Sandboxing (M1)', () => {
  const fakeWorkspace = path.resolve('C:/projects/my-nova-app');

  it('allows canonical paths strictly within the workspace', () => {
    const validFile = path.join(fakeWorkspace, 'src', 'index.html');
    const validNested = path.join(fakeWorkspace, 'components', 'button.js');

    expect(isPathInsideWorkspace(fakeWorkspace, validFile)).toBe(true);
    expect(isPathInsideWorkspace(fakeWorkspace, validNested)).toBe(true);
    expect(isPathInsideWorkspace(fakeWorkspace, fakeWorkspace)).toBe(true);
  });

  it('strictly rejects path traversal attempts escaping the workspace', () => {
    const traversalAttempt1 = path.join(fakeWorkspace, '..', 'other-folder', 'secret.txt');
    const traversalAttempt2 = path.join(fakeWorkspace, 'sub', '..', '..', '..', 'Windows', 'System32');
    const absoluteEscape = 'C:\\Windows\\System32\\cmd.exe';

    expect(isPathInsideWorkspace(fakeWorkspace, traversalAttempt1)).toBe(false);
    expect(isPathInsideWorkspace(fakeWorkspace, traversalAttempt2)).toBe(false);
    expect(isPathInsideWorkspace(fakeWorkspace, absoluteEscape)).toBe(false);
  });

  it('rejects empty, null or invalid workspace roots', () => {
    expect(isPathInsideWorkspace('', 'some/path')).toBe(false);
    expect(isPathInsideWorkspace(fakeWorkspace, '')).toBe(false);
  });

  it('correctly detects sensitive files by pattern', () => {
    expect(isSensitiveFile('.env')).toBe(true);
    expect(isSensitiveFile('.env.local')).toBe(true);
    expect(isSensitiveFile('.env.production')).toBe(true);
    expect(isSensitiveFile('server.key')).toBe(true);
    expect(isSensitiveFile('cert.pem')).toBe(true);
    expect(isSensitiveFile('id_rsa')).toBe(true);
    expect(isSensitiveFile('credentials.json')).toBe(true);

    // Safe files should not be flagged
    expect(isSensitiveFile('index.html')).toBe(false);
    expect(isSensitiveFile('styles.css')).toBe(false);
    expect(isSensitiveFile('App.tsx')).toBe(false);
  });

  it('correctly detects excluded directories', () => {
    expect(isExcludedDirectory('.git')).toBe(true);
    expect(isExcludedDirectory('node_modules')).toBe(true);
    expect(isExcludedDirectory('.nova-checkpoints')).toBe(true);
    expect(isExcludedDirectory('dist')).toBe(true);
    expect(isExcludedDirectory('build')).toBe(true);

    // Safe directories
    expect(isExcludedDirectory('src')).toBe(false);
    expect(isExcludedDirectory('public')).toBe(false);
    expect(isExcludedDirectory('assets')).toBe(false);
  });
});
