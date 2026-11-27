import { MOCK_RELEASES } from '../data/mockReleases';
import {
  ApiResponse,
  Release,
  ReleaseListPayload,
  ReleaseQueryParams,
} from '../types/release';

export interface ReleaseDataAdapter {
  getLatestRelease(): Promise<ApiResponse<Release | null>>;
  listReleases(params?: ReleaseQueryParams): Promise<ApiResponse<ReleaseListPayload>>;
  getReleaseByTag(tag: string): Promise<ApiResponse<Release | null>>;
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

    const payload = (await response.json()) as ApiResponse<T>;
    return payload;
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

export const releaseService: ReleaseDataAdapter = apiBaseUrl
  ? new HttpReleaseAdapter(apiBaseUrl)
  : new MockReleaseAdapter();
