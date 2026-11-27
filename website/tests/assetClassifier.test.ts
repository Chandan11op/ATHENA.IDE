import { describe, it, expect } from 'vitest';
import {
  classifyAssetName,
  extractChecksumsFromBody,
} from '../src/backend/adapters/assetClassifier.js';

describe('assetClassifier', () => {
  it('detects Windows, macOS, and Linux installers with architectures', () => {
    expect(classifyAssetName('Athena.IDE-Setup-0.1.0-x64.exe')).toEqual({
      platform: 'Windows',
      architecture: 'x64',
      format: 'exe',
      isInstaller: true,
    });

    expect(classifyAssetName('Athena.IDE-0.1.0-arm64.msi')).toEqual({
      platform: 'Windows',
      architecture: 'arm64',
      format: 'msi',
      isInstaller: true,
    });

    expect(classifyAssetName('Athena.IDE-0.1.0-universal.dmg')).toEqual({
      platform: 'macOS',
      architecture: 'universal',
      format: 'dmg',
      isInstaller: true,
    });

    expect(classifyAssetName('Athena.IDE-0.1.0-x86_64.AppImage')).toEqual({
      platform: 'Linux',
      architecture: 'x64',
      format: 'appimage',
      isInstaller: true,
    });

    expect(classifyAssetName('athena-ide_0.1.0_amd64.deb')).toEqual({
      platform: 'Linux',
      architecture: 'x64',
      format: 'deb',
      isInstaller: true,
    });
  });

  it('classifies archives by explicit platform tokens and leaves ambiguous files Unknown', () => {
    expect(classifyAssetName('athena-ide-darwin-arm64.zip')).toEqual({
      platform: 'macOS',
      architecture: 'arm64',
      format: 'zip',
      isInstaller: true,
    });

    expect(classifyAssetName('athena-ide-linux-x64.tar.gz')).toEqual({
      platform: 'Linux',
      architecture: 'x64',
      format: 'tar.gz',
      isInstaller: true,
    });

    expect(classifyAssetName('athena-bundle.zip')).toEqual({
      platform: 'Unknown',
      architecture: 'unknown',
      format: 'zip',
      isInstaller: true,
    });

    expect(classifyAssetName('release-notes-artifact.bin')).toEqual({
      platform: 'Unknown',
      architecture: 'unknown',
      format: 'unknown',
      isInstaller: false,
    });
  });

  it('marks checksum, signature, and blockmap files as non-installers', () => {
    expect(classifyAssetName('Athena.IDE-Setup.exe.blockmap')).toEqual({
      platform: 'Unknown',
      architecture: 'unknown',
      format: 'blockmap',
      isInstaller: false,
    });

    expect(classifyAssetName('SHA256SUMS.txt').isInstaller).toBe(false);
    expect(classifyAssetName('Athena.IDE.dmg.sha256').format).toBe('checksum');
    expect(classifyAssetName('Athena.IDE.AppImage.asc').format).toBe('signature');
  });

  it('extracts SHA-256 and SHA-512 checksums from release notes', () => {
    const sha256 = 'a'.repeat(64);
    const sha512 = 'b'.repeat(128);
    const body = [
      '### Checksums',
      `${sha256}  Athena.IDE-Setup-0.1.0-x64.exe`,
      `- \`Athena.IDE-0.1.0-arm64.dmg\`: \`${sha512}\``,
    ].join('\n');

    const checksums = extractChecksumsFromBody(body);
    expect(checksums.get('athena.ide-setup-0.1.0-x64.exe')).toEqual({
      checksum: sha256,
      checksumType: 'sha256',
    });
    expect(checksums.get('athena.ide-0.1.0-arm64.dmg')).toEqual({
      checksum: sha512,
      checksumType: 'sha512',
    });
  });
});

