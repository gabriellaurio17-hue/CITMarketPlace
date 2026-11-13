import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function RequireAuth({ children, adminOnly = false }) {
  const { user, profile, loading, profileError } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading-state">Loading your account…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (profileError) return <main className="content-width standard-page"><div className="empty-state"><h1>Account setup needed</h1><p>{profileError}</p></div></main>;
  if (profile?.account_status !== 'active') return <main className="content-width standard-page"><div className="empty-state"><h1>Account unavailable</h1><p>Your CIT Marketplace account is inactive. Contact an administrator for help.</p></div></main>;
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (!adminOnly && profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
}
