import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import formatCurrency from '../utils/formatCurrency';
import Icon from '../components/admin/Icon';

const tabs = [
  { id: 'listings', label: 'Pending Listings' },
  { id: 'accounts', label: 'Verify Accounts' },
  { id: 'reports', label: 'Reports' },
  { id: 'logs', label: 'Moderation Log' },
];

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

function displayDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function displayTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function Metric({ label, value, icon }) {
  return <article className="swap-metric-card">
    <div className="swap-metric-top"><span>{label}</span><span className="swap-metric-icon"><Icon name={icon} size={19} /></span></div>
    <strong className="swap-metric-number">{value}</strong>
  </article>;
}

function ListingRow({ row, onDecide, busy }) {
  const id = `L-${row.id.slice(0, 6).toUpperCase()}`;
  return <tr>
    <td className="swap-id-cell">{id}</td>
    <td><strong>{row.title}</strong><small>{row.listing_type} · Posted {displayDate(row.created_at)}</small></td>
    <td>{row.seller?.full_name || row.seller?.email || '—'}</td>
    <td>{row.categories?.name || '—'}</td>
    <td>{formatCurrency(row.price)}</td>
    <td><span className="swap-status-chip swap-status-pending">Pending</span></td>
    <td><div className="swap-table-actions"><button className="swap-action-primary" type="button" disabled={busy} onClick={() => onDecide(row, 'approve')}>Approve</button><button className="swap-action-secondary" type="button" disabled={busy} onClick={() => onDecide(row, 'reject')}>Reject</button><button className="swap-action-danger" type="button" disabled={busy} onClick={() => onDecide(row, 'delete')}>Delete</button></div></td>
  </tr>;
}

function AccountRow({ row, onDecide, busy }) {
  return <tr>
    <td><div className="swap-person-cell"><span className="swap-person-avatar">{initials(row.full_name)}</span><span><strong>{row.full_name || '—'}</strong><small>{row.email || '—'}</small></span></div></td>
    <td>{row.classification || '—'}</td>
    <td>{displayDate(row.created_at)}</td>
    <td><span className="swap-status-chip swap-status-pending">Needs verification</span></td>
    <td><div className="swap-table-actions"><button className="swap-action-primary" type="button" disabled={busy} onClick={() => onDecide(row, 'verify')}>Verify</button><button className="swap-action-secondary" type="button" disabled={busy} onClick={() => onDecide(row, 'decline')}>Decline</button></div></td>
  </tr>;
}

function ReportRow({ row, onDecide, busy }) {
  const id = `R-${row.id.slice(0, 6).toUpperCase()}`;
  return <tr>
    <td className="swap-id-cell">{id}</td><td>{row.target_type} · {row.target_id.slice(0, 8)}</td>
    <td>{row.reason}</td><td>{row.profiles?.full_name || '—'}</td><td>{displayDate(row.created_at)}</td>
    <td><div className="swap-table-actions"><button className="swap-action-primary" type="button" disabled={busy} onClick={() => onDecide(row, 'resolved')}>Resolve</button><button className="swap-action-secondary" type="button" disabled={busy} onClick={() => onDecide(row, 'dismissed')}>Dismiss</button></div></td>
  </tr>;
}

function LogRow({ row }) {
  return <tr><td>{displayTime(row.created_at)}</td><td>{row.admin?.full_name || row.admin?.email || 'Administrator'}</td><td><span className="swap-action-chip">{row.action.replaceAll('_', ' ')}</span></td><td>{row.target_type} · {row.target_id.slice(0, 8)}</td><td>{row.note || '—'}</td></tr>;
}

export default function Admin({ section }) {
  const { user } = useAuth();
  const activeTab = section;
  const [live, setLive] = useState({ listings: [], accounts: [], reports: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [sortNewest, setSortNewest] = useState(true);

  const loadAdminData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [listingsResult, accountsResult, reportsResult, logsResult] = await Promise.all([
      supabase.from('listings').select('id, title, listing_type, price, created_at, categories(name), seller:profiles!listings_owner_id_fkey(full_name, email)').eq('approval_status', 'pending').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email, classification, created_at').eq('is_verified', false).eq('account_status', 'active').order('created_at', { ascending: false }),
      supabase.from('reports').select('id, target_type, target_id, reason, created_at, profiles!reports_reporter_id_fkey(full_name)').eq('status', 'open').order('created_at', { ascending: false }),
      supabase.from('moderation_logs').select('id, action, target_type, target_id, note, created_at, admin:profiles!moderation_logs_admin_id_fkey(full_name, email)').order('created_at', { ascending: false }).limit(100),
    ]);
    const results = [listingsResult, accountsResult, reportsResult, logsResult];
    const failed = results.find((result) => result.error);
    setError(failed?.error?.message || '');
    setLive({ listings: listingsResult.data || [], accounts: accountsResult.data || [], reports: reportsResult.data || [], logs: logsResult.data || [] });
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAdminData(); }, [loadAdminData]);

  const counts = { listings: live.listings.length, accounts: live.accounts.length, reports: live.reports.length, actions: live.logs.length };
  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = (live[activeTab] || []).filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query));
    return [...rows].sort((a, b) => sortNewest
      ? String(b.created_at || '').localeCompare(String(a.created_at || ''))
      : String(a.title || a.full_name || a.reason || a.action || '').localeCompare(String(b.title || b.full_name || b.reason || b.action || '')));
  }, [activeTab, live, search, sortNewest]);

  const decide = async (row, action) => {
    if (activeTab === 'listings' && action === 'delete' && !window.confirm(`Delete or remove listing "${row.title}"? This action will be recorded in the moderation log.`)) return;
    setBusyId(row.id);
    setError('');
    setNotice('');
    let result;
    if (activeTab === 'listings') {
      result = await supabase.rpc('admin_moderate_listing', { p_listing_id: row.id, p_decision: action, p_note: null });
    } else if (activeTab === 'accounts' && action === 'verify') {
      result = await supabase.rpc('admin_verify_profile', { p_user_id: row.id, p_verified: true, p_note: 'Verified from administrator dashboard' });
    } else if (activeTab === 'accounts') {
      result = await supabase.rpc('admin_decline_profile', { p_user_id: row.id, p_note: 'Declined from administrator dashboard' });
    } else {
      result = await supabase.rpc('admin_resolve_report', { p_report_id: row.id, p_status: action, p_note: null });
    }
    setBusyId('');
    if (result?.error) { setError(result.error.message); return; }
    setNotice('Action saved and recorded in the moderation log.');
    await loadAdminData();
  };

  const exportLog = () => {
    const values = [['Time', 'Moderator', 'Action', 'Target', 'Note'], ...live.logs.map((row) => [displayTime(row.created_at), row.admin?.full_name || row.admin?.email || 'Administrator', row.action, `${row.target_type} ${row.target_id}`, row.note || ''])];
    const csv = values.map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'marketplace-moderation-log.csv'; anchor.click(); URL.revokeObjectURL(url);
  };

  const currentTab = tabs.find((tab) => tab.id === activeTab);
  const isBusy = (row) => busyId === row.id;

  return <main className="swap-admin-main">
    <div className="swap-admin-title-row"><div><h1>{currentTab?.label}</h1><p>{activeTab === 'listings' ? 'Review listings awaiting approval.' : activeTab === 'accounts' ? 'Review unverified member accounts.' : activeTab === 'reports' ? 'Review reports submitted by members.' : 'Review the record of administrator moderation actions.'}</p></div></div>
    {error && <p className="admin-alert" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="swap-metrics-grid">
      <Metric label="Pending Listings" value={loading ? '—' : counts.listings} icon="tag" />
      <Metric label="Accounts to Verify" value={loading ? '—' : counts.accounts} icon="shield" />
      <Metric label="Open Reports" value={loading ? '—' : counts.reports} icon="flag" />
      <Metric label="Moderation Actions" value={loading ? '—' : counts.actions} icon="clipboard" />
    </div>
    <section className="swap-admin-table-card">
      <div className="swap-table-titlebar"><div><h2>{currentTab?.label}</h2><p>Records from the live Supabase project.</p></div>
        <div className="swap-table-toolbar"><label className="swap-table-search"><Icon name="search" size={16} /><input aria-label={`Search ${currentTab?.label}`} placeholder="Search..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><button type="button" className="swap-sort-button" onClick={() => setSortNewest((value) => !value)}>Sort by <Icon name="chevron" size={15} /></button>{activeTab === 'logs' && <button type="button" className="swap-export-button" onClick={exportLog}><Icon name="download" size={16} />Export log</button>}</div>
      </div>
      <div className="swap-table-scroll"><table className="swap-admin-table">
        {activeTab === 'listings' && <><thead><tr><th>ID</th><th>LISTING</th><th>SELLER</th><th>CATEGORY</th><th>PRICE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{visibleRows.map((row) => <ListingRow key={row.id} row={row} onDecide={decide} busy={isBusy(row)} />)}</tbody></>}
        {activeTab === 'accounts' && <><thead><tr><th>ACCOUNT</th><th>CLASSIFICATION</th><th>CREATED</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{visibleRows.map((row) => <AccountRow key={row.id} row={row} onDecide={decide} busy={isBusy(row)} />)}</tbody></>}
        {activeTab === 'reports' && <><thead><tr><th>ID</th><th>SUBJECT</th><th>REASON</th><th>REPORTED BY</th><th>DATE</th><th>ACTIONS</th></tr></thead><tbody>{visibleRows.map((row) => <ReportRow key={row.id} row={row} onDecide={decide} busy={isBusy(row)} />)}</tbody></>}
        {activeTab === 'logs' && <><thead><tr><th>TIME</th><th>ADMINISTRATOR</th><th>ACTION</th><th>TARGET</th><th>NOTE</th></tr></thead><tbody>{visibleRows.map((row) => <LogRow key={row.id} row={row} />)}</tbody></>}
        {!loading && !error && visibleRows.length === 0 && <tbody><tr><td className="swap-empty-cell" colSpan={activeTab === 'listings' ? 7 : activeTab === 'accounts' ? 5 : activeTab === 'reports' ? 6 : 5}>{search ? 'No matching records.' : `No ${currentTab?.label.toLowerCase()} yet.`}</td></tr></tbody>}
      </table></div>
      <footer className="swap-table-footer"><span>{loading ? 'Loading records…' : error ? 'Unable to load records' : `${visibleRows.length} ${activeTab === 'logs' ? 'actions' : activeTab}`}</span>{activeTab === 'logs' && !loading && !error && <span>Latest 100 actions</span>}</footer>
    </section>
  </main>;
}
