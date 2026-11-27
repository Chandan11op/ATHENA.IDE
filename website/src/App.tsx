import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SiteLayout } from '@/layouts/SiteLayout';
import { HomePage } from '@/pages/HomePage';
import { DownloadPage } from '@/pages/DownloadPage';
import { ReleasesPage } from '@/pages/ReleasesPage';
import { ReleaseDetailPage } from '@/pages/ReleaseDetailPage';
import { DocsPage } from '@/pages/DocsPage';
import { AboutPage } from '@/pages/AboutPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/releases" element={<ReleasesPage />} />
          <Route path="/releases/:tag" element={<ReleaseDetailPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
