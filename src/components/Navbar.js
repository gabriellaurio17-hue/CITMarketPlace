import React, { memo } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Logo from './Logo';

function Navbar({ dark = false }) {
  const location = useLocation();
  const home = location.pathname === '/';
  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  return (
    <header className={`site-header${dark ? ' site-header-dark' : ''}`}>
      <div className="header-inner">
        <Logo light={dark} />
        {dark ? (
          <nav className="nav-links detail-nav" aria-label="Main navigation">
            <NavLink to="/browse" className={navClass}>Browse</NavLink>
            <NavLink to="/messages" className={navClass}>Messages</NavLink>
            <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
            <NavLink to="/notifications" className={navClass}>Notifications</NavLink>
          </nav>
        ) : (
          <nav className="nav-links" aria-label="Main navigation">
            <NavLink to="/browse" className={navClass}>Browse</NavLink>
            <NavLink to="/sell" className={navClass}>Sell</NavLink>
            <NavLink to="/rentals" className={navClass}>Rentals</NavLink>
            <NavLink to="/messages" className={navClass}>Messages</NavLink>
          </nav>
        )}
        {home && !dark ? (
          <div className="header-actions"><Link className="login-link" to="/login">Log in</Link><Link className="button button-small" to="/signup">Sign up</Link></div>
        ) : !dark ? (
          <div className="header-actions"><Link className="notification-pill" to="/notifications"><span className="notification-icon">♧</span> Notifications</Link><Link className="user-chip" to="/dashboard"><span className="avatar">AR</span><span>Ana Reyes</span><span className="chevron">⌄</span></Link></div>
        ) : <Link to="/browse" className="report-button">Report listing</Link>}
      </div>
    </header>
  );
}

export default memo(Navbar);
