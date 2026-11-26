import React, { useEffect, useMemo, useState } from 'react';
import { isListingPending, readStore, updateStore, updateListingApproval } from '../data/localStore';
import formatCurrency from '../utils/formatCurrency';
import Icon from '../components/admin/Icon';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const tabs = [
  { id: 'listings', label: 'Pending Listings' },
  { id: 'accounts', label: 'Verify Accounts' },
  { id: 'reports', label: 'Reports' },
  { id: 'logs', label: 'Moderation Log' },
];

function Metric({ label, value, icon }) {
  return <article className="swap-metric-card"><div className="swap-metric-top"><span>{label}</span><span className="swap-metric-icon"><Icon name={icon} size={19} /></span></div><strong className="swap-metric-number">{value}</strong></article>;
}

export default function Admin({ section }) {
  const { profile } = useAuth();
  const [live, setLive] = useState({ listings: [], accounts: [], reports: [], logs: [] });
  const [search, setSearch] = useState('');
  const [sortNewest, setSortNewest] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const current = tabs.find(item => item.id === section);

  const load = async () => {
    if (isSupabaseConfigured) {
      const [listings, accounts, reports, logs] = await Promise.all([
        supabase.from('listings').select('*, categories(name), profiles(full_name)').eq('approval_status', 'pending').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').or('verification_status.eq.verified_pending_admin,verification_status.eq.pending').neq('role', 'admin').order('created_at', { ascending: false }),
        supabase.from('reports').select('*').in('status', ['open', 'pending', 'under_review']).order('created_at', { ascending: false }),
        supabase.from('moderation_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }),
      ]);
      setLive({
        listings: (listings.data || []).map(row => ({ ...row, category: row.categories?.name || 'Other', owner: row.profiles?.full_name || 'CIT member' })),
        accounts: (accounts.data || []).map(row => ({ ...row, full_name: row.full_name || row.username || row.email })),
        reports: reports.data || [],
        logs: (logs.data || []).map(row => ({ ...row, admin: row.profiles || null })),
      });
      if (listings.error || accounts.error || reports.error || logs.error) {
        setError([listings.error, accounts.error, reports.error, logs.error].find(Boolean)?.message || 'Could not load moderation records.');
      }
      return;
    }
    const store = readStore();
    setLive({
      listings: store.listings.filter(isListingPending),
      accounts: store.accounts.filter(item =>
        item.role !== 'admin' &&
        (item.verification_status === 'verified_pending_admin' ||
          (!item.is_verified && item.verification_status !== 'rejected'))),
      reports: store.reports.filter(item => ['open', 'pending', 'under_review'].includes(item.status)),
      logs: store.logs,
    });
  };

  useEffect(() => {
    load();
    window.addEventListener('marketplace-store-change', load);
    return () => window.removeEventListener('marketplace-store-change', load);
  }, []);

  const rows = useMemo(() => {
    const query = search.toLowerCase();
    return (live[section] || [])
      .filter(item => JSON.stringify(item).toLowerCase().includes(query))
      .sort((first, second) => sortNewest
        ? String(second.created_at || '').localeCompare(String(first.created_at || ''))
        : String(first.title || first.full_name || first.reason || first.action || '')
          .localeCompare(String(second.title || second.full_name || second.reason || second.action || '')));
  }, [live, section, search, sortNewest]);

  const decide = (row, action) => {
    setError('');
    setNotice('');
    if (isSupabaseConfigured) {
      (async () => {
        try {
          if (section === 'listings') {
            if (action === 'delete') {
              const { error } = await supabase.from('listings').delete().eq('id', row.id);
              if (error) throw error;
            } else {
              const { error } = await supabase.from('listings').update({ approval_status: action === 'approve' ? 'approved' : 'rejected' }).eq('id', row.id);
              if (error) throw error;
            }
          } else if (section === 'accounts') {
            const values = action === 'verify'
              ? { is_verified: true, verification_status: 'approved', account_status: 'active' }
              : { is_verified: false, verification_status: 'rejected', account_status: 'inactive' };
            const { error } = await supabase.from('profiles').update(values).eq('id', row.id);
            if (error) throw error;
            await supabase.from('notifications').insert({ user_id: row.id, type: `account_${action === 'verify' ? 'verified' : 'rejected'}`, message: action === 'verify' ? 'The administrator approved your marketplace account.' : 'The administrator rejected your account verification.' });
          } else if (section === 'reports') {
            const { error } = await supabase.from('reports').update({ status: action }).eq('id', row.id);
            if (error) throw error;
          }
          await supabase.from('moderation_logs').insert({ action: `${section}_${action}`, target_type: section, target_id: row.id, administrator_id: profile?.id, reason: action });
          await load();
          const target = row.title || row.full_name || 'Report';
          setNotice(`${target}: ${action === 'delete' ? 'deleted' : action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'verify' ? 'verified' : action === 'decline' ? 'declined' : action}.`);
        } catch (saveError) {
          setError(`Could not save this action. ${saveError.message || 'Please try again.'}`);
        }
      })();
      return;
    }
    try {
      updateStore(store => {
        const now = new Date().toISOString();
        if (section === 'listings') {
          if (action === 'delete') store.listings = store.listings.filter(item => item.id !== row.id);
          else if (!updateListingApproval(store, row.id, action === 'approve' ? 'approved' : 'rejected')) throw new Error('The listing could not be found.');
        } else if (section === 'accounts') {
          const account = store.accounts.find(item => item.id === row.id);
          if (!account) throw new Error('The account could not be found.');
          account.is_verified = action === 'verify';
          account.verification_status = action === 'verify' ? 'approved' : 'rejected';
          if (action === 'decline') account.account_status = 'inactive';
          store.notifications.unshift({
            id: `log-${Date.now()}-account-notice`,
            user_id: account.id,
            title: action === 'verify' ? 'Account verified' : 'Account verification rejected',
            message: action === 'verify'
              ? 'The administrator approved your marketplace account.'
              : 'The administrator rejected your account verification.',
            type: `account_${action === 'verify' ? 'verified' : 'rejected'}`,
            related_id: account.id,
            is_read: false,
            created_at: now,
          });
        } else {
          const report = store.reports.find(item => item.id === row.id);
          if (!report) throw new Error('The report could not be found.');
          report.status = action;
        }
        store.logs.unshift({
          id: `log-${Date.now()}`,
          action: `${section}_${action}`,
          target_type: section,
          target_id: row.id,
          administrator_id: profile?.id,
          reason: action,
          created_at: now,
          admin: { id: profile?.id, full_name: profile?.full_name || 'Administrator' },
        });
      });
      load();
      const target = row.title || row.full_name || 'Report';
      setNotice(`${target}: ${action === 'delete' ? 'deleted' : action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'verify' ? 'verified' : action === 'decline' ? 'declined' : action}.`);
    } catch (saveError) {
      setError(`Could not save this action in your browser. ${saveError.message || 'Please try again.'}`);
    }
  };

  const exportLog = () => {
    const csv = [
      ['Time', 'Action', 'Target'],
      ...live.logs.map(item => [item.created_at, item.action, item.target_id]),
    ].map(row => row.map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'marketplace-moderation-log.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const emptyMessage = search ? 'No matching records.' : `No ${current?.label.toLowerCase()} yet.`;

  return (
    <main className="swap-admin-main">
      <div className="swap-admin-title-row">
        <div>
          <h1>{current?.label}</h1>
          <p>{section === 'listings' ? 'Review listings awaiting approval.' : section === 'accounts' ? 'Review demo member accounts.' : section === 'reports' ? 'Review reports submitted by members.' : 'Review the local moderation history.'}</p>
        </div>
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <div className="swap-metrics-grid">
        <Metric label="Pending Listings" value={live.listings.length} icon="tag" />
        <Metric label="Accounts to Verify" value={live.accounts.length} icon="shield" />
        <Metric label="Open Reports" value={live.reports.length} icon="flag" />
        <Metric label="Moderation Actions" value={live.logs.length} icon="clipboard" />
      </div>
      <section className="swap-admin-table-card" aria-labelledby="admin-records-title">
        <div className="swap-table-titlebar">
          <div><h2 id="admin-records-title">{current?.label}</h2><p>Records saved in this browser.</p></div>
          <div className="swap-table-toolbar">
            <label className="swap-table-search">
              <Icon name="search" size={16} />
              <input aria-label={`Search ${current?.label.toLowerCase() || 'records'}`} placeholder="Search..." value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <button type="button" className="swap-sort-button" aria-pressed={sortNewest} onClick={() => setSortNewest(value => !value)}>
              Sort: {sortNewest ? 'Newest first' : 'Name A to Z'} <Icon name="chevron" size={15} />
            </button>
            {section === 'logs' && <button type="button" className="swap-export-button" onClick={exportLog}><Icon name="download" size={16} />Export log</button>}
          </div>
        </div>
        <div className="swap-table-scroll">
          <table className="swap-admin-table" aria-label={`${current?.label || 'Admin'} records`}>
            <thead>
              <tr>
                {section === 'listings' ? <><th>ID</th><th>LISTING</th><th>SELLER</th><th>CATEGORY</th><th>PRICE</th><th>STATUS</th><th>ACTIONS</th></>
                  : section === 'accounts' ? <><th>ACCOUNT</th><th>CLASSIFICATION</th><th>CREATED</th><th>STATUS</th><th>ACTIONS</th></>
                    : section === 'reports' ? <><th>ID</th><th>SUBJECT</th><th>REASON</th><th>REPORTED BY</th><th>DATE</th><th>ACTIONS</th></>
                      : <><th>TIME</th><th>ADMINISTRATOR</th><th>ACTION</th><th>TARGET</th><th>NOTE</th></>}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  {section === 'listings' ? <>
                    <td>L-{row.id.slice(-6).toUpperCase()}</td>
                    <td><strong>{row.title}</strong><small>{row.listing_type} · Posted {new Date(row.created_at).toLocaleDateString()}</small></td>
                    <td>{readStore().accounts.find(account => account.id === row.owner_id)?.full_name}</td>
                    <td>{row.category}</td><td>{formatCurrency(row.price)}</td><td><span className="swap-status-chip swap-status-pending">Pending</span></td>
                    <td className="swap-table-actions"><button type="button" className="swap-action-primary" onClick={() => decide(row, 'approve')}>Approve</button><button type="button" className="swap-action-secondary" onClick={() => decide(row, 'reject')}>Reject</button><button type="button" className="swap-action-danger" onClick={() => decide(row, 'delete')}>Delete</button></td>
                  </> : section === 'accounts' ? <>
                    <td>{row.full_name}<small>{row.email}</small></td><td>{row.classification}</td><td>{new Date(row.created_at || Date.now()).toLocaleDateString()}</td><td>Needs verification</td>
                    <td className="swap-table-actions"><button type="button" className="swap-action-primary" onClick={() => decide(row, 'verify')}>Verify</button><button type="button" className="swap-action-secondary" onClick={() => decide(row, 'decline')}>Decline</button></td>
                  </> : section === 'reports' ? <>
                    <td>{row.id}</td><td>{row.target_type} · {row.target_id}</td><td>{row.reason}</td><td>{row.reporter_name}</td><td>{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="swap-table-actions"><button type="button" className="swap-action-primary" onClick={() => decide(row, 'resolved')}>Resolve</button><button type="button" className="swap-action-secondary" onClick={() => decide(row, 'dismissed')}>Dismiss</button></td>
                  </> : <>
                    <td>{new Date(row.created_at).toLocaleString()}</td><td>{row.admin?.full_name || 'Administrator'}</td><td>{row.action}</td><td>{row.target_type} · {row.target_id}</td><td>{row.note || '—'}</td>
                  </>}
                </tr>
              ))}
              {!rows.length && <tr><td className="swap-empty-cell" colSpan={section === 'listings' ? 7 : section === 'accounts' ? 5 : section === 'reports' ? 6 : 5}>{emptyMessage}</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="swap-table-footer" aria-live="polite" aria-atomic="true"><span>{rows.length} {section === 'logs' ? 'actions' : section}</span></footer>
      </section>
    </main>
  );
}
