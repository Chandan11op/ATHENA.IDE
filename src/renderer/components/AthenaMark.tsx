import React, { useId } from 'react';

interface AthenaMarkProps {
  size?: number;
}

/** Modern geometric sculpture mark for Athena.IDE. */
export const AthenaMark: React.FC<AthenaMarkProps> = ({ size = 18 }) => {
  const uid = useId().replace(/:/g, '');
  const gradMain = `ide-athena-main-${uid}`;
  const gradFace = `ide-athena-face-${uid}`;
  const gradFacet = `ide-athena-facet-${uid}`;

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradMain} x1="8" y1="5" x2="23" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="52%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id={gradFace} x1="14" y1="13" x2="22" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="55%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id={gradFacet} x1="9" y1="14" x2="18" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#0d1117" />
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7.25" stroke="rgba(56,189,248,0.42)" strokeWidth="1.5" />
      <path d="M9.5 9.6C11.4 5.9 16.8 4.7 21.8 7.2C19.2 7.5 17.5 8.1 16.0 9.1L11.4 10.1L9.5 9.6Z" fill={`url(#${gradMain})`} />
      <path d="M15.4 13.6L20.4 13.8L20.1 14.9L22.2 17.5L20.8 18.0L21.1 18.9L20.7 19.8L20.9 21.1C20.6 22.0 19.6 22.4 18.2 22.3L17.5 24.4H12.4L13.3 19.6L14.5 18.6L15.4 13.6Z" fill={`url(#${gradFace})`} />
      <path d="M9.2 15.2C9.1 11.2 11.9 8.4 15.8 8.4C18.9 8.4 21.0 10.0 21.8 12.6L15.4 13.6L12.8 14.0L9.2 15.2Z" fill={`url(#${gradMain})`} />
      <path d="M9.2 15.2L12.8 14.0L14.5 18.6L11.2 19.5L9.2 15.2Z" fill={`url(#${gradFacet})`} opacity="0.9" />
      <path d="M8.8 27.4L12.2 24.0H18.2L21.6 27.4H8.8Z" fill={`url(#${gradMain})`} />
      <path d="M15.2 24.0H18.2L21.6 27.4H17.1L15.2 24.0Z" fill={`url(#${gradFacet})`} opacity="0.7" />
    </svg>
  );
};

