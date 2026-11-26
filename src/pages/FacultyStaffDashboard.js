import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { readStore } from '../data/localStore';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import Dashboard from './Dashboard';

export default function FacultyStaffDashboard() {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState({ listings: 0, rentals: 0, unread: 0 });
  const [summaryError, setSummaryError] = useState('');

  const refresh = useCallback(async () => {
    if (isSupabaseConfigured) {
      const [listings, transactions, notifications] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('type', 'rental').or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
      ]);
      const failed = [listings.error, transactions.error, notifications.error].find(Boolean);
      if (failed) {
        setSummaryError(failed.message);
        return;
      }
      setSummaryError('');
      setSummary({
        listings: listings.count || 0,
        rentals: transactions.count || 0,
        unread: notifications.count || 0,
      });
      return;
    }

    const store = readStore();
    setSummary({
      listings: store.listings.filter(item => item.owner_id === user.id).length,
      rentals: store.transactions.filter(item => item.type === 'rental' && (item.seller_id === user.id || item.buyer_id === user.id)).length,
      unread: store.notifications.filter(item => item.user_id === user.id && !item.is_read).length,
    });
  }, [user.id]);

  useEffect(() => {
    refresh();
    if (!isSupabaseConfigured) {
      window.addEventListener('marketplace-store-change', refresh);
      return () => window.removeEventListener('marketplace-store-change', refresh);
    }
    const channel = supabase.channel(`faculty-dashboard-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings', filter: `owner_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `seller_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `buyer_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh, user.id]);

  const name = profile?.full_name || profile?.username || user.email.split('@')[0];
  return <main className="content-width standard-page dashboard-page faculty-dashboard">
    <div className="page-heading dashboard-heading"><div><span className="eyebrow">FACULTY &amp; STAFF CAMPUS CORNER</span><h1>Welcome,<br />{name.split(' ')[0]}<span>.</span></h1><p>Your CIT community marketplace at a glance.</p></div><Link className="button" to="/sell">＋ New listing</Link></div>
    {summaryError && <p className="admin-alert" role="alert">Could not load your account summary. {summaryError}</p>}
    <section className="profile-card"><span className="avatar profile-avatar">{name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><div className="profile-info"><h2>{name}</h2><p>{user.email}</p><span className="verified-badge">{profile?.classification} account</span></div><div className="account-state"><i /> ACCOUNT STATUS<strong>{profile?.account_status || 'active'}</strong></div><Link to="/notifications" className="profile-notifications">{summary.unread} unread notifications ↗</Link></section>
    <section className="stats-grid" aria-label="Faculty and staff account summary"><article className="stat-card"><span>YOUR LISTINGS</span><strong>{summary.listings}</strong><small>Items shared with the CIT community</small></article><article className="stat-card"><span>RENTAL RECORDS</span><strong>{summary.rentals}</strong><small>Arrangements you are part of</small></article><article className="stat-card"><span>UNREAD NOTIFICATIONS</span><strong>{summary.unread}</strong><small>Updates for your account</small></article></section>
    <section className="dashboard-section"><div className="section-heading small-heading"><div><span className="eyebrow">FACULTY &amp; STAFF WORKSPACE</span><h2>Marketplace tools</h2></div></div><div className="stats-grid faculty-tools"><Link className="stat-card" to="/browse"><span>DISCOVER</span><strong>Browse listings ↗</strong><small>Find items shared by campus members</small></Link><Link className="stat-card" to="/sell"><span>CONTRIBUTE</span><strong>Manage listings ↗</strong><small>Post or update an item for the community</small></Link><Link className="stat-card" to="/rentals"><span>COORDINATE</span><strong>Rental check-in ↗</strong><small>Track campus handoffs and returns</small></Link><Link className="stat-card" to="/messages"><span>CONNECT</span><strong>Messages ↗</strong><small>Arrange an in-person exchange</small></Link></div></section>
    <Dashboard embedded />
  </main>;
}
