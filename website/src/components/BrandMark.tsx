import React from 'react';

interface BrandMarkProps {
  showTag?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ showTag = false }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.6rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="#0d1117" />
        <rect
          x="0.75"
          y="0.75"
          width="30.5"
          height="30.5"
          rx="7.25"
          stroke="rgba(56,189,248,0.4)"
          strokeWidth="1.5"
        />
        <path
          d="M16 6L24.5 24H20.8L18.9 19.8H13.1L11.2 24H7.5L16 6ZM14.3 16.8H17.7L16 12.7L14.3 16.8Z"
          fill="url(#athena-brand-grad)"
        />
        <defs>
          <linearGradient
            id="athena-brand-grad"
            x1="7.5"
            y1="6"
            x2="24.5"
            y2="24"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <span style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
        ATHENA<span style={{ color: 'var(--accent-cyan)' }}>.IDE</span>
      </span>
      {showTag && (
        <span className="badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
          Offline-First
        </span>
      )}
    </span>
  );
};
