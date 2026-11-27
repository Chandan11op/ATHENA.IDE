import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Shield, Users, WifiOff } from 'lucide-react';
import './Releases.css';

export const AboutPage: React.FC = () => {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="section-eyebrow">About the Project</span>
          <h1 className="page-title">Building an offline-first AI IDE</h1>
          <p className="page-lead">
            ATHENA.IDE is a research and engineering project exploring accessible,
            privacy-preserving software development powered by local models.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-6)',
              marginBottom: 'var(--space-10)',
            }}
          >
            <article className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.75rem' }}>
                <WifiOff size={18} color="var(--accent-cyan)" aria-hidden="true" />
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Offline-First Philosophy</h2>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.65 }}>
                Core development workflows should not depend on cloud AI subscriptions or
                constant connectivity. By integrating with local Ollama inference, your
                code and prompts remain on your own hardware.
              </p>
            </article>

            <article className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.75rem' }}>
                <Users size={18} color="var(--accent-cyan)" aria-hidden="true" />
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Accessibility Objective</h2>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.65 }}>
                With dedicated Beginner Mode and Developer Mode experiences, ATHENA.IDE
                aims to lower the barrier for learners while keeping code inspection,
                local previews, and recovery checkpoints transparent.
              </p>
            </article>

            <article className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.75rem' }}>
                <Shield size={18} color="var(--accent-cyan)" aria-hidden="true" />
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Aavishkar 2026–27 Context</h2>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.65 }}>
                Developed for the Aavishkar 2026–27 research initiative, focusing on
                offline feasibility, novice accessibility, local model resource usage,
                and bounded error recovery.
              </p>
            </article>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            <div className="card">
              <h2 style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-xl)' }}>
                Project Team
              </h2>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.15rem',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Chandan</strong> —
                  Official website frontend, UI/UX architecture, and design system
                  (<code>chandan-dev</code>)
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Himanshu</strong> —
                  Backend and release distribution logic (<code>ansh-dev</code>)
                </li>
              </ul>
            </div>

            <div className="card">
              <h2 style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-xl)' }}>
                Open Source Repository
              </h2>
              <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.65 }}>
                Explore the desktop Electron application, website source, and
                documentation directly on GitHub.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href="https://github.com/Chandan11op/ATHENA.IDE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  View on GitHub
                  <ExternalLink size={14} />
                </a>
                <Link to="/docs" className="btn btn-secondary btn-sm">
                  Read Documentation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
