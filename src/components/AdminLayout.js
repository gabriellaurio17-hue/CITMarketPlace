import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Icon from './admin/Icon';

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.full_name || 'Administrator';
  const avatar = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  const logOut = async () => {
    const { error } = await signOut();
    if (!error) navigate('/login', { replace: true });
  };

  return (
    <div className="administrator-page-shell">
      <div className="administrator-frame">
        <header className="administrator-topbar">
          <div className="admin-brand-pill"><span className="admin-brand-mark"><Icon name="swap" size={21} /></span><span>CITMarketplace</span></div>
          <nav className="admin-section-links" aria-label="Administrator sections">
            <NavLink to="/admin/pending-listings">Pending Listings</NavLink>
            <NavLink to="/admin/verify-accounts">Verify Accounts</NavLink>
            <NavLink to="/admin/reports">Reports</NavLink>
            <NavLink to="/admin/moderation-log">Moderation Log</NavLink>
          </nav>
          <div className="admin-header-actions">
            <Link className="admin-home-link" to="/">Marketplace Home</Link>
            <div className="admin-user-pill"><span className="admin-avatar">{avatar}</span><span className="admin-user-copy"><strong>{displayName}</strong><small>Administrator</small></span></div>
            <button className="logout-link" type="button" onClick={logOut}>Log out</button>
          </div>
        </header>
        <div className="administrator-content-row"><Outlet context={{ logOut }} /></div>
      </div>
    </div>
  );
}
