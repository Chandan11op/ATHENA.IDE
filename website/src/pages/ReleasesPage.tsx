import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useReleaseList } from '@/hooks/useReleases';
import { PlatformId, ReleaseChannel } from '@/types/release';
import { formatReleaseDate } from '@/utils/format';
import './Releases.css';

const PAGE_SIZE = 6;

export const ReleasesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<ReleaseChannel | 'all'>('all');
  const [platform, setPlatform] = useState<PlatformId | 'all'>('all');
  const [page, setPage] = useState(1);

  const { status, data, source, isStale, fetchedAt, error, reload } = useReleaseList({
    search,
    channel,
    platform,
    page,
    pageSize: PAGE_SIZE,
  });

  const handleResetFilters = () => {
    setSearch('');
    setChannel('all');
    setPlatform('all');
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== '' || channel !== 'all' || platform !== 'all';

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="section-eyebrow">Version History</span>
          <h1 className="page-title">Release Archive</h1>
          <p className="page-lead">
            Browse ATHENA.IDE releases, inspect changelogs, and verify platform asset
            availability across versions.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {source === 'mock' && status === 'ready' && (
            <div className="notice-banner" role="status">
              <span>
                <strong>Local Preview Adapter:</strong> Showing verified repository
                baseline entries. Live GitHub/backend releases will populate here once
                integrated.
              </span>
              <Link to="/download" className="btn btn-secondary btn-sm">
                Download Page
              </Link>
            </div>
          )}

          {isStale && status === 'ready' && (
            <div className="notice-banner" role="status">
              <span>
                <strong>Showing cached release data</strong> (fetched{' '}
                {fetchedAt ? formatReleaseDate(fetchedAt) : 'earlier'}); live refresh failed.
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => reload(true)}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          )}

          <div className="filter-bar">
            <div className="search-input-wrap">
              <Search size={16} className="search-input-icon" aria-hidden="true" />
              <label htmlFor="release-search" className="sr-only">
                Search releases
              </label>
              <input
                id="release-search"
                type="search"
                className="text-input"
                placeholder="Search by version, tag, or notes..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="filter-controls">
              <label htmlFor="channel-filter" className="sr-only">
                Filter by channel
              </label>
              <select
                id="channel-filter"
                className="select-input"
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value as ReleaseChannel | 'all');
                  setPage(1);
                }}
              >
                <option value="all">All channels</option>
                <option value="stable">Stable</option>
                <option value="beta">Beta</option>
                <option value="alpha">Alpha</option>
              </select>

              <label htmlFor="platform-filter" className="sr-only">
                Filter by platform
              </label>
              <select
                id="platform-filter"
                className="select-input"
                value={platform}
                onChange={(e) => {
                  setPlatform(e.target.value as PlatformId | 'all');
                  setPage(1);
                }}
              >
                <option value="all">All platforms</option>
                <option value="windows">Windows</option>
                <option value="macos">macOS</option>
                <option value="linux">Linux</option>
              </select>
            </div>
          </div>

          {status === 'error' && (
            <div className="notice-banner error" role="alert">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertCircle size={18} aria-hidden="true" />
                <span>
                  <strong>Unable to load release archive:</strong> {error}
                </span>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => reload(true)}>
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {status === 'loading' && (
            <div className="release-list" aria-busy="true" aria-label="Loading releases">
              {[1, 2].map((key) => (
                <div key={key} className="card">
                  <div className="skeleton" style={{ height: 22, width: '35%', marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 16, width: '55%' }} />
                </div>
              ))}
            </div>
          )}

          {status === 'ready' && data && data.releases.length === 0 && (
            <div className="card" style={{ textAlign: 'center', paddingBlock: 'var(--space-12)' }}>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: 'var(--text-xl)' }}>
                No matching releases found
              </h2>
              <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)' }}>
                {hasActiveFilters
                  ? 'Try clearing your search query or adjusting the channel/platform filters.'
                  : 'No releases have been published yet.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}

          {status === 'ready' && data && data.releases.length > 0 && (
            <>
              <div className="release-list">
                {data.releases.map((release) => (
                  <article key={release.id} className="card card-interactive">
                    <div className="release-card-header">
                      <div>
                        <div className="meta-row" style={{ marginBottom: '0.45rem' }}>
                          <span className="badge badge-accent">{release.tag}</span>
                          <span
                            className={`badge ${
                              release.isPrerelease ? 'badge-warning' : 'badge-success'
                            }`}
                          >
                            {release.releaseChannel}
                          </span>
                          <span>{formatReleaseDate(release.releaseDate)}</span>
                          <span>
                            {release.assets.length > 0
                              ? `${release.assets.length} asset(s)`
                              : 'No binary assets yet'}
                          </span>
                        </div>
                        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>
                          {release.title}
                        </h2>
                      </div>

                      <Link
                        to={`/releases/${encodeURIComponent(release.tag)}`}
                        className="btn btn-secondary btn-sm"
                      >
                        View Release Notes
                        <ArrowRight size={14} />
                      </Link>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        color: 'var(--text-secondary)',
                        fontSize: 'var(--text-sm)',
                        lineHeight: 1.65,
                      }}
                    >
                      {release.description}
                    </p>
                  </article>
                ))}
              </div>

              {data.total > PAGE_SIZE && (
                <div
                  style={{
                    marginTop: 'var(--space-8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Page {data.page} · Showing {data.releases.length} of {data.total}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={15} />
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={!data.hasMore}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
};
