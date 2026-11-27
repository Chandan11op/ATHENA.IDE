import type {
  AvailableDownloads,
  GetLatestReleaseOptions,
  GetReleasesOptions,
  PaginatedReleases,
  Platform,
  Release,
  ReleaseAsset,
  ReleaseAssetMetadata,
  ReleaseChannel,
  ReleaseError,
  ReleaseResult,
  ResponseMeta,
} from '../types/release.js';
import { ReleaseCache } from '../cache/releaseCache.js';
import {
  GitHubReleaseProvider,
  type GitHubRateLimitInfo,
  type ProviderResponse,
} from '../providers/github/githubReleaseProvider.js';
import { normalizeVersionFromTag } from '../adapters/releaseNormalizer.js';
import { sanitizeTag } from '../validators/releaseValidator.js';

export interface ReleaseServiceOptions {
  provider?: GitHubReleaseProvider;
  cache?: ReleaseCache;
  maxLatestScanPages?: number;
}

interface CachedPagePayload {
  releases: Release[];
  hasNextPage: boolean;
}

function makeMeta(
  opts: Partial<ResponseMeta> & { fetchedAt?: string } = {}
): ResponseMeta {
  return {
    isStale: opts.isStale ?? false,
    cacheHit: opts.cacheHit ?? false,
    fetchedAt: opts.fetchedAt ?? new Date().toISOString(),
    source: opts.source ?? 'github',
    rateLimitRemaining: opts.rateLimitRemaining,
    rateLimitResetAt: opts.rateLimitResetAt,
  };
}

function attachRateLimit(meta: ResponseMeta, rateLimit: GitHubRateLimitInfo): ResponseMeta {
  return {
    ...meta,
    rateLimitRemaining: rateLimit.remaining,
    rateLimitResetAt: rateLimit.resetAt,
  };
}

function sortReleasesDesc(releases: Release[]): Release[] {
  return [...releases].sort((a, b) => {
    const timeA = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const timeB = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return timeB - timeA;
  });
}

function filterReleases(
  releases: Release[],
  opts: { includePrereleases: boolean; channel?: ReleaseChannel; version?: string }
): Release[] {
  const targetVersion = opts.version ? normalizeVersionFromTag(opts.version).toLowerCase() : null;

  return releases.filter((release) => {
    if (release.isDraft) {
      return false;
    }
    if (opts.channel && release.channel !== opts.channel) {
      return false;
    }
    if (!opts.includePrereleases && release.isPrerelease) {
      return false;
    }
    if (targetVersion) {
      const normalized = release.version.toLowerCase();
      const tagLower = release.tagName.toLowerCase();
      if (normalized !== targetVersion && tagLower !== opts.version!.trim().toLowerCase()) {
        return false;
      }
    }
    return true;
  });
}

export class ReleaseService {
  private readonly provider: GitHubReleaseProvider;
  private readonly cache: ReleaseCache;
  private readonly maxLatestScanPages: number;

  constructor(options: ReleaseServiceOptions = {}) {
    this.provider = options.provider ?? new GitHubReleaseProvider();
    this.cache = options.cache ?? new ReleaseCache();
    this.maxLatestScanPages = options.maxLatestScanPages ?? 5;
  }

  invalidateCache(key?: string): void {
    this.cache.invalidate(key);
  }

  private async fetchPageWithCache(
    page: number,
    perPage: number,
    bypassCache = false
  ): Promise<{
    ok: boolean;
    data: CachedPagePayload | null;
    error: ReleaseError | null;
    meta: ResponseMeta;
  }> {
    const cacheKey = `releases:page=${page}:per=${perPage}`;

    if (!bypassCache) {
      const fresh = this.cache.getFresh<CachedPagePayload>(cacheKey);
      if (fresh) {
        return {
          ok: true,
          data: fresh.value,
          error: null,
          meta: makeMeta({ isStale: false, cacheHit: true, fetchedAt: fresh.fetchedAtIso, source: 'cache' }),
        };
      }
    }

    const previous = this.cache.getRawEntry<CachedPagePayload>(cacheKey);
    const response: ProviderResponse<Release[]> = await this.provider.fetchReleasesPage(
      page,
      perPage,
      bypassCache ? undefined : previous?.etag
    );

    if (response.notModified && previous) {
      const touched = this.cache.touch<CachedPagePayload>(cacheKey, response.etag) ?? previous;
      return {
        ok: true,
        data: touched.value,
        error: null,
        meta: attachRateLimit(
          makeMeta({ isStale: false, cacheHit: true, fetchedAt: touched.fetchedAtIso, source: 'cache' }),
          response.rateLimit
        ),
      };
    }

    if (response.ok && response.data !== null) {
      const payload: CachedPagePayload = {
        releases: response.data,
        hasNextPage: response.hasNextPage ?? false,
      };
      const saved = this.cache.set(cacheKey, payload, response.etag);
      return {
        ok: true,
        data: payload,
        error: null,
        meta: attachRateLimit(
          makeMeta({ isStale: false, cacheHit: false, fetchedAt: saved.fetchedAtIso, source: 'github' }),
          response.rateLimit
        ),
      };
    }

    // Graceful degradation: serve stale cache if available on transient/rate-limit failure
    const stale = this.cache.getStale<CachedPagePayload>(cacheKey);
    if (stale) {
      return {
        ok: true,
        data: stale.value,
        error: response.error,
        meta: attachRateLimit(
          makeMeta({ isStale: true, cacheHit: true, fetchedAt: stale.fetchedAtIso, source: 'cache' }),
          response.rateLimit
        ),
      };
    }

    return {
      ok: false,
      data: null,
      error: response.error,
      meta: attachRateLimit(makeMeta({ source: 'github' }), response.rateLimit),
    };
  }

  async getLatestStableRelease(
    options: GetLatestReleaseOptions = {}
  ): Promise<ReleaseResult<Release | null>> {
    const channel: ReleaseChannel = options.channel ?? 'stable';
    const includePrereleases = channel === 'prerelease';
    const perPage = 30;

    let lastMeta = makeMeta();
    for (let page = 1; page <= this.maxLatestScanPages; page++) {
      const pageResult = await this.fetchPageWithCache(page, perPage, options.bypassCache);
      lastMeta = pageResult.meta;

      if (!pageResult.ok || !pageResult.data) {
        return {
          ok: false,
          status: 'error',
          data: null,
          error: pageResult.error,
          meta: lastMeta,
        };
      }

      const eligible = sortReleasesDesc(
        filterReleases(pageResult.data.releases, {
          includePrereleases,
          channel,
        })
      );

      if (eligible.length > 0) {
        return {
          ok: true,
          status: 'ok',
          data: eligible[0] ?? null,
          error: pageResult.error,
          meta: lastMeta,
        };
      }

      if (!pageResult.data.hasNextPage) {
        break;
      }
    }

    return {
      ok: true,
      status: 'empty',
      data: null,
      error: null,
      meta: lastMeta,
    };
  }

  async getAllReleases(
    options: GetReleasesOptions = {}
  ): Promise<ReleaseResult<PaginatedReleases>> {
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Math.floor(options.perPage ?? 20)));
    const includePrereleases =
      options.channel === 'stable' ? false : (options.includePrereleases ?? true);

    const pageResult = await this.fetchPageWithCache(page, perPage, options.bypassCache);

    if (!pageResult.ok || !pageResult.data) {
      return {
        ok: false,
        status: 'error',
        data: {
          releases: [],
          page,
          perPage,
          hasNextPage: false,
          totalReturned: 0,
        },
        error: pageResult.error,
        meta: pageResult.meta,
      };
    }

    const filtered = sortReleasesDesc(
      filterReleases(pageResult.data.releases, {
        includePrereleases,
        channel: options.channel,
        version: options.version,
      })
    );

    return {
      ok: true,
      status: filtered.length === 0 ? 'empty' : 'ok',
      data: {
        releases: filtered,
        page,
        perPage,
        hasNextPage: pageResult.data.hasNextPage,
        totalReturned: filtered.length,
      },
      error: pageResult.error,
      meta: pageResult.meta,
    };
  }

  async getReleaseByTag(
    tag: string,
    options: { bypassCache?: boolean } = {}
  ): Promise<ReleaseResult<Release | null>> {
    const safeTag = sanitizeTag(tag);
    if (!safeTag) {
      return {
        ok: false,
        status: 'error',
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: 'Release tag must be a non-empty valid tag string.',
        },
        meta: makeMeta({ source: 'github' }),
      };
    }

    const cacheKey = `release:tag=${safeTag}`;
    if (!options.bypassCache) {
      const fresh = this.cache.getFresh<Release>(cacheKey);
      if (fresh) {
        return {
          ok: true,
          status: 'ok',
          data: fresh.value,
          error: null,
          meta: makeMeta({ isStale: false, cacheHit: true, fetchedAt: fresh.fetchedAtIso, source: 'cache' }),
        };
      }
    }

    const previous = this.cache.getRawEntry<Release>(cacheKey);
    const response = await this.provider.fetchReleaseByTag(
      safeTag,
      options.bypassCache ? undefined : previous?.etag
    );

    if (response.notModified && previous) {
      const touched = this.cache.touch<Release>(cacheKey, response.etag) ?? previous;
      return {
        ok: true,
        status: 'ok',
        data: touched.value,
        error: null,
        meta: attachRateLimit(
          makeMeta({ isStale: false, cacheHit: true, fetchedAt: touched.fetchedAtIso, source: 'cache' }),
          response.rateLimit
        ),
      };
    }

    if (response.ok && response.data) {
      if (response.data.isDraft) {
        return {
          ok: true,
          status: 'not_found',
          data: null,
          error: null,
          meta: attachRateLimit(makeMeta({ source: 'github' }), response.rateLimit),
        };
      }

      const saved = this.cache.set(cacheKey, response.data, response.etag);
      return {
        ok: true,
        status: 'ok',
        data: response.data,
        error: null,
        meta: attachRateLimit(
          makeMeta({ isStale: false, cacheHit: false, fetchedAt: saved.fetchedAtIso, source: 'github' }),
          response.rateLimit
        ),
      };
    }

    if (response.error?.code === 'NOT_FOUND') {
      return {
        ok: true,
        status: 'not_found',
        data: null,
        error: null,
        meta: attachRateLimit(makeMeta({ source: 'github' }), response.rateLimit),
      };
    }

    const stale = this.cache.getStale<Release>(cacheKey);
    if (stale) {
      return {
        ok: true,
        status: 'ok',
        data: stale.value,
        error: response.error,
        meta: attachRateLimit(
          makeMeta({ isStale: true, cacheHit: true, fetchedAt: stale.fetchedAtIso, source: 'cache' }),
          response.rateLimit
        ),
      };
    }

    return {
      ok: false,
      status: 'error',
      data: null,
      error: response.error,
      meta: attachRateLimit(makeMeta({ source: 'github' }), response.rateLimit),
    };
  }

  getAvailableDownloads(release: Release | null): AvailableDownloads {
    const emptyByPlatform: Record<Platform, ReleaseAsset[]> = {
      Windows: [],
      macOS: [],
      Linux: [],
      Unknown: [],
    };

    if (!release) {
      return {
        releaseId: 0,
        tagName: '',
        version: '',
        hasDownloads: false,
        platformsAvailable: [],
        byPlatform: emptyByPlatform,
        installers: [],
        otherAssets: [],
      };
    }

    const installers: ReleaseAsset[] = [];
    const otherAssets: ReleaseAsset[] = [];
    const platforms = new Set<Platform>();

    for (const asset of release.assets) {
      if (!asset.isAvailable) {
        continue;
      }
      if (asset.isInstaller) {
        installers.push(asset);
        emptyByPlatform[asset.platform].push(asset);
        if (asset.platform !== 'Unknown') {
          platforms.add(asset.platform);
        }
      } else {
        otherAssets.push(asset);
      }
    }

    return {
      releaseId: release.id,
      tagName: release.tagName,
      version: release.version,
      hasDownloads: installers.length > 0 || otherAssets.length > 0,
      platformsAvailable: Array.from(platforms),
      byPlatform: emptyByPlatform,
      installers,
      otherAssets,
    };
  }

  getReleaseAssetMetadata(release: Release | null): ReleaseAssetMetadata {
    if (!release) {
      return {
        releaseTag: '',
        version: '',
        totalAssets: 0,
        availableAssets: 0,
        totalSizeBytes: 0,
        hasChecksums: false,
        assets: [],
      };
    }

    let availableAssets = 0;
    let totalSizeBytes = 0;
    let hasChecksums = false;

    for (const asset of release.assets) {
      if (asset.isAvailable) {
        availableAssets++;
      }
      if (typeof asset.sizeBytes === 'number') {
        totalSizeBytes += asset.sizeBytes;
      }
      if (asset.checksum !== null || asset.format === 'checksum') {
        hasChecksums = true;
      }
    }

    return {
      releaseTag: release.tagName,
      version: release.version,
      totalAssets: release.assets.length,
      availableAssets,
      totalSizeBytes,
      hasChecksums,
      assets: release.assets,
    };
  }
}

