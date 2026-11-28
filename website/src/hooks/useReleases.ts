import { useCallback, useEffect, useState } from 'react';
import { releaseService } from '@/services/releaseAdapter';
import {
  Release,
  ReleaseListPayload,
  ReleaseQueryParams,
} from '@/types/release';

export interface AsyncState<T> {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
  source: 'api' | 'mock' | null;
  isStale: boolean;
  fetchedAt: string | null;
  error: string | null;
  reload: (bypassCache?: boolean) => void;
}

export function useLatestRelease(): AsyncState<Release | null> {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<Release | null>(null);
  const [source, setSource] = useState<'api' | 'mock' | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reqState, setReqState] = useState({ nonce: 0, bypass: false });

  const reload = useCallback((bypassCache = true) => {
    setReqState((prev) => ({ nonce: prev.nonce + 1, bypass: bypassCache }));
  }, []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);

    releaseService
      .getLatestRelease(reqState.bypass)
      .then((res) => {
        if (!active) return;
        setData(res.data);
        setSource(res.source);
        setIsStale(Boolean(res.isStale));
        setFetchedAt(res.fetchedAt);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load latest release.');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [reqState]);

  return { status, data, source, isStale, fetchedAt, error, reload };
}

export function useReleaseList(params: ReleaseQueryParams): AsyncState<ReleaseListPayload> {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<ReleaseListPayload | null>(null);
  const [source, setSource] = useState<'api' | 'mock' | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reqState, setReqState] = useState({ nonce: 0, bypass: false });

  const reload = useCallback((bypassCache = true) => {
    setReqState((prev) => ({ nonce: prev.nonce + 1, bypass: bypassCache }));
  }, []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);

    releaseService
      .listReleases({
        channel: params.channel,
        platform: params.platform,
        search: params.search,
        page: params.page,
        pageSize: params.pageSize,
        bypassCache: reqState.bypass,
      })
      .then((res) => {
        if (!active) return;
        setData(res.data);
        setSource(res.source);
        setIsStale(Boolean(res.isStale));
        setFetchedAt(res.fetchedAt);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load releases.');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [params.channel, params.platform, params.search, params.page, params.pageSize, reqState]);

  return { status, data, source, isStale, fetchedAt, error, reload };
}

export function useReleaseDetail(tag: string | undefined): AsyncState<Release | null> {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<Release | null>(null);
  const [source, setSource] = useState<'api' | 'mock' | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reqState, setReqState] = useState({ nonce: 0, bypass: false });

  const reload = useCallback((bypassCache = true) => {
    setReqState((prev) => ({ nonce: prev.nonce + 1, bypass: bypassCache }));
  }, []);

  useEffect(() => {
    if (!tag) {
      setStatus('ready');
      setData(null);
      return;
    }

    let active = true;
    setStatus('loading');
    setError(null);

    releaseService
      .getReleaseByTag(tag, reqState.bypass)
      .then((res) => {
        if (!active) return;
        setData(res.data);
        setSource(res.source);
        setIsStale(Boolean(res.isStale));
        setFetchedAt(res.fetchedAt);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load release details.');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [tag, reqState]);

  return { status, data, source, isStale, fetchedAt, error, reload };
}
