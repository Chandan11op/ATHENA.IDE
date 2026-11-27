import { ReleaseCache, type ReleaseCacheOptions } from '../cache/releaseCache.js';
import {
  GitHubReleaseProvider,
  type GitHubProviderConfig,
} from '../providers/github/githubReleaseProvider.js';
import { ReleaseService } from '../services/releaseService.js';
import type {
  AvailableDownloads,
  GetLatestReleaseOptions,
  GetReleasesOptions,
  PaginatedReleases,
  Release,
  ReleaseAssetMetadata,
  ReleaseResult,
} from '../types/release.js';

export interface ReleaseApiConfig {
  provider?: GitHubProviderConfig;
  cache?: ReleaseCacheOptions;
  maxLatestScanPages?: number;
}

export interface ReleaseApi {
  getLatestStableRelease: (options?: GetLatestReleaseOptions) => Promise<ReleaseResult<Release | null>>;
  getAllReleases: (options?: GetReleasesOptions) => Promise<ReleaseResult<PaginatedReleases>>;
  getReleaseByTag: (tag: string, options?: { bypassCache?: boolean }) => Promise<ReleaseResult<Release | null>>;
  getAvailableDownloads: (release: Release | null) => AvailableDownloads;
  getReleaseAssetMetadata: (release: Release | null) => ReleaseAssetMetadata;
  invalidateCache: (key?: string) => void;
}

/** Creates an isolated release API instance bound to configured provider and cache. */
export function createReleaseApi(config: ReleaseApiConfig = {}): ReleaseApi {
  const provider = new GitHubReleaseProvider(config.provider);
  const cache = new ReleaseCache(config.cache);
  const service = new ReleaseService({
    provider,
    cache,
    maxLatestScanPages: config.maxLatestScanPages,
  });

  return {
    getLatestStableRelease: (options) => service.getLatestStableRelease(options),
    getAllReleases: (options) => service.getAllReleases(options),
    getReleaseByTag: (tag, options) => service.getReleaseByTag(tag, options),
    getAvailableDownloads: (release) => service.getAvailableDownloads(release),
    getReleaseAssetMetadata: (release) => service.getReleaseAssetMetadata(release),
    invalidateCache: (key) => service.invalidateCache(key),
  };
}

const defaultApi = createReleaseApi();

export const getLatestStableRelease = defaultApi.getLatestStableRelease;
export const getAllReleases = defaultApi.getAllReleases;
export const getReleaseByTag = defaultApi.getReleaseByTag;
export const getAvailableDownloads = defaultApi.getAvailableDownloads;
export const getReleaseAssetMetadata = defaultApi.getReleaseAssetMetadata;
export const invalidateReleaseCache = defaultApi.invalidateCache;

