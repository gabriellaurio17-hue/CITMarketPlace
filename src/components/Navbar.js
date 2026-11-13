import React, { memo } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Logo from './Logo';

function Navbar({ dark = false }) {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  const initials = (profile?.full_name || user?.email || 'CIT').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  const logOut = async () => {
    const { error } = await signOut();
    if (!error) navigate('/', { replace: true });
  };

  const accountActions = user && loading ? null : user && profile?.role === 'admin' ? (
    <div className="header-actions"><button className="logout-link" type="button" onClick={logOut}>Log out</button></div>
  ) : user ? (
    <div className="header-actions">
      {profile?.role === 'admin' && <Link className="nav-link admin-nav-link" to="/admin">Admin</Link>}
      <Link className="notification-pill" to="/notifications"><span className="notification-icon">♧</span> Notifications</Link>
      <Link className="user-chip" to="/dashboard"><span className="avatar">{initials}</span><span>{profile?.full_name || user.email}</span><span className="chevron">⌄</span></Link>
      <button className="logout-link" type="button" onClick={logOut}>Log out</button>
    </div>
  ) : (
    <div className="header-actions"><Link className="login-link" to="/login">Log in</Link><Link className="button button-small" to="/signup">Sign up</Link></div>
  );

  return (
    <header className={`site-header${dark ? ' site-header-dark' : ''}`}>
      <div className="header-inner">
        <Logo light={dark} />
        {user && loading ? null : profile?.role === 'admin' ? (
          <nav className="nav-links" aria-label="Administrator navigation">
            <NavLink to="/admin/pending-listings" className={navClass}>Pending Listings</NavLink>
            <NavLink to="/admin/verify-accounts" className={navClass}>Verify Accounts</NavLink>
            <NavLink to="/admin/reports" className={navClass}>Reports</NavLink>
            <NavLink to="/admin/moderation-log" className={navClass}>Moderation Log</NavLink>
          </nav>
        ) : dark ? (
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
        {accountActions}
      </div>
    </header>
  );
}

export default memo(Navbar);
