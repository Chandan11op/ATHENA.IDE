import { PlatformId } from '../types/release';

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes) || bytes <= 0) {
    return 'Size unavailable';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatReleaseDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function detectVisitorPlatform(): PlatformId {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = `${navigator.userAgent} ${navigator.platform ?? ''}`.toLowerCase();
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('linux') || ua.includes('x11')) return 'linux';
  return 'windows';
}

export function getPlatformLabel(platform: PlatformId): string {
  switch (platform) {
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
  }
}
