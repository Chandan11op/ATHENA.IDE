import type {
  Architecture,
  AssetFormat,
  ChecksumType,
  Platform,
} from '../types/release.js';

export interface AssetClassification {
  platform: Platform;
  architecture: Architecture;
  format: AssetFormat;
  isInstaller: boolean;
}

export interface ParsedChecksum {
  checksum: string;
  checksumType: ChecksumType;
}

const NON_INSTALLER_FORMATS = new Set<AssetFormat>([
  'blockmap',
  'checksum',
  'signature',
]);

const EXTENSION_RULES: Array<{ suffix: string; format: AssetFormat; platform?: Platform }> = [
  { suffix: '.tar.gz', format: 'tar.gz' },
  { suffix: '.tgz', format: 'tar.gz' },
  { suffix: '.appimage', format: 'appimage', platform: 'Linux' },
  { suffix: '.blockmap', format: 'blockmap' },
  { suffix: '.sha256sum', format: 'checksum' },
  { suffix: '.sha256', format: 'checksum' },
  { suffix: '.sha512', format: 'checksum' },
  { suffix: '.sig', format: 'signature' },
  { suffix: '.asc', format: 'signature' },
  { suffix: '.exe', format: 'exe', platform: 'Windows' },
  { suffix: '.msi', format: 'msi', platform: 'Windows' },
  { suffix: '.dmg', format: 'dmg', platform: 'macOS' },
  { suffix: '.pkg', format: 'pkg', platform: 'macOS' },
  { suffix: '.deb', format: 'deb', platform: 'Linux' },
  { suffix: '.rpm', format: 'rpm', platform: 'Linux' },
  { suffix: '.zip', format: 'zip' },
];

function detectFormat(lowerName: string): { format: AssetFormat; platformFromExt?: Platform } {
  if (
    lowerName === 'sha256sums' ||
    lowerName === 'sha256sums.txt' ||
    lowerName === 'checksums.txt' ||
    lowerName.endsWith('.sha256.txt') ||
    lowerName.endsWith('.sha512.txt')
  ) {
    return { format: 'checksum' };
  }

  for (const rule of EXTENSION_RULES) {
    if (lowerName.endsWith(rule.suffix)) {
      return { format: rule.format, platformFromExt: rule.platform };
    }
  }

  return { format: 'unknown' };
}

function detectPlatform(lowerName: string, format: AssetFormat, platformFromExt?: Platform): Platform {
  if (NON_INSTALLER_FORMATS.has(format)) {
    return 'Unknown';
  }
  if (platformFromExt) {
    return platformFromExt;
  }

  if (/(^|[-_.\s])(win|win32|win64|windows)([-_.\s]|$)/.test(lowerName)) {
    return 'Windows';
  }
  if (/(^|[-_.\s])(mac|macos|darwin|osx)([-_.\s]|$)/.test(lowerName)) {
    return 'macOS';
  }
  if (/(^|[-_.\s])(linux)([-_.\s]|$)/.test(lowerName)) {
    return 'Linux';
  }

  return 'Unknown';
}

function detectArchitecture(lowerName: string, format: AssetFormat): Architecture {
  if (NON_INSTALLER_FORMATS.has(format)) {
    return 'unknown';
  }
  if (/(^|[-_.\s])universal([-_.\s]|$)/.test(lowerName)) {
    return 'universal';
  }
  if (/(^|[-_.\s])(arm64|aarch64)([-_.\s]|$)/.test(lowerName)) {
    return 'arm64';
  }
  if (/(^|[-_.\s])(x64|x86_64|x86-64|amd64|win64)([-_.\s]|$)/.test(lowerName)) {
    return 'x64';
  }

  return 'unknown';
}

/**
 * Classifies a GitHub release asset conservatively from its filename.
 * Uncertain classifications fall back to 'Unknown' / 'unknown' rather than guessing.
 */
export function classifyAssetName(assetName: string): AssetClassification {
  const lowerName = assetName.trim().toLowerCase();
  const { format, platformFromExt } = detectFormat(lowerName);
  const isInstaller = format !== 'unknown' && !NON_INSTALLER_FORMATS.has(format);
  const platform = detectPlatform(lowerName, format, platformFromExt);
  const architecture = detectArchitecture(lowerName, format);

  return {
    platform,
    architecture,
    format,
    isInstaller,
  };
}

/**
 * Extracts per-filename SHA-256 or SHA-512 checksums from release notes when
 * a hex digest and exact asset filename appear on the same line.
 */
export function extractChecksumsFromBody(body: string): Map<string, ParsedChecksum> {
  const map = new Map<string, ParsedChecksum>();
  if (!body) {
    return map;
  }

  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const sha512Match = line.match(/\b([a-fA-F0-9]{128})\b/);
    const sha256Match = !sha512Match ? line.match(/\b([a-fA-F0-9]{64})\b/) : null;
    const digest = sha512Match?.[1] ?? sha256Match?.[1];
    if (!digest) {
      continue;
    }

    const checksumType: ChecksumType = sha512Match ? 'sha512' : 'sha256';
    const checksum = digest.toLowerCase();

    // Match standard `<hash>  <filename>` or `<filename>: <hash>` styles
    const tokens = line
      .replace(/[`*:|]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.toLowerCase() !== checksum && !/^sha(256|512)$/i.test(t));

    for (const token of tokens) {
      if (/\.[a-z0-9]{2,10}$/i.test(token)) {
        map.set(token.toLowerCase(), { checksum, checksumType });
      }
    }
  }

  return map;
}

