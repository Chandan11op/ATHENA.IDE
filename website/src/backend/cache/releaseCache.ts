export interface CacheEntry<T> {
  value: T;
  etag?: string;
  storedAt: number;
  fetchedAtIso: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ReleaseCacheOptions {
  /** Duration in ms before a cached entry is considered stale. Default: 5 minutes. */
  ttlMs?: number;
  /** Maximum age in ms for serving stale data during upstream errors. Default: 1 hour. */
  staleTtlMs?: number;
  /** Maximum number of distinct cache keys retained. Default: 50. */
  maxEntries?: number;
  /** Optional Storage backend (defaults to browser localStorage when available). */
  storage?: StorageLike | null;
  /** Prefix used for persisted keys in storage. */
  storagePrefix?: string;
  /** Clock provider (injectable for deterministic testing). */
  now?: () => number;
}

function getDefaultStorage(): StorageLike | null {
  try {
    const maybeStorage = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (
      maybeStorage &&
      typeof maybeStorage.getItem === 'function' &&
      typeof maybeStorage.setItem === 'function' &&
      typeof maybeStorage.removeItem === 'function'
    ) {
      return maybeStorage;
    }
  } catch {
    // Ignore storage access errors in restricted browser contexts
  }
  return null;
}

export class ReleaseCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;
  private readonly staleTtlMs: number;
  private readonly maxEntries: number;
  private readonly storage: StorageLike | null;
  private readonly storagePrefix: string;
  private readonly now: () => number;

  constructor(options: ReleaseCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
    this.staleTtlMs = options.staleTtlMs ?? 60 * 60 * 1000;
    this.maxEntries = options.maxEntries ?? 50;
    this.storage = options.storage === undefined ? getDefaultStorage() : options.storage;
    this.storagePrefix = options.storagePrefix ?? 'athena.ide.releaseCache:';
    this.now = options.now ?? (() => Date.now());
  }

  private storageKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }

  private readFromStorage<T>(key: string): CacheEntry<T> | null {
    if (!this.storage) {
      return null;
    }
    try {
      const raw = this.storage.getItem(this.storageKey(key));
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<CacheEntry<T>>;
      if (
        typeof parsed.storedAt !== 'number' ||
        typeof parsed.fetchedAtIso !== 'string' ||
        !('value' in parsed)
      ) {
        return null;
      }
      const entry: CacheEntry<T> = {
        value: parsed.value as T,
        etag: typeof parsed.etag === 'string' ? parsed.etag : undefined,
        storedAt: parsed.storedAt,
        fetchedAtIso: parsed.fetchedAtIso,
      };
      this.store.set(key, entry);
      return entry;
    } catch {
      return null;
    }
  }

  private writeToStorage<T>(key: string, entry: CacheEntry<T>): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(this.storageKey(key), JSON.stringify(entry));
    } catch {
      // Ignore quota or serialization errors
    }
  }

  private removeFromStorage(key: string): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.removeItem(this.storageKey(key));
    } catch {
      // Ignore storage errors
    }
  }

  getFresh<T>(key: string): CacheEntry<T> | null {
    const entry =
      (this.store.get(key) as CacheEntry<T> | undefined) ?? this.readFromStorage<T>(key);
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
    const entry =
      (this.store.get(key) as CacheEntry<T> | undefined) ?? this.readFromStorage<T>(key);
    if (!entry) {
      return null;
    }
    const age = this.now() - entry.storedAt;
    if (age <= this.staleTtlMs) {
      return entry;
    }
    this.store.delete(key);
    this.removeFromStorage(key);
    return null;
  }

  getRawEntry<T>(key: string): CacheEntry<T> | null {
    return (
      (this.store.get(key) as CacheEntry<T> | undefined) ??
      this.readFromStorage<T>(key) ??
      null
    );
  }

  set<T>(key: string, value: T, etag?: string): CacheEntry<T> {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
        this.removeFromStorage(oldestKey);
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
    this.writeToStorage(key, entry);
    return entry;
  }

  /** Extends freshness of an existing cached entry after a 304 Not Modified response. */
  touch<T>(key: string, etag?: string): CacheEntry<T> | null {
    const existing = this.getRawEntry<T>(key);
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
    this.writeToStorage(key, updated);
    return updated;
  }

  invalidate(key?: string): void {
    if (key === undefined) {
      for (const k of this.store.keys()) {
        this.removeFromStorage(k);
      }
      this.store.clear();
      return;
    }
    this.store.delete(key);
    this.removeFromStorage(key);
  }

  size(): number {
    return this.store.size;
  }
}
