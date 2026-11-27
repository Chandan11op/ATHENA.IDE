import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Download, ExternalLink, Menu, Moon, Sun, X } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { ThemeMode } from '@/hooks/useTheme';
import './Navbar.css';

interface NavbarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const GITHUB_URL = 'https://github.com/Chandan11op/ATHENA.IDE';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/#features' },
  { label: 'Download', to: '/download' },
  { label: 'Documentation', to: '/docs' },
  { label: 'Releases', to: '/releases' },
  { label: 'About', to: '/about' },
];

export const Navbar: React.FC<NavbarProps> = ({ theme, onToggleTheme }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to="/" aria-label="ATHENA.IDE Home">
          <BrandMark />
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) =>
            item.to.startsWith('/#') ? (
              <Link
                key={item.label}
                to={item.to}
                className={`nav-link ${
                  location.pathname === '/' && location.hash === '#features' ? 'active' : ''
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive && location.hash !== '#features' ? 'active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="nav-actions">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn desktop-only"
            aria-label="View ATHENA.IDE on GitHub"
            title="GitHub Repository"
          >
            <ExternalLink size={17} />
          </a>

          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <Link to="/download" className="btn btn-primary btn-sm desktop-only">
            <Download size={15} />
            Download
          </Link>

          <button
            type="button"
            className="icon-btn mobile-menu-toggle"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-navigation-drawer"
          className="mobile-drawer"
          role="dialog"
          aria-label="Mobile navigation"
        >
          <nav className="mobile-drawer-list" aria-label="Mobile navigation links">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={`mobile-drawer-link ${
                  location.pathname === item.to ? 'active' : ''
                }`}
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mobile-drawer-actions">
            <Link to="/download" className="btn btn-primary btn-lg">
              <Download size={17} />
              Download ATHENA.IDE
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-lg"
            >
              <ExternalLink size={17} />
              GitHub Repository
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
