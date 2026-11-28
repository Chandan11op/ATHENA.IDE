import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaqAccordion, FaqItem } from '@/components/FaqAccordion';
import './Releases.css';
import './DocsPage.css';

const DOC_SECTIONS = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'installation', title: 'Installation' },
  { id: 'code-signing', title: 'Windows Trust & Verification' },
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'local-ai-setup', title: 'Local AI Setup' },
  { id: 'model-installation', title: 'Model Installation' },
  { id: 'offline-usage', title: 'Offline Usage' },
  { id: 'project-creation', title: 'Project Creation' },
  { id: 'ai-coding-workflow', title: 'AI Coding Workflow' },
  { id: 'troubleshooting', title: 'Troubleshooting' },
  { id: 'system-requirements', title: 'System Requirements' },
  { id: 'faq', title: 'Frequently Asked Questions' },
];

const DOC_FAQS: FaqItem[] = [
  {
    id: 'doc-faq-1',
    question: 'Why does ATHENA.IDE show "Local AI Offline"?',
    answer:
      'ATHENA.IDE checks http://127.0.0.1:11434 on startup. If Ollama is not installed or the service is not running, it displays the Local AI Offline badge and opens built-in setup instructions.',
  },
  {
    id: 'doc-faq-2',
    question: 'Which files are protected from AI or workspace exposure?',
    answer:
      'The desktop shell excludes sensitive patterns such as .env, .pem, .key, .id_rsa, .id_ed25519, credentials.json, .npmrc, .gitconfig, and .passwd, along with .git, node_modules, and dist directories.',
  },
  {
    id: 'doc-faq-3',
    question: 'Can I switch between Beginner and Developer modes?',
    answer:
      'Yes. You can toggle between Beginner Mode and Developer Mode directly in the desktop header, and your preference is persisted locally.',
  },
];

export const DocsPage: React.FC = () => {
  const location = useLocation();
  const [activeId, setActiveId] = useState<string>('introduction');

  useEffect(() => {
    const hashId = location.hash.replace(/^#/, '');
    if (hashId) {
      setActiveId(hashId);
      const el = document.getElementById(hashId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  const jumpTo = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="section-eyebrow">Documentation</span>
          <h1 className="page-title">ATHENA.IDE Guide</h1>
          <p className="page-lead">
            Setup, local Ollama configuration, offline usage, and troubleshooting for
            the ATHENA.IDE desktop application.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="docs-layout">
            <aside className="docs-sidebar" aria-label="Documentation sections">
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: '0.6rem',
                  paddingInline: '0.65rem',
                }}
              >
                On this page
              </div>
              <ul className="docs-nav-list">
                {DOC_SECTIONS.map((sec) => (
                  <li key={sec.id}>
                    <button
                      type="button"
                      className={`docs-nav-link ${activeId === sec.id ? 'active' : ''}`}
                      onClick={() => jumpTo(sec.id)}
                    >
                      {sec.title}
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <div className="docs-content">
              <article id="introduction" className="docs-section">
                <h2>Introduction</h2>
                <p>
                  ATHENA.IDE is an offline-first, AI-powered desktop development
                  environment built on Electron, React 19, TypeScript, and Vite. It is
                  designed to help beginners and developers build HTML, CSS, JavaScript,
                  and constrained React/Vite projects using locally hosted models via
                  Ollama.
                </p>
              </article>

              <article id="installation" className="docs-section">
                <h2>Installation</h2>
                <p>
                  Pre-built installers will be published on the Download page once
                  verified release binaries are available. In the meantime, you can build
                  and run the desktop application directly from source:
                </p>
                <pre className="code-block">
                  <code>{`git clone https://github.com/Chandan11op/ATHENA.IDE.git
cd ATHENA.IDE
npm install
npm run build
npm start`}</code>
                </pre>
              </article>

              <article id="code-signing" className="docs-section">
                <h2>Windows Trust &amp; Verification</h2>
                <p>
                  Windows 11 enforces two separate security mechanisms for downloaded desktop software:
                  <strong> Smart App Control (SAC)</strong>, which verifies cryptographic Authenticode
                  signatures across installers, uninstallers, executables, and DLLs, and
                  <strong> Microsoft Defender SmartScreen</strong>, which tracks per-certificate and
                  per-binary download reputation over time.
                </p>
                <p>
                  Current <code>v0.2.0</code> pre-built binaries are unsigned, so Smart App Control
                  may block execution until signed releases are published. We are preparing
                  open-source code signing (evaluating SignPath Foundation) and never ask users
                  to weaken Windows security settings. Always verify SHA-256 integrity and
                  Authenticode status locally with PowerShell:
                </p>
                <pre className="code-block">
                  <code>{`Get-FileHash .\\Athena.IDE-0.2.0-win-x64-setup.exe -Algorithm SHA256
Get-AuthenticodeSignature .\\Athena.IDE-0.2.0-win-x64-setup.exe`}</code>
                </pre>
              </article>

              <article id="getting-started" className="docs-section">
                <h2>Getting Started</h2>
                <p>
                  On first launch, ATHENA.IDE checks for a local Ollama server and lets
                  you choose a workspace directory using the native folder picker.
                </p>
                <ul>
                  <li>Select Beginner Mode for guided explanations or Developer Mode for direct code views.</li>
                  <li>Choose a local workspace folder to enable sandboxed file operations.</li>
                  <li>Switch between Dark and Light themes in settings.</li>
                </ul>
              </article>

              <article id="local-ai-setup" className="docs-section">
                <h2>Local AI Setup</h2>
                <p>
                  ATHENA.IDE uses Ollama as its local AI runtime. By default, it connects
                  to <code>http://127.0.0.1:11434</code> without requiring any cloud API
                  keys.
                </p>
                <p>
                  Install Ollama for your operating system, start the Ollama service, and
                  ensure it is listening on port <code>11434</code>.
                </p>
              </article>

              <article id="model-installation" className="docs-section">
                <h2>Model Installation</h2>
                <p>
                  Pull a lightweight coding model locally before working offline. The
                  recommended baseline model in the project configuration is{' '}
                  <code>qwen2.5-coder:1.5b</code>:
                </p>
                <pre className="code-block">
                  <code>{`ollama pull qwen2.5-coder:1.5b`}</code>
                </pre>
              </article>

              <article id="offline-usage" className="docs-section">
                <h2>Offline Usage</h2>
                <p>
                  Once your models and project dependencies are installed locally,
                  ATHENA.IDE does not require an internet connection for normal
                  operation. Model inference, workspace browsing, and settings
                  persistence stay on your machine.
                </p>
              </article>

              <article id="project-creation" className="docs-section">
                <h2>Project Creation</h2>
                <p>
                  The MVP targets HTML, CSS, JavaScript, and constrained React/Vite
                  workflows inside an explicitly selected local workspace directory.
                  Sensitive files such as <code>.env</code> and private keys are excluded
                  by default.
                </p>
              </article>

              <article id="ai-coding-workflow" className="docs-section">
                <h2>AI Coding Workflow</h2>
                <p>
                  The intended workflow follows six inspectable stages: Idea → AI
                  Assistance → Code → Run → Preview → Improve. Auto-checkpointing and
                  bounded repair retries (default maximum of 3) are built into the
                  architecture to keep changes recoverable.
                </p>
              </article>

              <article id="troubleshooting" className="docs-section">
                <h2>Troubleshooting</h2>
                <ul>
                  <li>
                    <strong>Local AI Offline badge:</strong> Verify Ollama is running at{' '}
                    <code>http://127.0.0.1:11434</code> and that at least one model is
                    pulled.
                  </li>
                  <li>
                    <strong>Electron launch inside IDE shells:</strong> If{' '}
                    <code>ELECTRON_RUN_AS_NODE</code> is exported in your environment,
                    unset it before running <code>npm start</code>.
                  </li>
                </ul>
              </article>

              <article id="system-requirements" className="docs-section">
                <h2>System Requirements</h2>
                <ul>
                  <li>OS: Windows 10 / 11 (64-bit) primary MVP target</li>
                  <li>RAM: 8 GB minimum (16 GB recommended for local LLM inference)</li>
                  <li>Prerequisites: Node.js LTS, Git, and Ollama</li>
                </ul>
              </article>

              <article id="faq" className="docs-section">
                <h2>Frequently Asked Questions</h2>
                <FaqAccordion items={DOC_FAQS} />
              </article>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
