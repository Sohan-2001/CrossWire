import * as React from 'react';

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="9" x2="12" y2="5" />
    <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    <g transform="rotate(60 12 12)">
      <line x1="12" y1="9" x2="12" y2="5" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </g>
    <g transform="rotate(120 12 12)">
      <line x1="12" y1="9" x2="12" y2="5" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </g>
    <g transform="rotate(180 12 12)">
      <line x1="12" y1="9" x2="12" y2="5" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </g>
    <g transform="rotate(240 12 12)">
      <line x1="12" y1="9" x2="12" y2="5" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </g>
    <g transform="rotate(300 12 12)">
      <line x1="12" y1="9" x2="12" y2="5" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </g>
  </svg>
);
