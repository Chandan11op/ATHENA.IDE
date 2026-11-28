import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useReleaseDetail } from '@/hooks/useReleases';
import {
  formatBytes,
  formatReleaseDate,
  getPlatformLabel,
} from '@/utils/format';
import './Releases.css';

export const ReleaseDetailPage: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const { status, data: release, error, reload } = useReleaseDetail(tag);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Link
            to="/releases"
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 'var(--space-4)', paddingLeft: 0 }}
          >
            <ArrowLeft size={15} />
            Back to Release Archive
          </Link>

          {status === 'loading' && (
            <div>
              <div className="skeleton" style={{ height: 32, width: '50%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 18, width: '70%' }} />
            </div>
          )}

          {status === 'ready' && release && (
            <div>
              <div className="meta-row" style={{ marginBottom: '0.6rem' }}>
                <span className="badge badge-accent">{release.tag}</span>
                <span
                  className={`badge ${
                    release.isPrerelease ? 'badge-warning' : 'badge-success'
                  }`}
                >
                  {release.releaseChannel}
                </span>
                {release.signing?.status === 'signed' && release.signing.publisher ? (
                  <span className="badge badge-success">
                    Verified Publisher: {release.signing.publisher}
                  </span>
                ) : (
                  <span className="badge badge-warning">
                    Digital Signature: Unsigned
                  </span>
                )}
                <span>Version {release.version} · Released {formatReleaseDate(release.releaseDate)}</span>
              </div>
              <h1 className="page-title">{release.title}</h1>
              <p className="page-lead">{release.description}</p>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          {status === 'error' && (
            <div className="notice-banner error" role="alert">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertCircle size={18} aria-hidden="true" />
                <span>
                  <strong>Unable to load release:</strong> {error}
                </span>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => reload(true)}>
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {status === 'ready' && !release && (
            <div className="card" style={{ textAlign: 'center', paddingBlock: 'var(--space-12)' }}>
              <h2 style={{ margin: '0 0 0.5rem' }}>Release not found</h2>
              <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)' }}>
                No release matching tag <code>{tag}</code> was found.
              </p>
              <Link to="/releases" className="btn btn-primary">
                Browse All Releases
              </Link>
            </div>
          )}

          {status === 'ready' && release && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
              <div className="card">
                <h2 style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-xl)' }}>
                  Release Summary
                </h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {release.releaseNotes}
                </p>
              </div>

              {release.changelog && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 'var(--space-5)',
                  }}
                >
                  <div className="card">
                    <h3 style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-base)' }}>
                      New Features
                    </h3>
                    {release.changelog.newFeatures.length > 0 ? (
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.15rem',
                          color: 'var(--text-secondary)',
                          fontSize: 'var(--text-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        {release.changelog.newFeatures.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                        None listed in this release.
                      </p>
                    )}
                  </div>

                  <div className="card">
                    <h3 style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-base)' }}>
                      Improvements
                    </h3>
                    {release.changelog.improvements.length > 0 ? (
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.15rem',
                          color: 'var(--text-secondary)',
                          fontSize: 'var(--text-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        {release.changelog.improvements.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                        None listed in this release.
                      </p>
                    )}
                  </div>

                  <div className="card">
                    <h3 style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-base)' }}>
                      Bug Fixes
                    </h3>
                    {release.changelog.bugFixes.length > 0 ? (
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.15rem',
                          color: 'var(--text-secondary)',
                          fontSize: 'var(--text-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        {release.changelog.bugFixes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                        None listed in this release.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="card">
                <h2 style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-xl)' }}>
                  Compatibility Information
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Windows:</strong>{' '}
                    {release.compatibility.osRequirements.windows ?? 'Not yet supported'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>macOS:</strong>{' '}
                    {release.compatibility.osRequirements.macos ?? 'Not yet supported'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Linux:</strong>{' '}
                    {release.compatibility.osRequirements.linux ?? 'Not yet supported'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Memory:</strong>{' '}
                    {release.compatibility.minRamGb ?? 8} GB min /{' '}
                    {release.compatibility.recommendedRamGb ?? 16} GB recommended
                  </div>
                </div>
              </div>

              <div>
                <h2 style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-xl)' }}>
                  Download Assets
                </h2>
                {release.assets.length > 0 ? (
                  <div className="asset-table-wrap">
                    <table className="asset-table">
                      <thead>
                        <tr>
                          <th>Platform</th>
                          <th>Architecture</th>
                          <th>File</th>
                          <th>SHA-256</th>
                          <th>Size</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {release.assets.map((asset) => (
                          <tr key={asset.id}>
                            <td>{getPlatformLabel(asset.platform)}</td>
                            <td>{asset.architecture}</td>
                            <td>
                              <code>{asset.fileName}</code>
                            </td>
                            <td>
                              {asset.checksumSha256 ? (
                                <code title={asset.checksumSha256}>
                                  {asset.checksumSha256.slice(0, 12)}…
                                </code>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                            <td>{formatBytes(asset.fileSizeBytes)}</td>
                            <td>
                              <a href={asset.downloadUrl} className="btn btn-primary btn-sm">
                                <Download size={14} />
                                Download
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="notice-banner">
                    <span>
                      No binary installer assets are attached to <code>{release.tag}</code>{' '}
                      yet. Visit the <Link to="/download" style={{ textDecoration: 'underline' }}>Download page</Link>{' '}
                      for source build instructions.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};
