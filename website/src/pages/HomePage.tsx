import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Cpu,
  Download,
  FolderLock,
  Layers,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  WifiOff,
} from 'lucide-react';
import { IdePreview } from '@/components/IdePreview';
import { FaqAccordion, FaqItem } from '@/components/FaqAccordion';
import './HomePage.css';

const FEATURES = [
  {
    icon: WifiOff,
    title: 'Offline-First Architecture',
    status: 'Implemented (M1)',
    description:
      'Designed to operate without cloud AI APIs or continuous internet access once Ollama and your local models are installed.',
  },
  {
    icon: Cpu,
    title: 'Local AI via Ollama',
    status: 'Implemented (M1)',
    description:
      'Detects your local Ollama runtime at 127.0.0.1:11434, checks model availability, and guides you through setup when offline.',
  },
  {
    icon: Sparkles,
    title: 'Beginner & Developer Modes',
    status: 'Implemented (M1)',
    description:
      'Switch between a guided Beginner Mode for everyday-language workflows and a focused Developer Mode for direct code inspection.',
  },
  {
    icon: FolderLock,
    title: 'Workspace Path Sandboxing',
    status: 'Implemented (M1)',
    description:
      'Hardened Electron context isolation with a secure preload bridge, workspace-bound access, and sensitive file exclusions (.env, .pem, .key).',
  },
  {
    icon: TerminalSquare,
    title: 'Code Editor & Local Preview',
    status: 'MVP Workflow',
    description:
      'Built for HTML, CSS, JavaScript, and constrained React/Vite projects so you can inspect edits, run locally, and preview results.',
  },
  {
    icon: ShieldCheck,
    title: 'Checkpoints & Bounded Repair',
    status: 'MVP Workflow',
    description:
      'Designed around recoverable checkpoints before changes and bounded error recovery retries (default max 3) without silent destructive actions.',
  },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Idea',
    desc: 'Describe what you want to build or change in plain language.',
  },
  {
    step: '02',
    title: 'AI Assistance',
    desc: 'Local Ollama models reason over your project context.',
  },
  {
    step: '03',
    title: 'Code',
    desc: 'Inspect and edit generated files directly in the editor.',
  },
  {
    step: '04',
    title: 'Run',
    desc: 'Start supported local web projects inside your workspace.',
  },
  {
    step: '05',
    title: 'Preview',
    desc: 'Verify rendered output and capture runtime errors.',
  },
  {
    step: '06',
    title: 'Improve',
    desc: 'Iterate with bounded repair and local checkpoints.',
  },
];

const HOME_FAQS: FaqItem[] = [
  {
    id: 'offline',
    question: 'Does ATHENA.IDE require an internet connection to code with AI?',
    answer:
      'No. Once you have installed ATHENA.IDE, Ollama, and a local model such as qwen2.5-coder:1.5b, normal coding and AI assistance run locally on your machine without cloud API keys.',
  },
  {
    id: 'platforms',
    question: 'Which operating systems are supported?',
    answer:
      'Windows 10/11 (64-bit) is the primary MVP target. Pre-built installers for Windows, macOS, and Linux will appear on the Download page as verified release assets are published.',
  },
  {
    id: 'models',
    question: 'Which AI runtime and models does it use?',
    answer:
      'ATHENA.IDE connects to a local Ollama instance (default http://127.0.0.1:11434) and supports locally pulled coding models such as qwen2.5-coder:1.5b.',
  },
  {
    id: 'cloud-claim',
    question: 'How does it compare to large cloud coding assistants?',
    answer:
      'ATHENA.IDE is an engineering prototype and research system focused on privacy, offline operation, and novice accessibility—not on outperforming massive cloud-hosted models.',
  },
];

export const HomePage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#features') {
      const el = document.getElementById('features');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  return (
    <>
      <section className="hero-section">
        <div className="container">
          <div className="hero-header">
            <span className="badge badge-accent">
              Offline-First · Local Ollama · Electron + React
            </span>
            <h1 className="hero-title">
              Your Ideas. Your Intelligence. Your Code.
            </h1>
            <p className="hero-tagline">
              An Offline-First, AI-Powered Intelligent Development Environment
            </p>
            <p className="hero-subtitle">
              ATHENA.IDE is a local desktop development environment that helps beginners
              and developers build software with AI assistance using locally hosted
              models—keeping your code, models, and workflow on your machine.
            </p>
            <div className="hero-actions">
              <Link to="/download" className="btn btn-primary btn-lg">
                <Download size={18} />
                Download ATHENA.IDE
              </Link>
              <a href="#features" className="btn btn-secondary btn-lg">
                Explore Features
                <ArrowRight size={17} />
              </a>
            </div>
          </div>

          <IdePreview />
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Capabilities</span>
            <h2 className="section-title">
              Built for local control, clarity, and safety
            </h2>
            <p className="section-subtitle">
              Every layer of ATHENA.IDE is designed around offline execution, explicit
              workspace boundaries, and approachable workflows.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <article key={feat.title} className="card card-interactive">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div className="feature-icon" style={{ marginBottom: 0 }}>
                      <Icon size={20} aria-hidden="true" />
                    </div>
                    <span className="badge">{feat.status}</span>
                  </div>
                  <h3 className="feature-title">{feat.title}</h3>
                  <p className="feature-desc">{feat.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="section"
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Development Workflow</span>
            <h2 className="section-title">
              From idea to local preview in six clear steps
            </h2>
            <p className="section-subtitle">
              A structured, inspectable loop designed for HTML, CSS, JavaScript, and
              constrained React/Vite projects.
            </p>
          </div>

          <div className="workflow-strip">
            {WORKFLOW_STEPS.map((item) => (
              <div key={item.step} className="workflow-step">
                <span className="workflow-step-num">{item.step}</span>
                <span className="workflow-step-title">{item.title}</span>
                <span className="workflow-step-desc">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="philosophy-grid">
            <div>
              <span className="section-eyebrow">Why ATHENA.IDE</span>
              <h2 className="section-title">
                Offline philosophy without cloud lock-in
              </h2>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  marginBottom: '1rem',
                }}
              >
                Modern AI coding tools often require cloud accounts, usage subscriptions,
                and sending source files to remote servers. ATHENA.IDE takes a
                local-first approach: models run on your hardware through Ollama, and
                your workspace stays inside explicit local directory boundaries.
              </p>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Developed as part of the Aavishkar 2026–27 research initiative,
                ATHENA.IDE focuses on novice accessibility, bounded error recovery, and
                honest verification.
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  marginBottom: '1rem',
                }}
              >
                <Layers size={18} color="var(--accent-cyan)" aria-hidden="true" />
                <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                  Core Desktop Stack
                </h3>
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.15rem',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                }}
              >
                <li>Electron 34 desktop shell with context isolation</li>
                <li>React 19 + TypeScript + Vite renderer</li>
                <li>Local Ollama HTTP bridge (127.0.0.1:11434)</li>
                <li>Sensitive file pattern exclusions (.env, keys, certs)</li>
                <li>Dark &amp; Light theme support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section"
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="container-narrow">
          <div className="section-header">
            <span className="section-eyebrow">FAQ</span>
            <h2 className="section-title">Common questions</h2>
          </div>
          <FaqAccordion items={HOME_FAQS} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-banner">
            <div>
              <h2 style={{ margin: '0 0 0.4rem', fontSize: 'var(--text-2xl)' }}>
                Ready to explore ATHENA.IDE?
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                Check platform availability, system requirements, and local Ollama setup
                instructions.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/download" className="btn btn-primary btn-lg">
                <Download size={17} />
                Go to Downloads
              </Link>
              <Link to="/docs" className="btn btn-secondary btn-lg">
                Read Documentation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
