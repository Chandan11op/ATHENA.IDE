import type {
  Architecture,
  Platform,
  RawGitHubAssetDto,
  RawGitHubReleaseDto,
  Release,
  ReleaseAsset,
  ReleaseCompatibility,
} from '../types/release.js';
import { classifyAssetName, extractChecksumsFromBody, type ParsedChecksum } from './assetClassifier.js';

/** Strips a leading "v" or "V" from semantic version tags (e.g. "v1.2.0" -> "1.2.0"). */
export function normalizeVersionFromTag(tagName: string): string {
  const trimmed = tagName.trim();
  const match = trimmed.match(/^[vV](\d+\.\d+.*)$/);
  return match?.[1] ?? trimmed;
}

/** Extracts a concise plain-text summary from the first non-heading markdown paragraph. */
export function extractDescriptionFromBody(body: string): string {
  if (!body) {
    return '';
  }

  const lines = body.split(/\r?\n/);
  const paragraphLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      if (paragraphLines.length > 0) {
        break;
      }
      continue;
    }
    if (line.startsWith('#') || line.startsWith('---') || line.startsWith('```')) {
      if (paragraphLines.length > 0) {
        break;
      }
      continue;
    }
    const cleaned = line
      .replace(/^[-*+]\s+/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[`*_]/g, '');
    paragraphLines.push(cleaned);
  }

  return paragraphLines.join(' ').trim().slice(0, 280);
}

export function normalizeAsset(
  rawAsset: RawGitHubAssetDto,
  checksumMap: Map<string, ParsedChecksum>
): ReleaseAsset {
  const classification = classifyAssetName(rawAsset.name);
  const parsedChecksum = checksumMap.get(rawAsset.name.toLowerCase());
  const isAvailable = rawAsset.state === null || rawAsset.state === 'uploaded';

  return {
    id: rawAsset.id,
    name: rawAsset.name,
    platform: classification.platform,
    architecture: classification.architecture,
    format: classification.format,
    isInstaller: classification.isInstaller,
    downloadUrl: rawAsset.browser_download_url,
    sizeBytes: rawAsset.size,
    contentType: rawAsset.content_type,
    checksum: parsedChecksum?.checksum ?? null,
    checksumType: parsedChecksum?.checksumType ?? null,
    isAvailable,
  };
}

function buildCompatibility(assets: ReleaseAsset[]): ReleaseCompatibility {
  const platforms = new Set<Platform>();
  const architectures = new Set<Architecture>();
  let hasInstallers = false;

  for (const asset of assets) {
    if (!asset.isAvailable || !asset.isInstaller) {
      continue;
    }
    hasInstallers = true;
    if (asset.platform !== 'Unknown') {
      platforms.add(asset.platform);
    }
    if (asset.architecture !== 'unknown') {
      architectures.add(asset.architecture);
    }
  }

  return {
    supportedPlatforms: Array.from(platforms),
    supportedArchitectures: Array.from(architectures),
    hasInstallers,
  };
}

export function normalizeRelease(raw: RawGitHubReleaseDto): Release {
  const body = raw.body ?? '';
  const checksumMap = extractChecksumsFromBody(body);
  const assets = raw.assets.map((asset) => normalizeAsset(asset, checksumMap));
  const version = normalizeVersionFromTag(raw.tag_name);
  const title = raw.name && raw.name.trim().length > 0 ? raw.name.trim() : raw.tag_name;

  return {
    id: raw.id,
    tagName: raw.tag_name,
    version,
    title,
    description: extractDescriptionFromBody(body),
    body,
    publishedAt: raw.published_at,
    updatedAt: raw.updated_at ?? raw.published_at ?? raw.created_at,
    isPrerelease: raw.prerelease,
    isDraft: raw.draft,
    releaseUrl: raw.html_url,
    assets,
    compatibility: buildCompatibility(assets),
    channel: raw.prerelease ? 'prerelease' : 'stable',
  };
}

