import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Download,
  ExternalLink,
  HardDrive,
  Laptop,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { useLatestRelease } from '@/hooks/useReleases';
import { PlatformId, ReleaseAsset } from '@/types/release';
import {
  detectVisitorPlatform,
  formatBytes,
  formatReleaseDate,
  getPlatformLabel,
} from '@/utils/format';
import './Releases.css';

const PLATFORMS: Array<{
  id: PlatformId;
  label: string;
  formats: string;
}> = [
  { id: 'windows', label: 'Windows', formats: '.exe / .msi (x64)' },
  { id: 'macos', label: 'macOS', formats: '.dmg (arm64 / x64)' },
  { id: 'linux', label: 'Linux', formats: '.AppImage / .deb (x64)' },
];

export const DownloadPage: React.FC = () => {
  const { status, data: latest, source, error, reload } = useLatestRelease();
  const visitorPlatform = detectVisitorPlatform();

  const getAssetsForPlatform = (platform: PlatformId): ReleaseAsset[] => {
    if (!latest) return [];
    return latest.assets.filter((asset) => asset.platform === platform);
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="section-eyebrow">Desktop Application</span>
          <h1 className="page-title">Download ATHENA.IDE</h1>
          <p className="page-lead">
            Get the offline-first desktop IDE powered by local Ollama models. Only
            verified release assets supplied by the release service are shown below.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {source === 'mock' && status === 'ready' && (
            <div className="notice-banner" role="status">
              <div>
                <strong>Local Preview Data Adapter Active:</strong> Displaying the
                repository baseline (<code>v0.1.0</code>). Live installer binaries will
                appear automatically once connected to the release backend.
              </div>
              <Link to="/docs#installation" className="btn btn-secondary btn-sm">
                Build from Source Guide
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="notice-banner error" role="alert">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertCircle size={18} aria-hidden="true" />
                <span>
                  <strong>Could not load release metadata:</strong> {error}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>
                  <RefreshCw size={14} />
                  Retry
                </button>
                <a
                  href="https://github.com/Chandan11op/ATHENA.IDE/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  GitHub Releases
                </a>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="platform-grid" aria-busy="true" aria-label="Loading downloads">
              {PLATFORMS.map((p) => (
                <div key={p.id} className="card">
                  <div className="skeleton" style={{ height: 24, width: '45%', marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 16, width: '75%', marginBottom: 24 }} />
                  <div className="skeleton" style={{ height: 40, width: '100%' }} />
                </div>
              ))}
            </div>
          )}

          {status === 'ready' && (
            <>
              {latest ? (
                <div
                  className="card"
                  style={{
                    marginBottom: 'var(--space-8)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                  }}
                >
                  <div>
                    <div className="meta-row" style={{ marginBottom: '0.35rem' }}>
                      <span className="badge badge-accent">{latest.tag}</span>
                      <span
                        className={`badge ${
                          latest.isPrerelease ? 'badge-warning' : 'badge-success'
                        }`}
                      >
                        {latest.releaseChannel}
                      </span>
                      <span>Released {formatReleaseDate(latest.releaseDate)}</span>
                    </div>
                    <h2 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>
                      {latest.title}
                    </h2>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <Link
                      to={`/releases/${encodeURIComponent(latest.tag)}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Release Notes
                      <ArrowRight size={14} />
                    </Link>
                    <Link to="/releases" className="btn btn-ghost btn-sm">
                      All Releases
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="notice-banner">
                  <div>
                    <strong>No published releases yet.</strong> Check the{' '}
                    <Link to="/releases" style={{ textDecoration: 'underline' }}>
                      Release Archive
                    </Link>{' '}
                    or build directly from the GitHub repository.
                  </div>
                </div>
              )}

              <div className="platform-grid">
                {PLATFORMS.map((plat) => {
                  const assets = getAssetsForPlatform(plat.id);
                  const isDetected = visitorPlatform === plat.id;
                  const osReq = latest?.compatibility.osRequirements[plat.id];

                  return (
                    <article
                      key={plat.id}
                      className={`card platform-card ${isDetected ? 'recommended' : ''}`}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 'var(--space-3)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <Laptop size={20} color="var(--accent-cyan)" aria-hidden="true" />
                            <h3 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>
                              {plat.label}
                            </h3>
                          </div>
                          {isDetected && <span className="badge badge-accent">Detected OS</span>}
                        </div>

                        <p
                          style={{
                            margin: '0 0 var(--space-3)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {osReq ?? `Target formats: ${plat.formats}`}
                        </p>
                      </div>

                      {assets.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {assets.map((asset) => (
                            <a
                              key={asset.id}
                              href={asset.downloadUrl}
                              className="btn btn-primary"
                              style={{ justifyContent: 'space-between' }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                                <Download size={16} />
                                {asset.installerFormat} ({asset.architecture})
                              </span>
                              <span style={{ fontSize: 'var(--text-xs)', opacity: 0.9 }}>
                                {formatBytes(asset.fileSizeBytes)}
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-surface-elevated)',
                            border: '1px dashed var(--border-strong)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              fontWeight: 600,
                              fontSize: 'var(--text-sm)',
                              marginBottom: '0.25rem',
                            }}
                          >
                            <Clock size={15} color="var(--text-muted)" aria-hidden="true" />
                            <span>
                              {osReq ? 'Installer Coming Soon' : `Not Yet Available for ${getPlatformLabel(plat.id)}`}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 'var(--text-xs)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            No verified binary asset has been published for this platform yet.
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      <section
        className="section"
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <HardDrive size={18} color="var(--accent-cyan)" aria-hidden="true" />
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>System Requirements</h2>
              </div>
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
                <li>Windows 10 / 11 (64-bit) primary desktop MVP target</li>
                <li>8 GB RAM minimum (16 GB recommended for local LLMs)</li>
                <li>Node.js LTS &amp; Git (for project workflows and source builds)</li>
                <li>Local Ollama installation (default endpoint: 127.0.0.1:11434)</li>
              </ul>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Terminal size={18} color="var(--accent-cyan)" aria-hidden="true" />
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>
                  Run Desktop App from Source
                </h2>
              </div>
              <pre className="code-block">
                <code>{`git clone https://github.com/Chandan11op/ATHENA.IDE.git
cd ATHENA.IDE
npm install
npm run build
npm start`}</code>
              </pre>
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <Link to="/docs#local-ai-setup" className="btn btn-secondary btn-sm">
                  Local AI Setup
                </Link>
                <a
                  href="https://github.com/Chandan11op/ATHENA.IDE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  Source on GitHub
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
