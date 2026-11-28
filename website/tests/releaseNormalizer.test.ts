import { describe, it, expect } from 'vitest';
import {
  extractDescriptionFromBody,
  extractSigningInfo,
  normalizeRelease,
  normalizeVersionFromTag,
} from '../src/backend/adapters/releaseNormalizer.js';
import type { RawGitHubReleaseDto } from '../src/backend/types/release.js';

describe('releaseNormalizer', () => {
  it('extracts clean version strings from release tags', () => {
    expect(normalizeVersionFromTag('v0.1.0')).toBe('0.1.0');
    expect(normalizeVersionFromTag('V1.4.2-beta.1')).toBe('1.4.2-beta.1');
    expect(normalizeVersionFromTag('2.0.0')).toBe('2.0.0');
    expect(normalizeVersionFromTag('nightly')).toBe('nightly');
  });

  it('extracts concise description without fabricating missing notes', () => {
    expect(extractDescriptionFromBody('')).toBe('');
    expect(
      extractDescriptionFromBody('# Release Notes\n\nFirst stable **Athena.IDE** release with [docs](https://example.com).\n\n- Added feature')
    ).toBe('First stable Athena.IDE release with docs.');
  });

  it('normalizes a GitHub release DTO into application Release with compatibility and checksums', () => {
    const sha256 = 'c'.repeat(64);
    const dto: RawGitHubReleaseDto = {
      id: 42,
      tag_name: 'v0.2.0',
      name: 'Athena.IDE 0.2.0',
      body: `## What's New\n\nFaster local workspace indexing.\n\n${sha256}  Athena.IDE-0.2.0-x64.exe`,
      draft: false,
      prerelease: false,
      created_at: '2026-11-10T08:00:00Z',
      published_at: '2026-11-10T09:00:00Z',
      html_url: 'https://github.com/Chandan11op/ATHENA.IDE/releases/tag/v0.2.0',
      assets: [
        {
          id: 1,
          name: 'Athena.IDE-0.2.0-x64.exe',
          browser_download_url: 'https://github.com/Chandan11op/ATHENA.IDE/releases/download/v0.2.0/Athena.IDE-0.2.0-x64.exe',
          size: 102400,
          content_type: 'application/vnd.microsoft.portable-executable',
          state: 'uploaded',
          updated_at: '2026-11-10T09:05:00Z',
        },
        {
          id: 2,
          name: 'Athena.IDE-0.2.0-arm64.dmg',
          browser_download_url: 'https://github.com/Chandan11op/ATHENA.IDE/releases/download/v0.2.0/Athena.IDE-0.2.0-arm64.dmg',
          size: 204800,
          content_type: 'application/x-apple-diskimage',
          state: 'starter',
          updated_at: null,
        },
      ],
    };

    const normalized = normalizeRelease(dto);
    expect(normalized.version).toBe('0.2.0');
    expect(normalized.channel).toBe('stable');
    expect(normalized.description).toBe('Faster local workspace indexing.');
    expect(normalized.assets[0]?.checksum).toBe(sha256);
    expect(normalized.assets[0]?.checksumType).toBe('sha256');
    expect(normalized.assets[0]?.isAvailable).toBe(true);
    expect(normalized.assets[1]?.isAvailable).toBe(false);
    expect(normalized.compatibility).toEqual({
      supportedPlatforms: ['Windows'],
      supportedArchitectures: ['x64'],
      hasInstallers: true,
    });
    expect(normalized.signing).toEqual({
      status: 'unsigned',
      publisher: null,
      issuer: null,
      timestamped: false,
      smartAppControlCompatible: false,
    });
  });

  it('never marks an unsigned release as Verified Publisher even if notes mention certificates', () => {
    const unsignedNotes = [
      'Digital Signature: Verified',
      'Publisher: SignPath Foundation',
      '- **Unsigned Executables:** Binaries do not yet carry an Authenticode certificate.',
    ].join('\n');

    expect(extractSigningInfo(unsignedNotes)).toEqual({
      status: 'unsigned',
      publisher: null,
      issuer: null,
      timestamped: false,
      smartAppControlCompatible: false,
    });

    const verifiedNotes = [
      '- Digital Signature: Verified',
      '- Verified Publisher: SignPath Foundation',
      '- Certificate Issuer: DigiCert Trusted G4 Code Signing RSA4096 SHA384 2021 CA1',
      '- Timestamped: Yes',
    ].join('\n');

    expect(extractSigningInfo(verifiedNotes)).toEqual({
      status: 'signed',
      publisher: 'SignPath Foundation',
      issuer: 'DigiCert Trusted G4 Code Signing RSA4096 SHA384 2021 CA1',
      timestamped: true,
      smartAppControlCompatible: true,
    });
  });
});

