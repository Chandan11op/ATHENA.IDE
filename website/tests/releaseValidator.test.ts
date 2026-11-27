import { describe, it, expect } from 'vitest';
import {
  isValidGitHubHttpsUrl,
  sanitizeTag,
  validateGitHubAsset,
  validateGitHubRelease,
  validateGitHubReleaseList,
} from '../src/backend/validators/releaseValidator.js';

describe('releaseValidator', () => {
  it('accepts official GitHub HTTPS URLs and rejects unsafe or external URLs', () => {
    expect(isValidGitHubHttpsUrl('https://github.com/Chandan11op/ATHENA.IDE/releases/tag/v0.1.0')).toBe(true);
    expect(
      isValidGitHubHttpsUrl('https://objects.githubusercontent.com/github-production-release-asset-123/installer.exe')
    ).toBe(true);
    expect(isValidGitHubHttpsUrl('https://release-assets.githubusercontent.com/file.dmg')).toBe(true);

    expect(isValidGitHubHttpsUrl('http://github.com/Chandan11op/ATHENA.IDE/releases')).toBe(false);
    expect(isValidGitHubHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isValidGitHubHttpsUrl('data:text/html,hi')).toBe(false);
    expect(isValidGitHubHttpsUrl('https://evil.example.com/athena.exe')).toBe(false);
    expect(isValidGitHubHttpsUrl('')).toBe(false);
  });

  it('sanitizes valid tags and rejects traversal or invalid characters', () => {
    expect(sanitizeTag('v0.1.0')).toBe('v0.1.0');
    expect(sanitizeTag(' desktop/v1.2.0-rc.1 ')).toBe('desktop/v1.2.0-rc.1');

    expect(sanitizeTag('')).toBeNull();
    expect(sanitizeTag('   ')).toBeNull();
    expect(sanitizeTag('../etc/passwd')).toBeNull();
    expect(sanitizeTag('v1.0.0?foo=bar')).toBeNull();
    expect(sanitizeTag('v1.0.0#frag')).toBeNull();
    expect(sanitizeTag('v1.0.0\\win')).toBeNull();
  });

  it('filters out malformed assets while preserving valid ones on a release', () => {
    const validAsset = {
      id: 101,
      name: 'Athena.IDE-Setup-0.1.0-x64.exe',
      browser_download_url: 'https://github.com/Chandan11op/ATHENA.IDE/releases/download/v0.1.0/Athena.IDE-Setup-0.1.0-x64.exe',
      size: 95000000,
      content_type: 'application/octet-stream',
      state: 'uploaded',
      updated_at: '2026-11-01T10:00:00Z',
    };

    const badAsset = {
      id: 102,
      name: 'malicious.exe',
      browser_download_url: 'https://untrusted.example.com/malicious.exe',
      size: 100,
    };

    expect(validateGitHubAsset(validAsset)).not.toBeNull();
    expect(validateGitHubAsset(badAsset)).toBeNull();

    const release = validateGitHubRelease({
      id: 1,
      tag_name: 'v0.1.0',
      name: 'Athena.IDE v0.1.0',
      body: 'Initial release',
      draft: false,
      prerelease: false,
      created_at: '2026-11-01T09:00:00Z',
      published_at: '2026-11-01T10:00:00Z',
      html_url: 'https://github.com/Chandan11op/ATHENA.IDE/releases/tag/v0.1.0',
      assets: [validAsset, badAsset],
    });

    expect(release).not.toBeNull();
    expect(release?.assets).toHaveLength(1);
    expect(release?.assets[0]?.id).toBe(101);
  });

  it('rejects invalid release list payloads and malformed release objects', () => {
    expect(validateGitHubReleaseList(null)).toBeNull();
    expect(validateGitHubReleaseList({ message: 'Not Found' })).toBeNull();
    expect(validateGitHubReleaseList([])).toEqual([]);
    expect(validateGitHubRelease({ id: -1, tag_name: 'v1' })).toBeNull();
  });
});

