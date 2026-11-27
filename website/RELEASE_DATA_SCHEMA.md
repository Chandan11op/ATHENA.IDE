# ATHENA.IDE Website — Release Data Schema

**Owner:** Himanshu (Ansh) — Branch `ansh-dev`  
**Source of Truth:** GitHub Releases for [`Chandan11op/ATHENA.IDE`](https://github.com/Chandan11op/ATHENA.IDE/releases)

---

## 1. Design Principles

1. **Real Data Only:** Every release, version, changelog, asset size, checksum, and download URL comes from validated GitHub Releases API payloads. Nothing is fabricated when no releases exist.
2. **Conservative Classification:** Platform and architecture are inferred from filenames only when unambiguous (e.g., `.exe`/`.msi` → `Windows`, `.dmg`/`.pkg` → `macOS`, `.AppImage`/`.deb`/`.rpm` → `Linux`). Ambiguous files remain `Unknown` / `unknown` and are still exposed to the UI so valid downloads are never hidden.
3. **Security First:** Only `https:` URLs hosted on official GitHub domains (`github.com`, `api.github.com`, `*.githubusercontent.com`) pass validation. Draft releases are always excluded.

---

## 2. Core Data Models

### `Release`

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | GitHub release numeric ID |
| `tagName` | `string` | Raw Git tag (e.g. `v0.1.0`) |
| `version` | `string` | Normalized version string (leading `v`/`V` stripped when followed by `major.minor...`) |
| `title` | `string` | Release title (falls back to `tagName` if GitHub `name` is empty) |
| `description` | `string` | Plain-text summary extracted from the first non-heading paragraph of `body` (`""` if absent) |
| `body` | `string` | Raw Markdown changelog from GitHub release notes (`""` if absent) |
| `publishedAt` | `string \| null` | ISO-8601 publication timestamp |
| `updatedAt` | `string \| null` | ISO-8601 timestamp (`updated_at`, `published_at`, or `created_at`) |
| `isPrerelease` | `boolean` | GitHub prerelease flag |
| `isDraft` | `boolean` | Always `false` for returned releases (drafts are filtered out) |
| `releaseUrl` | `string` | Validated HTTPS URL to the GitHub release page |
| `assets` | `ReleaseAsset[]` | Validated and classified release assets |
| `compatibility` | `ReleaseCompatibility` | Summary derived from available installer assets |
| `channel` | `'stable' \| 'prerelease'` | Release channel derived from `isPrerelease` |

### `ReleaseAsset`

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | GitHub asset numeric ID |
| `name` | `string` | Original asset filename |
| `platform` | `'Windows' \| 'macOS' \| 'Linux' \| 'Unknown'` | Conservative OS classification |
| `architecture` | `'x64' \| 'arm64' \| 'universal' \| 'unknown'` | Conservative CPU architecture classification |
| `format` | `AssetFormat` | `'exe' \| 'msi' \| 'dmg' \| 'pkg' \| 'appimage' \| 'deb' \| 'rpm' \| 'tar.gz' \| 'zip' \| 'blockmap' \| 'checksum' \| 'signature' \| 'unknown'` |
| `isInstaller` | `boolean` | `true` for desktop installers/archives; `false` for `.blockmap`, `.sha256`, `.sig`, `.asc`, or unrecognized files |
| `downloadUrl` | `string` | Validated HTTPS GitHub release download URL |
| `sizeBytes` | `number \| null` | Asset size in bytes |
| `contentType` | `string \| null` | MIME content type reported by GitHub |
| `checksum` | `string \| null` | Hex digest matched from release notes (if provided) |
| `checksumType` | `'sha256' \| 'sha512' \| 'unknown' \| null` | Digest algorithm when `checksum` is present |
| `isAvailable` | `boolean` | `true` when GitHub asset `state === 'uploaded'` or `null`; `false` for incomplete (`'starter'`) uploads |

### `ReleaseCompatibility`

| Field | Type | Description |
| :--- | :--- | :--- |
| `supportedPlatforms` | `Platform[]` | Unique non-`Unknown` platforms with at least one available installer |
| `supportedArchitectures` | `Architecture[]` | Unique non-`unknown` architectures with at least one available installer |
| `hasInstallers` | `boolean` | `true` if at least one available installer/archive exists |

### `AvailableDownloads` & `ReleaseAssetMetadata`

- `AvailableDownloads` groups available assets into `installers`, `otherAssets` (checksums, signatures, blockmaps), `byPlatform`, and `platformsAvailable`, plus `hasDownloads: boolean`.
- `ReleaseAssetMetadata` summarizes `totalAssets`, `availableAssets`, `totalSizeBytes`, `hasChecksums`, and `assets`.

---

## 3. Future Automation Compatibility

The schema is directly compatible with future GitHub Actions desktop release workflows (e.g., `electron-builder` producing `.exe`, `.dmg`, `.AppImage`, `.deb`, `.blockmap`, and `SHA256SUMS.txt` or inline release-body checksums). Future CI releases will automatically populate platform matrices, download cards, and checksum badges without changing the contract.

