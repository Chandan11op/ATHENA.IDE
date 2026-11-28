import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  HardDrive,
  Laptop,
  RefreshCw,
  ShieldCheck,
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
  { id: 'windows', label: 'Windows', formats: 'Windows 10 / 11 (x64) · .exe setup & portable' },
  { id: 'macos', label: 'macOS', formats: '.dmg (arm64 / x64)' },
  { id: 'linux', label: 'Linux', formats: '.AppImage / .deb (x64)' },
];

export const DownloadPage: React.FC = () => {
  const { status, data: latest, source, isStale, fetchedAt, error, reload } = useLatestRelease();
  const visitorPlatform = detectVisitorPlatform();
  const [copiedShaId, setCopiedShaId] = useState<string | null>(null);

  const signing = latest?.signing ?? {
    status: 'unsigned' as const,
    publisher: null,
    issuer: null,
    timestamped: false,
    smartAppControlCompatible: false,
  };
  const hasVerifiedPublisher = signing.status === 'signed' && Boolean(signing.publisher);

  const handleCopySha = async (assetId: string, sha256: string) => {
    try {
      await navigator.clipboard.writeText(sha256);
      setCopiedShaId(assetId);
      setTimeout(() => setCopiedShaId((prev) => (prev === assetId ? null : prev)), 2000);
    } catch {
      // Clipboard API unavailable in restricted contexts; full checksum remains visible inline.
    }
  };

  const getAssetsForPlatform = (platform: PlatformId): ReleaseAsset[] => {
    if (!latest) return [];
    const matched = latest.assets.filter((asset) => asset.platform === platform);
    return [...matched].sort((a, b) => {
      if (a.assetType === 'installer' && b.assetType !== 'installer') return -1;
      if (b.assetType === 'installer' && a.assetType !== 'installer') return 1;
      return 0;
    });
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="section-eyebrow">Desktop Application</span>
          <h1 className="page-title">Download ATHENA.IDE</h1>
          <p className="page-lead">
            Get the offline-first desktop IDE powered by local Ollama models. Download
            links below are retrieved live from official GitHub Releases.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {source === 'mock' && status === 'ready' && (
            <div className="notice-banner" role="status">
              <div>
                <strong>Local Preview Data Adapter Active:</strong> Displaying local
                development metadata.
              </div>
              <Link to="/docs#installation" className="btn btn-secondary btn-sm">
                Build from Source Guide
              </Link>
            </div>
          )}

          {isStale && status === 'ready' && (
            <div className="notice-banner" role="status">
              <div>
                <strong>Showing cached release status</strong> (last updated{' '}
                {fetchedAt ? formatReleaseDate(fetchedAt) : 'recently'}); live GitHub API
                check could not refresh.
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => reload(true)}
              >
                <RefreshCw size={14} />
                Retry Live Check
              </button>
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
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => reload(true)}
                >
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
                      {hasVerifiedPublisher ? (
                        <span className="badge badge-success">
                          Verified Publisher: {signing.publisher}
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          Digital Signature: Unsigned Executable
                        </span>
                      )}
                      <span>Version {latest.version} · Released {formatReleaseDate(latest.releaseDate)}</span>
                    </div>
                    <h2 style={{ margin: '0 0 0.35rem', fontSize: 'var(--text-xl)' }}>
                      {latest.title}
                    </h2>
                    <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {hasVerifiedPublisher ? (
                        <>
                          Signed with SHA-256 Authenticode
                          {signing.issuer ? ` (${signing.issuer})` : ''}
                          {signing.timestamped ? ' · Trusted Timestamp' : ''}
                        </>
                      ) : (
                        <>
                          Publisher verification is not yet active on {latest.tag} binaries. Windows Smart App Control may block unsigned executables and SmartScreen may warn; verify SHA-256 checksums below before launching.
                        </>
                      )}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <Link
                      to={`/releases/${encodeURIComponent(latest.tag)}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Release Notes
                      <ArrowRight size={14} />
                    </Link>
                    {latest.releaseUrl && (
                      <a
                        href={latest.releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                      >
                        GitHub Release
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <Link to="/releases" className="btn btn-ghost btn-sm">
                      All Releases
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="notice-banner" role="status">
                  <div>
                    <strong>ATHENA.IDE is currently being prepared for its first desktop release.</strong>{' '}
                    No published installer binaries exist on GitHub Releases yet. Check{' '}
                    <a
                      href="https://github.com/Chandan11op/ATHENA.IDE/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'underline' }}
                    >
                      GitHub Releases
                    </a>{' '}
                    or build directly from source below.
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => reload(true)}
                  >
                    <RefreshCw size={14} />
                    Check Again
                  </button>
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
                          {osReq ?? plat.formats}
                        </p>
                      </div>

                      {assets.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {assets.map((asset, index) => {
                            const isPrimary =
                              asset.assetType === 'installer' || (index === 0 && asset.assetType !== 'portable');
                            return (
                              <div
                                key={asset.id}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.35rem',
                                }}
                              >
                                <a
                                  href={asset.downloadUrl}
                                  download={asset.fileName}
                                  rel="noopener noreferrer"
                                  className={`btn ${isPrimary ? 'btn-primary' : 'btn-secondary'}`}
                                  style={{ justifyContent: 'space-between' }}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                                    <Download size={16} />
                                    {asset.assetType === 'portable'
                                      ? `Portable (${asset.architecture})`
                                      : `Download Installer (${asset.installerFormat} · ${asset.architecture})`}
                                  </span>
                                  <span style={{ fontSize: 'var(--text-xs)', opacity: 0.9 }}>
                                    {formatBytes(asset.fileSizeBytes)}
                                  </span>
                                </a>
                                <div
                                  style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'var(--font-mono)',
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  <div>{asset.fileName}</div>
                                  {asset.checksumSha256 && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '0.5rem',
                                        marginTop: '0.2rem',
                                      }}
                                    >
                                      <span title={asset.checksumSha256}>
                                        SHA-256: {asset.checksumSha256.slice(0, 16)}…{asset.checksumSha256.slice(-8)}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        style={{ padding: '0.15rem 0.45rem', fontSize: '11px' }}
                                        onClick={() => handleCopySha(asset.id, asset.checksumSha256!)}
                                      >
                                        {copiedShaId === asset.id ? <Check size={12} /> : <Copy size={12} />}
                                        {copiedShaId === asset.id ? 'Copied' : 'Copy SHA-256'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
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
                              {osReq
                                ? 'Installer Pending'
                                : `Not Yet Available for ${getPlatformLabel(plat.id)}`}
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
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Installation Instructions &amp; Requirements</h2>
              </div>
              <ul
                style={{
                  margin: '0 0 0.75rem',
                  paddingLeft: '1.15rem',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                }}
              >
                <li><strong>OS Target:</strong> Windows 10 / 11 (64-bit) · 8 GB RAM min (16 GB recommended)</li>
                <li><strong>Step 1:</strong> Download the NSIS Installer (<code>setup.exe</code>) or Portable binary (<code>portable.exe</code>).</li>
                <li><strong>Step 2:</strong> Verify file integrity with SHA-256 before running:</li>
              </ul>
              <pre className="code-block" style={{ marginBottom: '0.65rem' }}>
                <code>{`Get-FileHash .\\${
                  getAssetsForPlatform('windows')[0]?.fileName ??
                  `Athena.IDE-${latest?.version ?? '0.2.0'}-win-x64-setup.exe`
                } -Algorithm SHA256`}</code>
              </pre>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <strong>Step 3:</strong> Complete the installer wizard, launch ATHENA.IDE, and install Node.js LTS, Git, and Ollama for local AI inference.
              </p>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Cpu size={18} color="var(--accent-cyan)" aria-hidden="true" />
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Local AI Setup (Ollama)</h2>
              </div>
              <p style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Ollama and AI models are <strong>not bundled</strong> inside the desktop
                installer. Launch ATHENA.IDE to use the built-in Setup Wizard, or pull a
                lightweight coding model manually:
              </p>
              <pre className="code-block">
                <code>{`ollama pull qwen2.5-coder:1.5b`}</code>
              </pre>
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <Link to="/docs#local-ai-setup" className="btn btn-secondary btn-sm">
                  Local AI Docs
                </Link>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <AlertTriangle size={18} color="var(--status-warning)" aria-hidden="true" />
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Digital Signature &amp; Known Limitations</h2>
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
                <li>
                  {hasVerifiedPublisher ? (
                    <>
                      <strong>Verified Publisher:</strong> {signing.publisher} (SHA-256 Authenticode signed; SmartScreen reputation builds separately over downloads).
                    </>
                  ) : (
                    <>
                      <strong>Unsigned Windows Build:</strong> Current executables are not code-signed yet. Windows 11 systems with Smart App Control enabled may block unverified publishers, and SmartScreen may show an Unknown Publisher prompt. Code signing support (evaluating SignPath Foundation for open-source releases) is in preparation; we do not recommend disabling Windows security features.
                    </>
                  )}
                </li>
                <li>macOS and Linux pre-built packages are not yet published.</li>
                <li>Offline AI requires local Ollama installed at <code>127.0.0.1:11434</code>.</li>
              </ul>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Link to="/docs#code-signing" className="btn btn-secondary btn-sm">
                  Windows Trust &amp; Verification Guide
                </Link>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Terminal size={18} color="var(--accent-cyan)" aria-hidden="true" />
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>
                  Build from Source
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
                <a
                  href="https://github.com/Chandan11op/ATHENA.IDE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  GitHub Repository
                  <ExternalLink size={14} />
                </a>
                <a
                  href="https://github.com/Chandan11op/ATHENA.IDE/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  <ShieldCheck size={14} />
                  GitHub Releases
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
