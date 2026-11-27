import React from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <BrandMark showTag />
            <p className="footer-brand-desc">
              Your Ideas. Your Intelligence. Your Code. An offline-first, AI-powered
              desktop development environment built around local Ollama inference.
            </p>
          </div>

          <div>
            <h2 className="footer-heading">Product</h2>
            <ul className="footer-list">
              <li>
                <Link to="/#features" className="footer-link">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/download" className="footer-link">
                  Download
                </Link>
              </li>
              <li>
                <Link to="/releases" className="footer-link">
                  Release Archive
                </Link>
              </li>
              <li>
                <Link to="/docs#system-requirements" className="footer-link">
                  System Requirements
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="footer-heading">Documentation</h2>
            <ul className="footer-list">
              <li>
                <Link to="/docs#getting-started" className="footer-link">
                  Getting Started
                </Link>
              </li>
              <li>
                <Link to="/docs#local-ai-setup" className="footer-link">
                  Local AI Setup
                </Link>
              </li>
              <li>
                <Link to="/docs#troubleshooting" className="footer-link">
                  Troubleshooting
                </Link>
              </li>
              <li>
                <Link to="/docs#faq" className="footer-link">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="footer-heading">Project</h2>
            <ul className="footer-list">
              <li>
                <Link to="/about" className="footer-link">
                  About ATHENA.IDE
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Chandan11op/ATHENA.IDE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Chandan11op/ATHENA.IDE/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  GitHub Releases
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>ATHENA.IDE — Offline-First AI Desktop Development Environment</span>
          <span>Aavishkar 2026–27 Research &amp; Engineering Project</span>
        </div>
      </div>
    </footer>
  );
};
