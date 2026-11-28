import React, { useEffect, useMemo, useState } from 'react';
import { isListingPending, readStore, updateStore, updateListingApproval } from '../data/localStore';
import formatCurrency from '../utils/formatCurrency';
import Icon from '../components/admin/Icon';
import { useAuth } from '../auth/AuthContext';
import { createMarketplaceNotification } from '../data/marketplaceApi';
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

function listingImageUrls(row) {
  if (row.listing_images && Array.isArray(row.listing_images)) {
    return [...row.listing_images]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(image => {
        if (image.storage_path) {
          return supabase.storage.from('listing-images').getPublicUrl(image.storage_path).data.publicUrl;
        }
        return null;
      })
      .filter(Boolean);
  }
  return row.imageUrls || [];
}

export default function Admin({ section }) {
  const { profile } = useAuth();
  const [live, setLive] = useState({ listings: [], accounts: [], reports: [], logs: [] });
  const [search, setSearch] = useState('');
  const [sortNewest, setSortNewest] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reportAction, setReportAction] = useState(null);
  const [dismissReason, setDismissReason] = useState('');
  const [reportListingImages, setReportListingImages] = useState([]);
  const fetchReportListingImages = async (listingId) => {
    try {
      const { data } = await supabase.from('listings').select('listing_images(storage_path, sort_order)').eq('id', listingId).single();
      if (data?.listing_images) {
        const urls = [...data.listing_images]
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(image => {
            if (image.storage_path) {
              return supabase.storage.from('listing-images').getPublicUrl(image.storage_path).data.publicUrl;
            }
            return null;
          })
          .filter(Boolean);
        setReportListingImages(urls);
      } else {
        setReportListingImages([]);
      }
    } catch {
      setReportListingImages([]);
    }
  };

  const current = tabs.find(item => item.id === section);

  const load = async () => {
    if (isSupabaseConfigured) {
      const [listings, accountResult, reports, logs] = await Promise.all([
        supabase.from('listings').select('*, categories(name), profiles(full_name), listing_images(storage_path, sort_order)').eq('approval_status', 'pending').order('created_at', { ascending: false }),
        supabase.rpc('admin_list_profiles'),
        supabase.from('reports').select('*, profiles!reports_reporter_id_fkey(full_name)').in('status', ['open', 'pending', 'under_review']).order('created_at', { ascending: false }),
        supabase.from('moderation_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }),
      ]);
      const accounts = (accountResult.data || []).filter(item =>
        item.role !== 'admin' &&
        (item.verification_status === 'verified_pending_admin' ||
          (!item.is_verified && item.verification_status !== 'rejected')));
      setLive({
        listings: (listings.data || []).map(row => ({ ...row, category: row.categories?.name || 'Other', owner: row.profiles?.full_name || 'CIT member' })),
        accounts: accounts.map(row => ({ ...row, full_name: row.full_name || row.username || row.email })),
        reports: (reports.data || []).map(row => ({ ...row, reporter_name: row.profiles?.full_name || 'Unknown' })),
        logs: (logs.data || []).map(row => ({ ...row, admin: row.profiles || null })),
      });
      if (listings.error || accountResult.error || reports.error || logs.error) {
        setError([listings.error, accountResult.error, reports.error, logs.error].find(Boolean)?.message || 'Could not load moderation records.');
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

  useEffect(() => {
    if (previewOpen && preview && preview.target_type === 'listing') {
      fetchReportListingImages(preview.target_id);
    } else if (!previewOpen || !preview) {
      setReportListingImages([]);
    }
  }, [previewOpen, preview]);

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
              const { data: deleted } = await supabase.from('listings').select('owner_id, title').eq('id', row.id).single();
              const { error } = await supabase.from('listings').delete().eq('id', row.id);
              if (error) throw error;
              if (deleted?.owner_id) { try { await createMarketplaceNotification(deleted.owner_id, 'listing_deleted', `Your listing "${deleted.title}" was removed by an administrator.`); } catch { /* Listing owner may not have an active profile. */ } }
            } else {
              const { error } = await supabase.from('listings').update({ approval_status: action === 'approve' ? 'approved' : 'rejected' }).eq('id', row.id);
              if (error) throw error;
              const { data: updated } = await supabase.from('listings').select('owner_id, title').eq('id', row.id).single();
              if (updated?.owner_id) { try { await createMarketplaceNotification(updated.owner_id, `listing_${action === 'approve' ? 'approved' : 'rejected'}`, `Your listing "${updated.title}" was ${action === 'approve' ? 'approved' : 'rejected'} by an administrator.`); } catch { /* Listing owner may not have an active profile. */ } }
            }
          } else if (section === 'accounts') {
            const { error } = await supabase.rpc('admin_set_profile_verification', {
              target_user_id: row.id,
              approve: action === 'verify',
            });
            if (error) throw error;
          } else if (section === 'reports') {
            if (action === 'dismissed') {
              const { error } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', row.id);
              if (error) throw error;
              try { await createMarketplaceNotification(row.reporter_id, 'report_dismissed', `Your report on "${row.reason}" was dismissed. Reason: ${dismissReason || 'No reason provided.'}`); } catch { /* Reporter may not have an active profile to notify. */ }
            } else if (action === 'delete_item') {
              const { data: listed } = await supabase.from('listings').select('owner_id, title').eq('id', row.target_id).single();
              const ownerId = row.owner_id || listed?.owner_id;
              const { error } = await supabase.from('listings').delete().eq('id', row.target_id);
              if (error) throw error;
              const { error: updError } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', row.id);
              if (updError) throw updError;
              try { await createMarketplaceNotification(row.reporter_id, 'report_resolved_item_deleted', `Your report on "${row.reason}" was resolved. The reported item has been removed.`); } catch { /* Reporter may not have an active profile to notify. */ }
              if (ownerId) { try { await createMarketplaceNotification(ownerId, 'listing_deleted', `Your listing "${listed?.title || 'this item'}" was removed by an administrator after a report.`); } catch { /* Listing owner may not have an active profile. */ } }
            } else if (action === 'delete_user') {
              const { error } = await supabase.from('profiles').update({ account_status: 'deleted', verification_status: 'rejected' }).eq('id', row.target_id);
              if (error) throw error;
              const { error: updError } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', row.id);
              if (updError) throw updError;
              try { await createMarketplaceNotification(row.target_id, 'account_deleted', 'Your CIT Marketplace account has been deleted by an administrator. You will not be able to log in.'); } catch { /* Warned user may not have an active profile to notify. */ }
            } else if (action === 'warn_user') {
              const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', row.id);
              if (error) throw error;
              try { await createMarketplaceNotification(row.target_id, 'account_warned', 'You have received a warning from a CIT Marketplace administrator regarding a report against your account or listing.'); } catch { /* Warned user may not have an active profile to notify. */ }
            }
          }
          if (section !== 'accounts') {
            const { error } = await supabase.rpc('record_admin_moderation_action', {
              p_action: `${section}_${action}`,
              p_target_type: section,
              p_target_id: row.id,
              p_reason: action,
            });
            if (error) throw error;
          }
          await load();
          setReportAction(null);
          setDismissReason('');
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
          if (action === 'delete') {
            const listing = store.listings.find(item => item.id === row.id);
            store.listings = store.listings.filter(item => item.id !== row.id);
            if (listing?.owner_id) { store.notifications.unshift({ id: `note-${Date.now()}-listing-deleted`, user_id: listing.owner_id, title: 'Listing removed', message: `Your listing "${listing.title}" was removed by an administrator.`, type: 'listing_deleted', related_id: listing.id, is_read: false, created_at: now }); }
          } else {
            const listing = store.listings.find(item => item.id === row.id);
            if (!updateListingApproval(store, row.id, action === 'approve' ? 'approved' : 'rejected')) throw new Error('The listing could not be found.');
            if (listing?.owner_id) { store.notifications.unshift({ id: `note-${Date.now()}-listing-${action}`, user_id: listing.owner_id, title: `Listing ${action === 'approve' ? 'approved' : 'rejected'}`, message: `Your listing "${listing.title}" was ${action === 'approve' ? 'approved' : 'rejected'} by an administrator.`, type: `listing_${action === 'approve' ? 'approved' : 'rejected'}`, related_id: listing.id, is_read: false, created_at: now }); }
          }
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
          if (action === 'dismissed') {
            report.status = 'dismissed';
            report.dismissal_reason = dismissReason || 'No reason provided.';
            store.notifications.unshift({
              id: `note-${Date.now()}-report-dismissed`,
              user_id: report.reporter_id,
              title: 'Report dismissed',
              message: `Your report on "${report.reason}" was dismissed. Reason: ${dismissReason || 'No reason provided.'}`,
              type: 'report_dismissed',
              related_id: report.id,
              is_read: false,
              created_at: now,
            });
          } else if (action === 'delete_item') {
            const listing = store.listings.find(item => item.id === row.target_id);
            store.listings = store.listings.filter(item => item.id !== row.target_id);
            report.status = 'resolved';
            store.notifications.unshift({
              id: `note-${Date.now()}-report-item-deleted`,
              user_id: report.reporter_id,
              title: 'Report resolved - item removed',
              message: `Your report on "${report.reason}" was resolved. The reported item has been removed.`,
              type: 'report_resolved_item_deleted',
              related_id: report.id,
              is_read: false,
              created_at: now,
            });
            if (listing?.owner_id) { store.notifications.unshift({ id: `note-${Date.now()}-listing-deleted`, user_id: listing.owner_id, title: 'Listing removed', message: `Your listing "${listing.title}" was removed by an administrator after a report.`, type: 'listing_deleted', related_id: listing.id, is_read: false, created_at: now }); }
          } else if (action === 'delete_user') {
            const account = store.accounts.find(item => item.id === row.target_id);
            if (account) { account.account_status = 'deleted'; account.verification_status = 'rejected'; }
            report.status = 'resolved';
            store.notifications.unshift({
              id: `note-${Date.now()}-account-deleted`,
              user_id: row.target_id,
              title: 'Account deleted',
              message: 'Your CIT Marketplace account has been deleted by an administrator. You will not be able to log in.',
              type: 'account_deleted',
              related_id: row.target_id,
              is_read: false,
              created_at: now,
            });
          } else if (action === 'warn_user') {
            report.status = 'resolved';
            store.notifications.unshift({
              id: `note-${Date.now()}-account-warned`,
              user_id: row.target_id,
              title: 'Account warning',
              message: 'You have received a warning from a CIT Marketplace administrator regarding a report against your account or listing.',
              type: 'account_warned',
              related_id: row.target_id,
              is_read: false,
              created_at: now,
            });
          }
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
      setReportAction(null);
      setDismissReason('');
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
    <>
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
                      <td className="swap-table-actions"><button type="button" className="swap-action-secondary" onClick={() => { setPreview(row); setPreviewOpen(true); }}>Preview</button><button type="button" className="swap-action-primary" onClick={() => decide(row, 'approve')}>Approve</button><button type="button" className="swap-action-secondary" onClick={() => decide(row, 'reject')}>Reject</button><button type="button" className="swap-action-danger" onClick={() => decide(row, 'delete')}>Delete</button></td>
                    </> : section === 'accounts' ? <>
                      <td>{row.full_name}<small>{row.email}</small></td><td>{row.classification}</td><td>{new Date(row.created_at || Date.now()).toLocaleDateString()}</td><td>Needs verification</td>
                      <td className="swap-table-actions"><button type="button" className="swap-action-secondary" onClick={() => { setPreview(row); setPreviewOpen(true); }}>Preview</button><button type="button" className="swap-action-primary" onClick={() => decide(row, 'verify')}>Verify</button><button type="button" className="swap-action-secondary" onClick={() => decide(row, 'decline')}>Decline</button></td>
                    </> : section === 'reports' ? <>
                      <td>{row.id}</td><td>{row.target_type} · {row.target_id}</td><td>{row.reason}</td><td>{row.reporter_name}</td><td>{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="swap-table-actions"><button type="button" className="swap-action-secondary" onClick={() => { setPreview(row); setPreviewOpen(true); }}>Preview</button><button type="button" className="swap-action-primary" onClick={() => { setReportAction({ report: row, type: 'resolve' }); }}>Resolve</button><button type="button" className="swap-action-secondary" onClick={() => { setReportAction({ report: row, type: 'dismiss' }); setDismissReason(''); }}>Dismiss</button></td>
                    </> : <>
                      <td>{new Date(row.created_at).toLocaleString()}</td><td>{row.admin?.full_name || 'Administrator'}</td><td>{row.action}</td><td>{row.target_type} · {row.target_id}</td><td>{row.note || '—'} <button type="button" className="swap-action-secondary" onClick={() => { setPreview(row); setPreviewOpen(true); }}>See context</button></td>
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

      {previewOpen && preview && (
        <div className="swap-preview-overlay" onClick={() => setPreviewOpen(false)} role="dialog" aria-modal="true" aria-label="Listing preview">
          <div className="swap-preview-card" onClick={event => event.stopPropagation()}>
            <button type="button" className="swap-preview-close" onClick={() => setPreviewOpen(false)} aria-label="Close preview">✕</button>
            {section === 'listings' && (
              <>
                <div className="swap-preview-images">
                  {listingImageUrls(preview).map((url, index) => (
                    <img key={index} src={url} alt={`${preview.title}`} className="swap-preview-image" />
                  ))}
                  {!listingImageUrls(preview).length && <div className="swap-preview-empty">No photos</div>}
                </div>
                <div className="swap-preview-body">
                  <h2>{preview.title}</h2>
                  <p className="swap-preview-meta"><strong>Category:</strong> {preview.category}</p>
                  <p className="swap-preview-meta"><strong>Type:</strong> {preview.listing_type === 'rent' ? 'For rent' : preview.listing_type === 'both' ? 'Sale or rent' : 'For sale'}</p>
                  <p className="swap-preview-meta"><strong>Price:</strong> {formatCurrency(preview.price)}{preview.listing_type === 'rent' ? ' / day' : ''}</p>
                  {preview.listing_type !== 'sale' && preview.deposit && <p className="swap-preview-meta"><strong>Deposit:</strong> {formatCurrency(preview.deposit)}</p>}
                  <p className="swap-preview-meta"><strong>Pickup:</strong> {preview.location || preview.pickup || 'Arrange a campus meetup with the owner.'}</p>
                  <p className="swap-preview-meta"><strong>Condition:</strong> {preview.condition}</p>
                  <p className="swap-preview-meta"><strong>Owner:</strong> {preview.owner}</p>
                  {preview.rental_terms && <p className="swap-preview-meta"><strong>Rental terms:</strong> {preview.rental_terms}</p>}
                  <p className="swap-preview-description"><strong>Description:</strong> {preview.description}</p>
                  <div className="swap-preview-actions">
                    <button type="button" className="swap-action-primary" onClick={() => { setPreviewOpen(false); decide(preview, 'approve'); }}>Approve</button>
                    <button type="button" className="swap-action-secondary" onClick={() => { setPreviewOpen(false); decide(preview, 'reject'); }}>Reject</button>
                    <button type="button" className="swap-action-danger" onClick={() => { setPreviewOpen(false); decide(preview, 'delete'); }}>Delete</button>
                  </div>
                </div>
              </>
            )}
            {section === 'accounts' && (
              <div className="swap-preview-body">
                <span className="avatar avatar-large">{preview.full_name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>
                <h2>{preview.full_name}</h2>
                <p className="swap-preview-meta"><strong>Email:</strong> {preview.email}</p>
                <p className="swap-preview-meta"><strong>Classification:</strong> {preview.classification}</p>
                <p className="swap-preview-meta"><strong>Role:</strong> {preview.role}</p>
                <p className="swap-preview-meta"><strong>Verified:</strong> {preview.is_verified ? 'Yes' : 'No'}</p>
                <p className="swap-preview-meta"><strong>Verification status:</strong> {preview.verification_status}</p>
                <p className="swap-preview-meta"><strong>Account status:</strong> {preview.account_status}</p>
                <p className="swap-preview-meta"><strong>Member since:</strong> {new Date(preview.created_at).toLocaleDateString()}</p>
                <div className="swap-preview-actions">
                  <button type="button" className="swap-action-primary" onClick={() => { setPreviewOpen(false); decide(preview, 'verify'); }}>Verify</button>
                  <button type="button" className="swap-action-secondary" onClick={() => { setPreviewOpen(false); decide(preview, 'decline'); }}>Decline</button>
                </div>
              </div>
            )}
            {section === 'reports' && (
              <div className="swap-preview-body">
                <h2>Report #{preview.id.slice(-6).toUpperCase()}</h2>
                <p className="swap-preview-meta"><strong>Target:</strong> {preview.target_type} · {preview.target_id}</p>
                {preview.target_type === 'listing' && (
                  <div className="swap-preview-images">
                    {reportListingImages.map((url, index) => (
                      <img key={index} src={url} alt="" className="swap-preview-image" />
                    ))}
                    {!reportListingImages.length && <div className="swap-preview-empty">No photos</div>}
                  </div>
                )}
                {preview.target_type === 'user' && (
                  <div className="swap-preview-body" style={{ textAlign: 'center', margin: '12px 0' }}>
                    <span className="avatar avatar-large">{preview.reporter_name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>
                    <h3 style={{ margin: '8px 0 0' }}>{preview.reporter_name}</h3>
                  </div>
                )}
                <p className="swap-preview-meta"><strong>Reason:</strong> {preview.reason}</p>
                <p className="swap-preview-meta"><strong>Reported by:</strong> {preview.reporter_name}</p>
                <p className="swap-preview-meta"><strong>Status:</strong> {preview.status}</p>
                <p className="swap-preview-meta"><strong>Submitted:</strong> {new Date(preview.created_at).toLocaleString()}</p>
                <div className="swap-preview-actions">
                  <button type="button" className="swap-action-primary" onClick={() => { setPreviewOpen(false); setReportAction({ report: preview, type: 'resolve' }); }}>Resolve</button>
                  <button type="button" className="swap-action-secondary" onClick={() => { setPreviewOpen(false); setReportAction({ report: preview, type: 'dismiss' }); setDismissReason(''); }}>Dismiss</button>
                </div>
              </div>
            )}
            {section === 'logs' && (
              <div className="swap-preview-body">
                <h2>Moderation Log</h2>
                <p className="swap-preview-meta"><strong>Time:</strong> {new Date(preview.created_at).toLocaleString()}</p>
                <p className="swap-preview-meta"><strong>Administrator:</strong> {preview.admin?.full_name || 'Administrator'}</p>
                <p className="swap-preview-meta"><strong>Action:</strong> {preview.action}</p>
                <p className="swap-preview-meta"><strong>Target:</strong> {preview.target_type} · {preview.target_id}</p>
                <p className="swap-preview-meta"><strong>Note:</strong> {preview.note || '—'}</p>
                <div className="swap-preview-actions">
                  <button type="button" className="swap-action-secondary" onClick={() => setPreviewOpen(false)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {reportAction && (
        <div className="swap-preview-overlay" onClick={() => setReportAction(null)} role="dialog" aria-modal="true" aria-label="Report action">
          <div className="swap-preview-card" onClick={event => event.stopPropagation()}>
            <button type="button" className="swap-preview-close" onClick={() => setReportAction(null)} aria-label="Close">✕</button>
            {reportAction.type === 'resolve' && (
              <div className="swap-preview-body">
                <h2>Resolve Report</h2>
                <p className="swap-preview-meta"><strong>Reason:</strong> {reportAction.report.reason}</p>
                <p className="swap-preview-meta"><strong>Reported by:</strong> {reportAction.report.reporter_name}</p>
                <p className="swap-preview-meta"><strong>Target:</strong> {reportAction.report.target_type} · {reportAction.report.target_id}</p>
                <div className="swap-preview-actions">
                  <button type="button" className="swap-action-danger" onClick={() => { setReportAction(null); decide(reportAction.report, 'delete_item'); }}>Delete item</button>
                  <button type="button" className="swap-action-danger" onClick={() => { setReportAction(null); decide(reportAction.report, 'delete_user'); }}>Delete user</button>
                  <button type="button" className="swap-action-secondary" onClick={() => { setReportAction(null); decide(reportAction.report, 'warn_user'); }}>Warn user</button>
                </div>
              </div>
            )}
            {reportAction.type === 'dismiss' && (
              <div className="swap-preview-body">
                <h2>Dismiss Report</h2>
                <p className="swap-preview-meta"><strong>Reason:</strong> {reportAction.report.reason}</p>
                <p className="swap-preview-meta"><strong>Reported by:</strong> {reportAction.report.reporter_name}</p>
                <label className="field-label">Explain why this report is being dismissed</label>
                <textarea value={dismissReason} onChange={event => setDismissReason(event.target.value)} rows="3" required maxLength="1000" />
                <div className="swap-preview-actions">
                  <button type="button" className="swap-action-secondary" onClick={() => { setReportAction(null); setDismissReason(''); }}>Cancel</button>
                  <button type="button" className="swap-action-primary" onClick={() => { setReportAction(null); decide(reportAction.report, 'dismissed'); }}>Confirm dismissal</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
