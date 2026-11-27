import type {
  Release,
  ReleaseError,
} from '../../types/release.js';
import {
  sanitizeTag,
  validateGitHubRelease,
  validateGitHubReleaseList,
} from '../../validators/releaseValidator.js';
import { normalizeRelease } from '../../adapters/releaseNormalizer.js';

export type FetchLike = typeof fetch;

export interface GitHubProviderConfig {
  owner?: string;
  repo?: string;
  apiBaseUrl?: string;
  /** Optional server-side token only. Never pass or embed tokens in browser bundles. */
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

export interface GitHubRateLimitInfo {
  remaining?: number;
  resetAt?: string;
}

export interface ProviderResponse<T> {
  ok: boolean;
  notModified: boolean;
  data: T | null;
  etag?: string;
  hasNextPage?: boolean;
  rateLimit: GitHubRateLimitInfo;
  error: ReleaseError | null;
}

const DEFAULT_OWNER = 'Chandan11op';
const DEFAULT_REPO = 'ATHENA.IDE';
const DEFAULT_API_BASE = 'https://api.github.com';
const DEFAULT_TIMEOUT_MS = 8000;

function parseRateLimitHeaders(headers: Headers): GitHubRateLimitInfo {
  const remainingRaw = headers.get('x-ratelimit-remaining');
  const resetRaw = headers.get('x-ratelimit-reset');

  const remaining =
    remainingRaw !== null && /^\d+$/.test(remainingRaw)
      ? Number.parseInt(remainingRaw, 10)
      : undefined;

  let resetAt: string | undefined;
  if (resetRaw !== null && /^\d+$/.test(resetRaw)) {
    const resetSeconds = Number.parseInt(resetRaw, 10);
    resetAt = new Date(resetSeconds * 1000).toISOString();
  }

  return { remaining, resetAt };
}

function parseHasNextPage(linkHeader: string | null): boolean {
  if (!linkHeader) {
    return false;
  }
  return /rel="next"/i.test(linkHeader);
}

function mapHttpError(status: number, headers: Headers, rateLimit: GitHubRateLimitInfo): ReleaseError {
  const retryAfterRaw = headers.get('retry-after');
  const retryAfterSeconds =
    retryAfterRaw !== null && /^\d+$/.test(retryAfterRaw)
      ? Number.parseInt(retryAfterRaw, 10)
      : undefined;

  if (status === 404) {
    return {
      code: 'NOT_FOUND',
      message: 'Requested release or repository was not found on GitHub.',
      statusCode: 404,
    };
  }

  if (status === 429 || (status === 403 && rateLimit.remaining === 0)) {
    return {
      code: 'RATE_LIMITED',
      message: 'GitHub API rate limit exceeded. Please try again later.',
      statusCode: status,
      retryAfterSeconds,
    };
  }

  return {
    code: 'UPSTREAM_ERROR',
    message: `GitHub Releases API returned HTTP ${status}.`,
    statusCode: status,
  };
}

export class GitHubReleaseProvider {
  private readonly owner: string;
  private readonly repo: string;
  private readonly apiBaseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(config: GitHubProviderConfig = {}) {
    this.owner = config.owner ?? DEFAULT_OWNER;
    this.repo = config.repo ?? DEFAULT_REPO;
    this.apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/+$/, '');
    this.token = config.token;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private buildHeaders(etag?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (etag) {
      headers['If-None-Match'] = etag;
    }
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async requestJson(url: string, etag?: string): Promise<ProviderResponse<unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: this.buildHeaders(etag),
        signal: controller.signal,
      });

      const rateLimit = parseRateLimitHeaders(response.headers);
      const responseEtag = response.headers.get('etag') ?? undefined;

      if (response.status === 304) {
        return {
          ok: true,
          notModified: true,
          data: null,
          etag: responseEtag ?? etag,
          rateLimit,
          error: null,
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          notModified: false,
          data: null,
          etag: responseEtag,
          rateLimit,
          error: mapHttpError(response.status, response.headers, rateLimit),
        };
      }

      let parsed: unknown;
      try {
        parsed = await response.json();
      } catch {
        return {
          ok: false,
          notModified: false,
          data: null,
          rateLimit,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'GitHub API returned invalid JSON.',
            statusCode: response.status,
          },
        };
      }

      return {
        ok: true,
        notModified: false,
        data: parsed,
        etag: responseEtag,
        hasNextPage: parseHasNextPage(response.headers.get('link')),
        rateLimit,
        error: null,
      };
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return {
        ok: false,
        notModified: false,
        data: null,
        rateLimit: {},
        error: {
          code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isAbort
            ? `GitHub API request timed out after ${this.timeoutMs}ms.`
            : 'Unable to reach GitHub Releases API.',
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async fetchReleasesPage(
    page = 1,
    perPage = 30,
    etag?: string
  ): Promise<ProviderResponse<Release[]>> {
    const safePage = Math.max(1, Math.floor(page));
    const safePerPage = Math.min(100, Math.max(1, Math.floor(perPage)));
    const url = `${this.apiBaseUrl}/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/releases?page=${safePage}&per_page=${safePerPage}`;

    const result = await this.requestJson(url, etag);
    if (!result.ok || result.notModified) {
      return {
        ...result,
        data: null,
      };
    }

    const validated = validateGitHubReleaseList(result.data);
    if (validated === null) {
      return {
        ok: false,
        notModified: false,
        data: null,
        rateLimit: result.rateLimit,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'GitHub Releases API returned an unexpected payload shape.',
        },
      };
    }

    return {
      ok: true,
      notModified: false,
      data: validated.map(normalizeRelease),
      etag: result.etag,
      hasNextPage: result.hasNextPage ?? false,
      rateLimit: result.rateLimit,
      error: null,
    };
  }

  async fetchReleaseByTag(tag: string, etag?: string): Promise<ProviderResponse<Release>> {
    const safeTag = sanitizeTag(tag);
    if (!safeTag) {
      return {
        ok: false,
        notModified: false,
        data: null,
        rateLimit: {},
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid release tag provided.',
        },
      };
    }

    const url = `${this.apiBaseUrl}/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/releases/tags/${encodeURIComponent(safeTag)}`;
    const result = await this.requestJson(url, etag);

    if (!result.ok || result.notModified) {
      return {
        ...result,
        data: null,
      };
    }

    const validated = validateGitHubRelease(result.data);
    if (!validated) {
      return {
        ok: false,
        notModified: false,
        data: null,
        rateLimit: result.rateLimit,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'GitHub Release endpoint returned an unexpected payload shape.',
        },
      };
    }

    return {
      ok: true,
      notModified: false,
      data: normalizeRelease(validated),
      etag: result.etag,
      rateLimit: result.rateLimit,
      error: null,
    };
  }
}

