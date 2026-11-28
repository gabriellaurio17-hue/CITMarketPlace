import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ light = false }) {
  return (
    <Link className={`brand${light ? ' brand-light' : ''}`} to="/" aria-label="CIT Marketplace home">
      <img className="brand-mark" src="/images/CITMarketplace-logo-seal.jpg" alt="CIT Marketplace logo" />
      <span>cit marketplace</span>
    </Link>
  );
}
