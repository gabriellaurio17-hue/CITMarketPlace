import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const location = useLocation();
  const { profile, loading } = useAuth();
  if (!loading && profile?.role === 'admin' && location.pathname !== '/') return <Navigate to="/" replace />;
  const dark = location.pathname.startsWith('/items/');
  return (
    <div className={dark ? 'app-shell dark-shell' : 'app-shell'}>
      <Navbar dark={dark} />
      <div className="route-content"><Outlet /></div>
      {!dark && location.pathname === '/' && (
        <footer className="site-footer">
          cit marketplace <span>·</span> payment and item exchange happen offline by cash and meetup
        </footer>
      )}
    </div>
  );
}
