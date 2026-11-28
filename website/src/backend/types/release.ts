export type Platform = 'Windows' | 'macOS' | 'Linux' | 'Unknown';

export type Architecture = 'x64' | 'arm64' | 'universal' | 'unknown';

export type ReleaseChannel = 'stable' | 'prerelease';

export type AssetFormat =
  | 'exe'
  | 'msi'
  | 'dmg'
  | 'pkg'
  | 'appimage'
  | 'deb'
  | 'rpm'
  | 'tar.gz'
  | 'zip'
  | 'blockmap'
  | 'checksum'
  | 'signature'
  | 'unknown';

export type ChecksumType = 'sha256' | 'sha512' | 'unknown';

export type ReleaseSignatureStatus = 'signed' | 'unsigned' | 'unknown';

export interface ReleaseSigningInfo {
  status: ReleaseSignatureStatus;
  publisher: string | null;
  issuer: string | null;
  timestamped: boolean;
  smartAppControlCompatible: boolean;
}

export interface ReleaseAsset {
  id: number;
  name: string;
  platform: Platform;
  architecture: Architecture;
  format: AssetFormat;
  isInstaller: boolean;
  downloadUrl: string;
  sizeBytes: number | null;
  contentType: string | null;
  checksum: string | null;
  checksumType: ChecksumType | null;
  isAvailable: boolean;
}

export interface ReleaseCompatibility {
  supportedPlatforms: Platform[];
  supportedArchitectures: Architecture[];
  hasInstallers: boolean;
}

export interface Release {
  id: number;
  tagName: string;
  version: string;
  title: string;
  description: string;
  body: string;
  publishedAt: string | null;
  updatedAt: string | null;
  isPrerelease: boolean;
  isDraft: boolean;
  releaseUrl: string;
  assets: ReleaseAsset[];
  compatibility: ReleaseCompatibility;
  channel: ReleaseChannel;
  signing?: ReleaseSigningInfo;
}

export interface AvailableDownloads {
  releaseId: number;
  tagName: string;
  version: string;
  hasDownloads: boolean;
  platformsAvailable: Platform[];
  byPlatform: Record<Platform, ReleaseAsset[]>;
  installers: ReleaseAsset[];
  otherAssets: ReleaseAsset[];
}

export interface ReleaseAssetMetadata {
  releaseTag: string;
  version: string;
  totalAssets: number;
  availableAssets: number;
  totalSizeBytes: number;
  hasChecksums: boolean;
  assets: ReleaseAsset[];
}

export type ReleaseErrorCode =
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'UPSTREAM_ERROR'
  | 'INVALID_RESPONSE'
  | 'INVALID_INPUT'
  | 'TIMEOUT';

export interface ReleaseError {
  code: ReleaseErrorCode;
  message: string;
  statusCode?: number;
  retryAfterSeconds?: number;
}

export interface ResponseMeta {
  isStale: boolean;
  cacheHit: boolean;
  fetchedAt: string;
  source: 'github' | 'cache' | 'static-fallback';
  rateLimitRemaining?: number;
  rateLimitResetAt?: string;
}

export type ResultStatus = 'ok' | 'empty' | 'not_found' | 'error';

export interface ReleaseResult<T> {
  ok: boolean;
  status: ResultStatus;
  data: T;
  error: ReleaseError | null;
  meta: ResponseMeta;
}

export interface GetReleasesOptions {
  page?: number;
  perPage?: number;
  includePrereleases?: boolean;
  channel?: ReleaseChannel;
  version?: string;
  bypassCache?: boolean;
}

export interface GetLatestReleaseOptions {
  channel?: ReleaseChannel;
  bypassCache?: boolean;
}

export interface PaginatedReleases {
  releases: Release[];
  page: number;
  perPage: number;
  hasNextPage: boolean;
  totalReturned: number;
}

export interface RawGitHubAssetDto {
  id: number;
  name: string;
  browser_download_url: string;
  size: number | null;
  content_type: string | null;
  state: string | null;
  updated_at: string | null;
}

export interface RawGitHubReleaseDto {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string | null;
  published_at: string | null;
  updated_at?: string | null;
  html_url: string;
  assets: RawGitHubAssetDto[];
}
