# ATHENA.IDE Website — Frontend API Contract

**Frontend Owner:** Chandan (`chandan-dev`)  
**Backend / Release Logic Owner:** Himanshu (`ansh-dev`)

This document defines the data contracts, endpoints, and UI state expectations between the ATHENA.IDE official website frontend (`website/`) and the backend/release service.

The frontend is strictly decoupled from GitHub API logic and release-storage internals. All release fetching is isolated behind `src/services/releaseAdapter.ts` implementing the `ReleaseDataAdapter` interface.

---

## 1. Expected Endpoints (REST / JSON)

Base URL is configurable via `VITE_API_BASE_URL` (e.g. `https://api.athenaide.dev` or `/api`).

| Method | Path | Description | Response Type |
| :--- | :--- | :--- | :--- |
| `GET` | `/releases/latest` | Fetch the latest stable release (or `null` if none published) | `ApiResponse<Release \| null>` |
| `GET` | `/releases` | Fetch paginated/filtered list of releases | `ApiResponse<ReleaseListPayload>` |
| `GET` | `/releases/:tag` | Fetch a single release by tag or version (e.g., `v0.1.0`) | `ApiResponse<Release>` |

### Query Parameters for `GET /releases`
- `channel`: `'all' | 'stable' | 'beta' | 'alpha'` (optional)
- `platform`: `'all' | 'windows' | 'macos' | 'linux'` (optional)
- `search`: string query matching version, tag, title, or notes (optional)
- `page`: 1-based page index (optional, default `1`)
- `pageSize`: items per page (optional, default `10`)

---

## 2. TypeScript Data Contracts

See `src/types/release.ts` for the exact canonical definitions.

### `Release`
```ts
export type ReleaseChannel = 'stable' | 'beta' | 'alpha';
export type PlatformId = 'windows' | 'macos' | 'linux';
export type Architecture = 'x64' | 'arm64' | 'universal';

export interface ReleaseAsset {
  id: string;
  platform: PlatformId;
  architecture: Architecture;
  fileName: string;
  downloadUrl: string;
  fileSizeBytes?: number;
  checksumSha256?: string;
  assetType: 'installer' | 'portable' | 'archive' | 'package';
  installerFormat: string; // e.g. '.exe', '.msi', '.dmg', '.AppImage', '.deb'
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
  version: string;          // e.g. "0.1.0"
  tag: string;              // e.g. "v0.1.0"
  title: string;
  description: string;
  releaseDate: string;      // ISO 8601 date string
  releaseNotes: string;     // Markdown or plain text summary
  changelog?: ReleaseChangelog;
  releaseChannel: ReleaseChannel;
  isPrerelease: boolean;
  compatibility: ReleaseCompatibility;
  assets: ReleaseAsset[];
}
```

### `ReleaseListPayload`
```ts
export interface ReleaseListPayload {
  releases: Release[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

### `ApiResponse<T>`
```ts
export interface ApiResponse<T> {
  data: T;
  fetchedAt: string; // ISO 8601 timestamp
  source: 'api' | 'mock';
}
```

---

## 3. Required UI States

The frontend handles four explicit states for every release-driven view (Download, Release Archive, Release Detail):

1. **`loading`**: Skeleton placeholders while `ReleaseDataAdapter` resolves.
2. **`error`**: Non-blocking alert banner with error message, retry button, and fallback link to the GitHub repository releases page.
3. **`empty` / `unavailable`**:
   - If no releases are published yet, the Download page shows platform cards in an explicit **"Not Yet Published / Coming Soon"** state without inventing download URLs.
   - If a release exists for Windows but not macOS or Linux, only Windows shows a live Download button; macOS and Linux show **"Not available in this release"**.
4. **`ready`**: Displays verified assets, file sizes, SHA-256 checksums (when provided), and direct download triggers.

---

## 4. Swapping the Mock Adapter for the Live Backend

Currently, `src/services/releaseAdapter.ts` exports `releaseService`, which defaults to `MockReleaseAdapter` when `VITE_API_BASE_URL` is not set.

To connect Himanshu's backend (`ansh-dev`):
1. Implement `HttpReleaseAdapter` (scaffolded in `src/services/releaseAdapter.ts`) against the endpoints in Section 1.
2. Set `VITE_API_BASE_URL` in `.env` (or deployment environment).
3. No UI component changes are required.
