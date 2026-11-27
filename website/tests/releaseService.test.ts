import { describe, it, expect, vi } from 'vitest';
import { createReleaseApi } from '../src/backend/api/releaseApi.js';
import type { RawGitHubReleaseDto } from '../src/backend/types/release.js';

function makeRawRelease(overrides: Partial<RawGitHubReleaseDto> = {}): RawGitHubReleaseDto {
  const tag = overrides.tag_name ?? 'v0.1.0';
  return {
    id: 1,
    tag_name: tag,
    name: `Athena.IDE ${tag}`,
    body: 'Release notes body.',
    draft: false,
    prerelease: false,
    created_at: '2026-11-01T10:00:00Z',
    published_at: '2026-11-01T10:00:00Z',
    html_url: `https://github.com/Chandan11op/ATHENA.IDE/releases/tag/${tag}`,
    assets: [
      {
        id: 10,
        name: `Athena.IDE-${tag}-x64.exe`,
        browser_download_url: `https://github.com/Chandan11op/ATHENA.IDE/releases/download/${tag}/Athena.IDE-${tag}-x64.exe`,
        size: 50000000,
        content_type: 'application/octet-stream',
        state: 'uploaded',
        updated_at: '2026-11-01T10:05:00Z',
      },
    ],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
}

describe('ReleaseService & ReleaseApi', () => {
  it('returns an honest empty state when GitHub has zero releases (no fabricated releases)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    const api = createReleaseApi({ provider: { fetchImpl: fetchMock } });

    const latest = await api.getLatestStableRelease();
    expect(latest.ok).toBe(true);
    expect(latest.status).toBe('empty');
    expect(latest.data).toBeNull();
    expect(latest.error).toBeNull();

    const all = await api.getAllReleases();
    expect(all.ok).toBe(true);
    expect(all.status).toBe('empty');
    expect(all.data.releases).toEqual([]);
    expect(api.getAvailableDownloads(latest.data).hasDownloads).toBe(false);
    expect(api.getReleaseAssetMetadata(latest.data).totalAssets).toBe(0);
  });

  it('excludes drafts and prereleases when selecting latest stable release, and paginates if needed', async () => {
    const page1 = [
      makeRawRelease({ id: 3, tag_name: 'v0.3.0-draft', draft: true, published_at: '2026-11-15T00:00:00Z' }),
      makeRawRelease({ id: 2, tag_name: 'v0.2.0-beta.1', prerelease: true, published_at: '2026-11-10T00:00:00Z' }),
    ];
    const page2 = [
      makeRawRelease({ id: 1, tag_name: 'v0.1.0', draft: false, prerelease: false, published_at: '2026-11-01T00:00:00Z' }),
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('page=1')) {
        return jsonResponse(page1, 200, {
          link: '<https://api.github.com/repos/Chandan11op/ATHENA.IDE/releases?page=2>; rel="next"',
        });
      }
      return jsonResponse(page2, 200);
    });

    const api = createReleaseApi({ provider: { fetchImpl: fetchMock } });

    const latestStable = await api.getLatestStableRelease();
    expect(latestStable.ok).toBe(true);
    expect(latestStable.status).toBe('ok');
    expect(latestStable.data?.tagName).toBe('v0.1.0');
    expect(latestStable.data?.channel).toBe('stable');

    const latestBeta = await api.getLatestStableRelease({ channel: 'prerelease' });
    expect(latestBeta.ok).toBe(true);
    expect(latestBeta.data?.tagName).toBe('v0.2.0-beta.1');
    expect(latestBeta.data?.channel).toBe('prerelease');
  });

  it('filters releases, handles pagination metadata, and fetches by tag', async () => {
    const releases = [
      makeRawRelease({ id: 3, tag_name: 'v0.3.0', draft: true }),
      makeRawRelease({ id: 2, tag_name: 'v0.2.0-rc.1', prerelease: true, published_at: '2026-11-05T00:00:00Z' }),
      makeRawRelease({ id: 1, tag_name: 'v0.1.0', prerelease: false, published_at: '2026-11-01T00:00:00Z' }),
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/releases/tags/v0.1.0')) {
        return jsonResponse(releases[2]);
      }
      if (url.includes('/releases/tags/v0.3.0')) {
        return jsonResponse(releases[0]);
      }
      if (url.includes('/releases/tags/missing')) {
        return jsonResponse({ message: 'Not Found' }, 404);
      }
      return jsonResponse(releases, 200, {
        link: '<https://api.github.com/repos/Chandan11op/ATHENA.IDE/releases?page=2>; rel="next"',
      });
    });

    const api = createReleaseApi({ provider: { fetchImpl: fetchMock } });

    const all = await api.getAllReleases({ page: 1, perPage: 10 });
    expect(all.data.releases.map((r) => r.tagName)).toEqual(['v0.2.0-rc.1', 'v0.1.0']);
    expect(all.data.hasNextPage).toBe(true);

    const stableOnly = await api.getAllReleases({ channel: 'stable' });
    expect(stableOnly.data.releases.map((r) => r.tagName)).toEqual(['v0.1.0']);

    const byVersion = await api.getAllReleases({ version: '0.1.0' });
    expect(byVersion.data.releases).toHaveLength(1);

    const tagHit = await api.getReleaseByTag('v0.1.0');
    expect(tagHit.status).toBe('ok');
    expect(tagHit.data?.version).toBe('0.1.0');

    const draftByTag = await api.getReleaseByTag('v0.3.0');
    expect(draftByTag.status).toBe('not_found');
    expect(draftByTag.data).toBeNull();

    const missing = await api.getReleaseByTag('missing');
    expect(missing.status).toBe('not_found');

    const invalid = await api.getReleaseByTag('../bad');
    expect(invalid.ok).toBe(false);
    expect(invalid.error?.code).toBe('INVALID_INPUT');
  });

  it('preserves unclassified assets and separates installers from metadata files', async () => {
    const releaseDto = makeRawRelease({
      assets: [
        {
          id: 1,
          name: 'Athena.IDE-0.1.0-x64.exe',
          browser_download_url: 'https://github.com/Chandan11op/ATHENA.IDE/releases/download/v0.1.0/Athena.IDE-0.1.0-x64.exe',
          size: 500,
          content_type: 'application/octet-stream',
          state: 'uploaded',
          updated_at: null,
        },
        {
          id: 2,
          name: 'Athena-portable-bundle.zip',
          browser_download_url: 'https://github.com/Chandan11op/ATHENA.IDE/releases/download/v0.1.0/Athena-portable-bundle.zip',
          size: 300,
          content_type: 'application/zip',
          state: 'uploaded',
          updated_at: null,
        },
        {
          id: 3,
          name: 'SHA256SUMS.txt',
          browser_download_url: 'https://github.com/Chandan11op/ATHENA.IDE/releases/download/v0.1.0/SHA256SUMS.txt',
          size: 100,
          content_type: 'text/plain',
          state: 'uploaded',
          updated_at: null,
        },
      ],
    });

    const api = createReleaseApi({
      provider: { fetchImpl: vi.fn(async () => jsonResponse([releaseDto])) },
    });

    const latest = await api.getLatestStableRelease();
    const downloads = api.getAvailableDownloads(latest.data);
    expect(downloads.platformsAvailable).toEqual(['Windows']);
    expect(downloads.byPlatform.Unknown).toHaveLength(1);
    expect(downloads.byPlatform.Unknown[0]?.name).toBe('Athena-portable-bundle.zip');
    expect(downloads.otherAssets.map((a) => a.name)).toEqual(['SHA256SUMS.txt']);

    const meta = api.getReleaseAssetMetadata(latest.data);
    expect(meta.totalAssets).toBe(3);
    expect(meta.availableAssets).toBe(3);
    expect(meta.totalSizeBytes).toBe(900);
    expect(meta.hasChecksums).toBe(true);
  });

  it('uses ETag revalidation and serves stale cache gracefully on rate-limit or network error', async () => {
    let clock = 1000;
    let callCount = 0;

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      callCount++;
      const headers = new Headers(init?.headers);

      if (callCount === 1) {
        return jsonResponse([makeRawRelease()], 200, {
          etag: '"v1-etag"',
          'x-ratelimit-remaining': '59',
        });
      }
      if (callCount === 2) {
        expect(headers.get('if-none-match')).toBe('"v1-etag"');
        return new Response(null, { status: 304, headers: { etag: '"v1-etag"' } });
      }
      if (callCount === 3) {
        return jsonResponse({ message: 'API rate limit exceeded' }, 403, {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1800000000',
        });
      }
      throw new Error('ECONNRESET');
    });

    const api = createReleaseApi({
      provider: { fetchImpl: fetchMock },
      cache: { ttlMs: 1000, staleTtlMs: 10000, now: () => clock },
    });

    // 1. Live fetch
    const r1 = await api.getLatestStableRelease();
    expect(r1.ok).toBe(true);
    expect(r1.meta.isStale).toBe(false);
    expect(r1.meta.source).toBe('github');

    // 2. Fresh cache hit (no extra fetch)
    const rCached = await api.getLatestStableRelease();
    expect(rCached.meta.cacheHit).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 3. TTL expires -> 304 Not Modified refreshes cache
    clock += 1500;
    const r304 = await api.getLatestStableRelease();
    expect(r304.ok).toBe(true);
    expect(r304.meta.isStale).toBe(false);
    expect(r304.meta.cacheHit).toBe(true);

    // 4. TTL expires -> 403 rate limit -> graceful stale fallback
    clock += 1500;
    const rStale = await api.getLatestStableRelease();
    expect(rStale.ok).toBe(true);
    expect(rStale.data?.tagName).toBe('v0.1.0');
    expect(rStale.meta.isStale).toBe(true);
    expect(rStale.meta.source).toBe('cache');
    expect(rStale.error?.code).toBe('RATE_LIMITED');

    // 5. Cold cache + network failure -> clean error state (no fabricated data)
    api.invalidateCache();
    const rErr = await api.getLatestStableRelease();
    expect(rErr.ok).toBe(false);
    expect(rErr.status).toBe('error');
    expect(rErr.data).toBeNull();
    expect(rErr.error?.code).toBe('NETWORK_ERROR');
  });

  it('handles malformed JSON and timeout errors cleanly', async () => {
    const badJsonApi = createReleaseApi({
      provider: {
        fetchImpl: vi.fn(async () => new Response('not-json{', { status: 200 })),
      },
    });
    const badRes = await badJsonApi.getLatestStableRelease();
    expect(badRes.ok).toBe(false);
    expect(badRes.error?.code).toBe('INVALID_RESPONSE');

    const timeoutApi = createReleaseApi({
      provider: {
        fetchImpl: vi.fn(async () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          throw err;
        }),
      },
    });
    const timeoutRes = await timeoutApi.getLatestStableRelease();
    expect(timeoutRes.ok).toBe(false);
    expect(timeoutRes.error?.code).toBe('TIMEOUT');
  });
});

