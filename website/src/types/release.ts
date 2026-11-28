export type ReleaseChannel = 'stable' | 'beta' | 'alpha';
export type PlatformId = 'windows' | 'macos' | 'linux';
export type Architecture = 'x64' | 'arm64' | 'universal';
export type ReleaseSignatureStatus = 'signed' | 'unsigned' | 'unknown';

export interface ReleaseSigningInfo {
  status: ReleaseSignatureStatus;
  publisher: string | null;
  issuer: string | null;
  timestamped: boolean;
  smartAppControlCompatible: boolean;
}

export interface ReleaseAsset {
  id: string;
  platform: PlatformId;
  architecture: Architecture;
  fileName: string;
  downloadUrl: string;
  fileSizeBytes?: number;
  checksumSha256?: string;
  assetType: 'installer' | 'portable' | 'archive' | 'package';
  installerFormat: string;
}

export interface ReleaseCompatibility {
  osRequirements: Record<PlatformId, string | null>;
  minRamGb?: number;
  recommendedRamGb?: number;
  ollamaRequired: boolean;
  recommendedModels?: string[];
}

export interface ReleaseChangelog {
  newFeatures: string[];
  improvements: string[];
  bugFixes: string[];
}

export interface Release {
  id: string;
  version: string;
  tag: string;
  title: string;
  description: string;
  releaseDate: string;
  releaseNotes: string;
  changelog?: ReleaseChangelog;
  releaseChannel: ReleaseChannel;
  isPrerelease: boolean;
  releaseUrl?: string;
  compatibility: ReleaseCompatibility;
  assets: ReleaseAsset[];
  signing?: ReleaseSigningInfo;
}

export interface ReleaseQueryParams {
  channel?: ReleaseChannel | 'all';
  platform?: PlatformId | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ReleaseListPayload {
  releases: Release[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
  fetchedAt: string;
  source: 'api' | 'mock';
  isStale?: boolean;
  rateLimitResetAt?: string;
}
