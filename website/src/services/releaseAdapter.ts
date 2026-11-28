import {
  getAllReleases,
  getLatestStableRelease,
  getReleaseByTag,
} from '../backend/index';
import type {
  Platform as BackendPlatform,
  Release as BackendRelease,
  ReleaseAsset as BackendAsset,
} from '../backend/types/release';
import { MOCK_RELEASES } from '../data/mockReleases';
import {
  ApiResponse,
  Architecture,
  PlatformId,
  Release,
  ReleaseAsset,
  ReleaseListPayload,
  ReleaseQueryParams,
} from '../types/release';

export interface ReleaseDataAdapter {
  getLatestRelease(): Promise<ApiResponse<Release | null>>;
  listReleases(params?: ReleaseQueryParams): Promise<ApiResponse<ReleaseListPayload>>;
  getReleaseByTag(tag: string): Promise<ApiResponse<Release | null>>;
}

function mapPlatform(p: BackendPlatform): PlatformId | null {
  switch (p) {
    case 'Windows':
      return 'windows';
    case 'macOS':
      return 'macos';
    case 'Linux':
      return 'linux';
    default:
      return null;
  }
}

function mapArchitecture(arch: BackendAsset['architecture']): Architecture {
  if (arch === 'arm64' || arch === 'universal') return arch;
  return 'x64';
}

export function mapBackendReleaseToFrontend(rel: BackendRelease): Release {
  const assets: ReleaseAsset[] = [];
  for (const a of rel.assets) {
    const plat = mapPlatform(a.platform);
    if (!plat || !a.isAvailable || !a.isInstaller) continue;
    assets.push({
      id: String(a.id),
      platform: plat,
      architecture: mapArchitecture(a.architecture),
      fileName: a.name,
      downloadUrl: a.downloadUrl,
      fileSizeBytes: a.sizeBytes ?? undefined,
      checksumSha256: a.checksumType === 'sha256' && a.checksum ? a.checksum : undefined,
      assetType: a.format === 'zip' || a.format === 'tar.gz' ? 'archive' : 'installer',
      installerFormat: `.${a.format}`,
    });
  }

  const hasPlatform = (p: BackendPlatform) =>
    rel.compatibility.supportedPlatforms.includes(p);

  return {
    id: String(rel.id),
    version: rel.version,
    tag: rel.tagName,
    title: rel.title,
    description: rel.description,
    releaseDate: rel.publishedAt ?? rel.updatedAt ?? new Date().toISOString(),
    releaseNotes: rel.body || rel.description,
    releaseChannel: rel.isPrerelease ? 'beta' : 'stable',
    isPrerelease: rel.isPrerelease,
    compatibility: {
      osRequirements: {
        windows: hasPlatform('Windows') ? 'Windows 10 / 11 (64-bit)' : null,
        macos: hasPlatform('macOS') ? 'macOS 12+' : null,
        linux: hasPlatform('Linux') ? 'Linux (x64)' : null,
      },
      minRamGb: 8,
      recommendedRamGb: 16,
      ollamaRequired: true,
      recommendedModels: ['qwen2.5-coder:1.5b'],
    },
    assets,
  };
}

export function filterAndPaginateReleases(
  sourceReleases: Release[],
  params: ReleaseQueryParams = {}
): ReleaseListPayload {
  const {
    channel = 'all',
    platform = 'all',
    search = '',
    page = 1,
    pageSize = 10,
  } = params;

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = sourceReleases.filter((release) => {
    if (channel !== 'all' && release.releaseChannel !== channel) {
      return false;
    }

    if (platform !== 'all') {
      const hasAsset = release.assets.some((asset) => asset.platform === platform);
      const hasCompat = Boolean(release.compatibility.osRequirements[platform]);
      if (!hasAsset && !hasCompat) {
        return false;
      }
    }

    if (normalizedSearch.length > 0) {
      const haystack = [
        release.version,
        release.tag,
        release.title,
        release.description,
        release.releaseNotes,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }

    return true;
  });

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;
  const end = start + safePageSize;
  const paginated = filtered.slice(start, end);

  return {
    releases: paginated,
    total: filtered.length,
    page: safePage,
    pageSize: safePageSize,
    hasMore: end < filtered.length,
  };
}

export class BackendGitHubReleaseAdapter implements ReleaseDataAdapter {
  async getLatestRelease(): Promise<ApiResponse<Release | null>> {
    const res = await getLatestStableRelease();
    if (!res.ok) {
      throw new Error(res.error?.message ?? 'Unable to load latest release');
    }
    return {
      data: res.data ? mapBackendReleaseToFrontend(res.data) : null,
      fetchedAt: res.meta.fetchedAt,
      source: 'api',
    };
  }

  async listReleases(params: ReleaseQueryParams = {}): Promise<ApiResponse<ReleaseListPayload>> {
    const res = await getAllReleases({
      page: params.page ?? 1,
      perPage: params.pageSize ?? 20,
      includePrereleases: params.channel !== 'stable',
      channel: params.channel === 'stable' ? 'stable' : undefined,
    });
    if (!res.ok) {
      throw new Error(res.error?.message ?? 'Unable to load releases');
    }

    const mapped = res.data.releases.map(mapBackendReleaseToFrontend);
    const filtered = filterAndPaginateReleases(mapped, {
      ...params,
      page: 1,
      pageSize: mapped.length || 10,
    });

    return {
      data: {
        releases: filtered.releases,
        total: filtered.total,
        page: res.data.page,
        pageSize: res.data.perPage,
        hasMore: res.data.hasNextPage,
      },
      fetchedAt: res.meta.fetchedAt,
      source: 'api',
    };
  }

  async getReleaseByTag(tag: string): Promise<ApiResponse<Release | null>> {
    const res = await getReleaseByTag(tag);
    if (!res.ok) {
      throw new Error(res.error?.message ?? 'Unable to load release details');
    }
    return {
      data: res.data ? mapBackendReleaseToFrontend(res.data) : null,
      fetchedAt: res.meta.fetchedAt,
      source: 'api',
    };
  }
}

export class MockReleaseAdapter implements ReleaseDataAdapter {
  private readonly releases: Release[];

  constructor(releases: Release[] = MOCK_RELEASES) {
    this.releases = releases;
  }

  async getLatestRelease(): Promise<ApiResponse<Release | null>> {
    const stable = this.releases.find((r) => r.releaseChannel === 'stable' && !r.isPrerelease);
    const latest = stable ?? this.releases[0] ?? null;
    return {
      data: latest,
      fetchedAt: new Date().toISOString(),
      source: 'mock',
    };
  }

  async listReleases(params: ReleaseQueryParams = {}): Promise<ApiResponse<ReleaseListPayload>> {
    return {
      data: filterAndPaginateReleases(this.releases, params),
      fetchedAt: new Date().toISOString(),
      source: 'mock',
    };
  }

  async getReleaseByTag(tag: string): Promise<ApiResponse<Release | null>> {
    const normalized = tag.replace(/^v/i, '').toLowerCase();
    const match =
      this.releases.find(
        (r) =>
          r.tag.toLowerCase() === tag.toLowerCase() ||
          r.version.toLowerCase() === normalized
      ) ?? null;

    return {
      data: match,
      fetchedAt: new Date().toISOString(),
      source: 'mock',
    };
  }
}

export class HttpReleaseAdapter implements ReleaseDataAdapter {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private async requestJson<T>(path: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Release service responded with ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as ApiResponse<T>;
  }

  async getLatestRelease(): Promise<ApiResponse<Release | null>> {
    return this.requestJson<Release | null>('/releases/latest');
  }

  async listReleases(params: ReleaseQueryParams = {}): Promise<ApiResponse<ReleaseListPayload>> {
    const searchParams = new URLSearchParams();
    if (params.channel && params.channel !== 'all') searchParams.set('channel', params.channel);
    if (params.platform && params.platform !== 'all') searchParams.set('platform', params.platform);
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const query = searchParams.toString();
    return this.requestJson<ReleaseListPayload>(`/releases${query ? `?${query}` : ''}`);
  }

  async getReleaseByTag(tag: string): Promise<ApiResponse<Release | null>> {
    return this.requestJson<Release | null>(`/releases/${encodeURIComponent(tag)}`);
  }
}

const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL as string | undefined;
const useMock = import.meta.env?.VITE_USE_MOCK_RELEASES === 'true';

export const releaseService: ReleaseDataAdapter = useMock
  ? new MockReleaseAdapter()
  : apiBaseUrl
  ? new HttpReleaseAdapter(apiBaseUrl)
  : new BackendGitHubReleaseAdapter();
