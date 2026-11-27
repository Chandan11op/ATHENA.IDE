export {
  createReleaseApi,
  getLatestStableRelease,
  getAllReleases,
  getReleaseByTag,
  getAvailableDownloads,
  getReleaseAssetMetadata,
  invalidateReleaseCache,
  type ReleaseApi,
  type ReleaseApiConfig,
} from './api/releaseApi.js';

export type {
  Platform,
  Architecture,
  ReleaseChannel,
  AssetFormat,
  ChecksumType,
  ReleaseAsset,
  ReleaseCompatibility,
  Release,
  AvailableDownloads,
  ReleaseAssetMetadata,
  ReleaseErrorCode,
  ReleaseError,
  ResponseMeta,
  ResultStatus,
  ReleaseResult,
  GetReleasesOptions,
  GetLatestReleaseOptions,
  PaginatedReleases,
} from './types/release.js';

