import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ light = false }) {
  return (
    <Link className={`brand${light ? ' brand-light' : ''}`} to="/" aria-label="CIT Marketplace home">
      <svg className="brand-mark" viewBox="0 0 40 40" role="img" aria-label="CIT Marketplace logo">
        <rect width="40" height="40" rx="12" fill="currentColor" />
        <path d="M10 12h17l5 8-11 12-12-12z" fill="#E3B84B" />
        <circle cx="14" cy="17" r="2.3" fill="#6B0F1A" />
      </svg>
      <span>cit marketplace</span>
    </Link>
  );
}
