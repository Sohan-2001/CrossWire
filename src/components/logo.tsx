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
    <path d="M10 3v2a4 4 0 0 0 4 4h2" />
    <path d="M14 3.522A4 4 0 0 1 18 7v10a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h4" />
    <path d="m14 13-4 4" />
    <path d="m10 13 4 4" />
  </svg>
);
