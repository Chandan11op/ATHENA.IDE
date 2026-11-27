import { describe, it, expect } from 'vitest';
import { ReleaseCache } from '../src/backend/cache/releaseCache.js';

describe('ReleaseCache', () => {
  it('returns fresh entries within TTL and falls back to stale entries within staleTtl', () => {
    let clock = 1000;
    const cache = new ReleaseCache({
      ttlMs: 500,
      staleTtlMs: 2000,
      now: () => clock,
    });

    cache.set('k1', { value: 'v1' }, '"etag-1"');
    expect(cache.getFresh('k1')?.value).toEqual({ value: 'v1' });

    clock += 600; // expired fresh TTL, within staleTtl
    expect(cache.getFresh('k1')).toBeNull();
    expect(cache.getStale('k1')?.value).toEqual({ value: 'v1' });

    clock += 2000; // past staleTtl
    expect(cache.getStale('k1')).toBeNull();
  });

  it('refreshes entry age on touch and supports invalidation and LRU eviction', () => {
    let clock = 1000;
    const cache = new ReleaseCache({
      ttlMs: 500,
      staleTtlMs: 2000,
      maxEntries: 2,
      now: () => clock,
    });

    cache.set('k1', 'one', '"e1"');
    clock += 400;
    cache.touch('k1', '"e1-new"');
    clock += 300; // 300ms since touch -> still fresh
    expect(cache.getFresh('k1')?.value).toBe('one');
    expect(cache.getFresh('k1')?.etag).toBe('"e1-new"');

    cache.set('k2', 'two');
    cache.set('k3', 'three'); // evicts oldest ('k1')
    expect(cache.size()).toBe(2);
    expect(cache.getRawEntry('k1')).toBeNull();

    cache.invalidate('k2');
    expect(cache.size()).toBe(1);
    cache.invalidate();
    expect(cache.size()).toBe(0);
  });

  it('persists entries and ETags across cache instances when Storage is available', () => {
    const backing = new Map<string, string>();
    const storage = {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => {
        backing.set(k, v);
      },
      removeItem: (k: string) => {
        backing.delete(k);
      },
    };

    let clock = 1000;
    const cache1 = new ReleaseCache({ ttlMs: 500, staleTtlMs: 2000, storage, now: () => clock });
    cache1.set('k1', { tag: 'v0.1.0' }, '"etag-1"');

    // Simulate page reload with a brand-new ReleaseCache instance using the same storage
    clock += 200;
    const cache2 = new ReleaseCache({ ttlMs: 500, staleTtlMs: 2000, storage, now: () => clock });
    const restored = cache2.getFresh<{ tag: string }>('k1');
    expect(restored?.value).toEqual({ tag: 'v0.1.0' });
    expect(restored?.etag).toBe('"etag-1"');

    cache2.invalidate('k1');
    expect(backing.size).toBe(0);
  });
});

