import { describe, expect, it, vi } from 'vitest';
import { GitHubReleaseProvider } from '../backend/providers/github/githubReleaseProvider';
import {
  MockReleaseAdapter,
  filterAndPaginateReleases,
  mapBackendReleaseToFrontend,
} from './releaseAdapter';
import type { Release as BackendRelease } from '../backend/types/release';
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

describe('mapBackendReleaseToFrontend', () => {
  it('maps GitHub backend release DTOs cleanly into frontend release shape', () => {
    const backendRel: BackendRelease = {
      id: 101,
      tagName: 'v0.2.0',
      version: '0.2.0',
      title: 'Athena.IDE v0.2.0',
      description: 'Windows desktop installer',
      body: 'Release notes',
      publishedAt: '2026-11-28T00:00:00Z',
      updatedAt: null,
      isPrerelease: false,
      isDraft: false,
      releaseUrl: 'https://github.com/Chandan11op/ATHENA.IDE/releases/tag/v0.2.0',
      channel: 'stable',
      compatibility: {
        supportedPlatforms: ['Windows'],
        supportedArchitectures: ['x64'],
        hasInstallers: true,
      },
      assets: [
        {
          id: 55,
          name: 'Athena.IDE-0.2.0-win-x64-nsis.exe',
          platform: 'Windows',
          architecture: 'x64',
          format: 'exe',
          isInstaller: true,
          downloadUrl: 'https://github.com/Chandan11op/ATHENA.IDE/releases/download/v0.2.0/Athena.IDE-0.2.0-win-x64-nsis.exe',
          sizeBytes: 120_000_000,
          contentType: 'application/octet-stream',
          checksum: null,
          checksumType: null,
          isAvailable: true,
        },
      ],
    };

    const mapped = mapBackendReleaseToFrontend(backendRel);
    expect(mapped.tag).toBe('v0.2.0');
    expect(mapped.assets).toHaveLength(1);
    expect(mapped.assets[0]?.platform).toBe('windows');
    expect(mapped.compatibility.osRequirements.windows).toBe('Windows 10 / 11 (64-bit)');
    expect(mapped.compatibility.osRequirements.macos).toBeNull();
  });
});

describe('GitHubReleaseProvider browser fetch context safety', () => {
  it('calls globalThis.fetch without binding this to the provider instance', async () => {
    const originalFetch = globalThis.fetch;
    let capturedThis: unknown = 'unset';
    const spyFetch = vi.fn(function (this: unknown) {
      capturedThis = this;
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
    globalThis.fetch = spyFetch as typeof fetch;

    try {
      const provider = new GitHubReleaseProvider();
      const res = await provider.fetchReleasesPage();
      expect(res.ok).toBe(true);
      expect(res.data).toEqual([]);
      expect(capturedThis).not.toBe(provider);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
