import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useTheme } from '@/hooks/useTheme';

export const SiteLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main id="main-content" style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
