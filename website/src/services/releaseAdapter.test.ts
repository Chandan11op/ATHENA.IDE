import { describe, expect, it } from 'vitest';
import {
  MockReleaseAdapter,
  filterAndPaginateReleases,
} from './releaseAdapter';
import { Release } from '../types/release';
import { formatBytes, getPlatformLabel } from '../utils/format';

const FIXTURE_RELEASES: Release[] = [
  {
    id: 'r2',
    version: '0.2.0',
    tag: 'v0.2.0',
    title: 'Stable Release',
    description: 'Cross-platform stable build',
    releaseDate: '2026-12-01T00:00:00.000Z',
    releaseNotes: 'Added Windows and Linux installers.',
    releaseChannel: 'stable',
    isPrerelease: false,
    compatibility: {
      osRequirements: { windows: 'Windows 11', macos: null, linux: 'Ubuntu 22.04' },
      ollamaRequired: true,
    },
    assets: [
      {
        id: 'a1',
        platform: 'windows',
        architecture: 'x64',
        fileName: 'athena-0.2.0-setup.exe',
        downloadUrl: 'https://example.invalid/athena-0.2.0-setup.exe',
        fileSizeBytes: 95_000_000,
        assetType: 'installer',
        installerFormat: '.exe',
      },
    ],
  },
  {
    id: 'r1',
    version: '0.1.0',
    tag: 'v0.1.0',
    title: 'Alpha Shell',
    description: 'Initial desktop shell',
    releaseDate: '2026-11-20T00:00:00.000Z',
    releaseNotes: 'M0/M1 foundation',
    releaseChannel: 'alpha',
    isPrerelease: true,
    compatibility: {
      osRequirements: { windows: 'Windows 10/11', macos: null, linux: null },
      ollamaRequired: true,
    },
    assets: [],
  },
];

describe('filterAndPaginateReleases', () => {
  it('filters by channel and search query', () => {
    const res = filterAndPaginateReleases(FIXTURE_RELEASES, {
      channel: 'stable',
      search: 'installers',
    });
    expect(res.total).toBe(1);
    expect(res.releases[0]?.tag).toBe('v0.2.0');
  });

  it('filters by platform compatibility or asset', () => {
    const linuxRes = filterAndPaginateReleases(FIXTURE_RELEASES, {
      platform: 'linux',
    });
    expect(linuxRes.total).toBe(1);
    expect(linuxRes.releases[0]?.tag).toBe('v0.2.0');

    const macRes = filterAndPaginateReleases(FIXTURE_RELEASES, {
      platform: 'macos',
    });
    expect(macRes.total).toBe(0);
  });

  it('paginates results accurately', () => {
    const page1 = filterAndPaginateReleases(FIXTURE_RELEASES, {
      page: 1,
      pageSize: 1,
    });
    expect(page1.releases).toHaveLength(1);
    expect(page1.hasMore).toBe(true);

    const page2 = filterAndPaginateReleases(FIXTURE_RELEASES, {
      page: 2,
      pageSize: 1,
    });
    expect(page2.releases).toHaveLength(1);
    expect(page2.hasMore).toBe(false);
  });
});

describe('MockReleaseAdapter', () => {
  it('returns latest stable release when available and resolves by tag', async () => {
    const adapter = new MockReleaseAdapter(FIXTURE_RELEASES);
    const latest = await adapter.getLatestRelease();
    expect(latest.source).toBe('mock');
    expect(latest.data?.tag).toBe('v0.2.0');

    const byTag = await adapter.getReleaseByTag('v0.1.0');
    expect(byTag.data?.id).toBe('r1');

    const missing = await adapter.getReleaseByTag('v9.9.9');
    expect(missing.data).toBeNull();
  });
});

describe('format utilities', () => {
  it('formats byte sizes and platform labels', () => {
    expect(formatBytes(undefined)).toBe('Size unavailable');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(getPlatformLabel('macos')).toBe('macOS');
  });
});
