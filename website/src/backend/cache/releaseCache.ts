export interface CacheEntry<T> {
  value: T;
  etag?: string;
  storedAt: number;
  fetchedAtIso: string;
}

export interface ReleaseCacheOptions {
  /** Duration in ms before a cached entry is considered stale. Default: 5 minutes. */
  ttlMs?: number;
  /** Maximum age in ms for serving stale data during upstream errors. Default: 1 hour. */
  staleTtlMs?: number;
  /** Maximum number of distinct cache keys retained. Default: 50. */
  maxEntries?: number;
  /** Clock provider (injectable for deterministic testing). */
  now?: () => number;
}

export class ReleaseCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;
  private readonly staleTtlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: ReleaseCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
    this.staleTtlMs = options.staleTtlMs ?? 60 * 60 * 1000;
    this.maxEntries = options.maxEntries ?? 50;
    this.now = options.now ?? (() => Date.now());
  }

  getFresh<T>(key: string): CacheEntry<T> | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }
    const age = this.now() - entry.storedAt;
    if (age <= this.ttlMs) {
      return entry;
    }
    return null;
  }

  getStale<T>(key: string): CacheEntry<T> | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }
    const age = this.now() - entry.storedAt;
    if (age <= this.staleTtlMs) {
      return entry;
    }
    this.store.delete(key);
    return null;
  }

  getRawEntry<T>(key: string): CacheEntry<T> | null {
    return (this.store.get(key) as CacheEntry<T> | undefined) ?? null;
  }

  set<T>(key: string, value: T, etag?: string): CacheEntry<T> {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    const timestamp = this.now();
    const entry: CacheEntry<T> = {
      value,
      etag,
      storedAt: timestamp,
      fetchedAtIso: new Date(timestamp).toISOString(),
    };

    // Refresh insertion order for simple LRU eviction
    this.store.delete(key);
    this.store.set(key, entry);
    return entry;
  }

  /** Extends freshness of an existing cached entry after a 304 Not Modified response. */
  touch<T>(key: string, etag?: string): CacheEntry<T> | null {
    const existing = this.store.get(key) as CacheEntry<T> | undefined;
    if (!existing) {
      return null;
    }
    const timestamp = this.now();
    const updated: CacheEntry<T> = {
      value: existing.value,
      etag: etag ?? existing.etag,
      storedAt: timestamp,
      fetchedAtIso: new Date(timestamp).toISOString(),
    };
    this.store.delete(key);
    this.store.set(key, updated);
    return updated;
  }

  invalidate(key?: string): void {
    if (key === undefined) {
      this.store.clear();
      return;
    }
    this.store.delete(key);
  }

  size(): number {
    return this.store.size;
  }
}

