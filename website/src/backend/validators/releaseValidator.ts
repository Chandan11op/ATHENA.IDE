import type { RawGitHubAssetDto, RawGitHubReleaseDto } from '../types/release.js';

const ALLOWED_GITHUB_HOSTS = new Set([
  'github.com',
  'api.github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'github-releases.githubusercontent.com',
]);

/** Validates that a URL is HTTPS and hosted on an official GitHub domain. */
export function isValidGitHubHttpsUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return false;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_GITHUB_HOSTS.has(host) || host.endsWith('.githubusercontent.com');
  } catch {
    return false;
  }
}

export function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

/** Validates and normalizes a release tag before embedding it in API requests. */
export function sanitizeTag(tag: unknown): string | null {
  if (typeof tag !== 'string') {
    return null;
  }
  const trimmed = tag.trim();
  if (trimmed.length === 0 || trimmed.length > 128) {
    return null;
  }
  // Reject control characters, whitespace, query/fragment delimiters, backslashes, and traversal
  if (/[\s?#\\\u0000-\u001f\u007f]/.test(trimmed) || trimmed.includes('..')) {
    return null;
  }
  return trimmed;
}

export function validateGitHubAsset(raw: unknown): RawGitHubAssetDto | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== 'number' || !Number.isInteger(obj.id) || obj.id <= 0) {
    return null;
  }
  if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
    return null;
  }
  if (!isValidGitHubHttpsUrl(obj.browser_download_url)) {
    return null;
  }

  const size =
    typeof obj.size === 'number' && Number.isFinite(obj.size) && obj.size >= 0
      ? obj.size
      : null;

  return {
    id: obj.id,
    name: obj.name.trim(),
    browser_download_url: obj.browser_download_url,
    size,
    content_type: typeof obj.content_type === 'string' ? obj.content_type : null,
    state: typeof obj.state === 'string' ? obj.state : null,
    updated_at: isValidIsoDate(obj.updated_at) ? obj.updated_at : null,
  };
}

export function validateGitHubRelease(raw: unknown): RawGitHubReleaseDto | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== 'number' || !Number.isInteger(obj.id) || obj.id <= 0) {
    return null;
  }
  if (typeof obj.tag_name !== 'string' || obj.tag_name.trim().length === 0) {
    return null;
  }
  if (!isValidGitHubHttpsUrl(obj.html_url)) {
    return null;
  }
  if (typeof obj.draft !== 'boolean' || typeof obj.prerelease !== 'boolean') {
    return null;
  }

  const rawAssets = Array.isArray(obj.assets) ? obj.assets : [];
  const assets: RawGitHubAssetDto[] = [];
  for (const item of rawAssets) {
    const validatedAsset = validateGitHubAsset(item);
    if (validatedAsset) {
      assets.push(validatedAsset);
    }
  }

  return {
    id: obj.id,
    tag_name: obj.tag_name.trim(),
    name: typeof obj.name === 'string' ? obj.name : null,
    body: typeof obj.body === 'string' ? obj.body : null,
    draft: obj.draft,
    prerelease: obj.prerelease,
    created_at: isValidIsoDate(obj.created_at) ? obj.created_at : null,
    published_at: isValidIsoDate(obj.published_at) ? obj.published_at : null,
    updated_at: isValidIsoDate(obj.updated_at) ? obj.updated_at : null,
    html_url: obj.html_url,
    assets,
  };
}

export function validateGitHubReleaseList(raw: unknown): RawGitHubReleaseDto[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const validated: RawGitHubReleaseDto[] = [];
  for (const item of raw) {
    const release = validateGitHubRelease(item);
    if (release) {
      validated.push(release);
    }
  }
  return validated;
}
