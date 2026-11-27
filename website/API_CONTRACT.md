# ATHENA.IDE Website — Backend & Frontend API Contract

**Owner:** Himanshu (Ansh) (`ansh-dev`)  
**Frontend Consumer:** Chandan (`chandan-dev`)  
**Source Repository:** `Chandan11op/ATHENA.IDE`

---

## 1. Architecture Decision

We selected **Option A (Modular Static-Ready Data Adapter)** designed to run identically in the browser (React/Vite static hosting) and in Node.js (SSR, serverless routes, or build-time manifest generation), with **zero extra runtime dependencies, zero database, and zero exposed secrets**:

- **Why Option A fits best:** GitHub Releases is the single source of truth; official GitHub asset URLs serve binary downloads directly without hosting or proxying files; and `ETag` conditional requests + in-memory TTL/stale caching keep unauthenticated GitHub API usage (`60 req/hr/IP`) efficient.
- **No Raw GitHub Coupling:** Frontend components import only from `website/src/backend/index.ts` and receive normalized application types (`Release`, `ReleaseAsset`, `ReleaseResult<T>`).
- **Security:** No tokens are stored or embedded in frontend code. Server-side callers may optionally inject `GITHUB_TOKEN` via `createReleaseApi({ provider: { token } })` from environment variables.

---

## 2. Public Contract (`website/src/backend/index.ts`)

### Methods

1. `getLatestStableRelease(options?: GetLatestReleaseOptions): Promise<ReleaseResult<Release | null>>`
   - Default `channel: 'stable'` excludes `isDraft` and `isPrerelease`.
   - Pass `{ channel: 'prerelease' }` for beta/prerelease channel.
   - Scans paginated releases (up to 5 pages by default) if recent entries are drafts/prereleases.
   - Returns `status: 'empty', data: null` if no eligible release exists.

2. `getAllReleases(options?: GetReleasesOptions): Promise<ReleaseResult<PaginatedReleases>>`
   - `options`: `{ page?: number, perPage?: number, includePrereleases?: boolean, channel?: 'stable' | 'prerelease', version?: string, bypassCache?: boolean }`.
   - Always excludes drafts.
   - `data`: `{ releases, page, perPage, hasNextPage, totalReturned }`.
   - Note: `hasNextPage` reflects upstream GitHub pagination (`Link: rel="next"`).

3. `getReleaseByTag(tag: string, options?: { bypassCache?: boolean }): Promise<ReleaseResult<Release | null>>`
   - Sanitizes `tag` before querying `/releases/tags/{tag}`.
   - Returns `status: 'not_found', data: null` for missing or draft releases.
   - Returns `status: 'error'` with `error.code === 'INVALID_INPUT'` for malformed tags.

4. `getAvailableDownloads(release: Release | null): AvailableDownloads`
   - Synchronous helper over a `Release` (safe with `null`).
   - Separates primary `installers` from `otherAssets` (checksums, signatures, blockmaps) and groups `byPlatform` (`Windows`, `macOS`, `Linux`, `Unknown`).
   - Preserves unclassified `Unknown` installers so the UI can show a generic download rather than hiding files.

5. `getReleaseAssetMetadata(release: Release | null): ReleaseAssetMetadata`
   - Synchronous helper returning `{ releaseTag, version, totalAssets, availableAssets, totalSizeBytes, hasChecksums, assets }`.

6. `invalidateReleaseCache(key?: string): void`
   - Clears a single key or the entire cache.

---

## 3. Response Envelope, States & Errors

Every async API method resolves to `ReleaseResult<T>` (never throws on network/API errors):

```ts
interface ReleaseResult<T> {
  ok: boolean;
  status: 'ok' | 'empty' | 'not_found' | 'error';
  data: T;
  error: ReleaseError | null;
  meta: ResponseMeta;
}
```

### Handling States in the Frontend

- **Loading:** Render skeleton/loading state while promise is pending.
- **Empty (`result.ok && result.status === 'empty'`):** No published releases exist yet. Show "No releases published yet" and link to `https://github.com/Chandan11op/ATHENA.IDE/releases`. Never show fake download buttons.
- **Not Found (`result.ok && result.status === 'not_found'`):** Requested tag does not exist.
- **Stale Fallback (`result.ok && result.meta.isStale`):** Upstream GitHub API failed or rate-limited, so cached data (up to 1 hour old) is shown. Display a subtle notice (e.g., `"Showing cached release info; live check failed"`) using `meta.fetchedAt`.
- **Error (`!result.ok && result.status === 'error'`):** No fresh or stale data available. Inspect `result.error.code`:
  - `'RATE_LIMITED'` (includes optional `retryAfterSeconds` and `meta.rateLimitResetAt`)
  - `'NETWORK_ERROR'` / `'TIMEOUT'`
  - `'UPSTREAM_ERROR'` / `'INVALID_RESPONSE'`
  - `'INVALID_INPUT'`
  - `'NOT_FOUND'`

---

## 4. Caching Policy

- **Fresh TTL:** `5 minutes` (`300_000 ms`) in-memory cache per query key.
- **ETag Revalidation:** Expired entries send `If-None-Match`; GitHub `304 Not Modified` refreshes TTL without consuming unauthenticated rate-limit quota.
- **Stale-While-Error:** Up to `1 hour` (`3_600_000 ms`) fallback during transient upstream/network/rate-limit errors, explicitly flagged with `meta.isStale = true` and `meta.source = 'cache'`.

---

## 5. Minimal Frontend Usage Example

```ts
import {
  getLatestStableRelease,
  getAvailableDownloads,
} from '../backend';

const res = await getLatestStableRelease();
if (res.ok && res.status === 'ok' && res.data) {
  const downloads = getAvailableDownloads(res.data);
  // Render downloads.byPlatform.Windows, downloads.byPlatform.macOS, etc.
  // If res.meta.isStale is true, show a non-blocking stale-data indicator.
} else if (res.ok && res.status === 'empty') {
  // Show clean "No releases published yet" empty state.
} else {
  // Show graceful error message from res.error?.message.
}
```

