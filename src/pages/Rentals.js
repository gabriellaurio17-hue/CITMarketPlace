import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { logNotification, readStore, updateStore } from '../data/localStore';
import { createMarketplaceNotification, createMarketplaceTransaction, loadMarketplaceTransactions, updateMarketplaceTransaction } from '../data/marketplaceApi';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import formatCurrency from '../utils/formatCurrency';

export default function Rentals() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [owned, setOwned] = useState([]);
  const [form, setForm] = useState({ listing: '', renterEmail: '', start: '', end: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [invalidField, setInvalidField] = useState('');

  useEffect(() => {
    if (error && invalidField) document.getElementById(invalidField)?.focus();
  }, [error, invalidField]);

  const load = useCallback(async () => {
    if (isSupabaseConfigured) {
      const [transactions, listingResult] = await Promise.all([
        loadMarketplaceTransactions(user.id, 'rental'),
        supabase.from('listings').select('*, categories(name)').eq('owner_id', user.id).eq('approval_status', 'approved').eq('availability', 'active'),
      ]);
      if (listingResult.error) { setError(listingResult.error.message); return; }
      setRows(transactions);
      setOwned((listingResult.data || []).filter(item => ['rent', 'both'].includes(item.listing_type)).map(item => ({ ...item, category: item.categories?.name || 'Other' })));
      return;
    }
    const store = readStore();
    const now = new Date();
    let changed = false;
    store.transactions.forEach(item => {
      if (item.type === 'rental' && item.status === 'approved' && item.start_date) {
        const start = new Date(item.start_date);
        if (!Number.isNaN(start.getTime()) && start <= now) {
          item.status = 'ongoing';
          changed = true;
        }
      }
      if (item.type === 'rental' && ['approved', 'ongoing'].includes(item.status) && item.end_date) {
        const end = new Date(item.end_date);
        if (!Number.isNaN(end.getTime()) && end < now && item.status !== 'overdue') {
          item.status = 'overdue';
          changed = true;
        }
      }
    });
    if (changed) updateStore(data => { data.transactions.forEach(item => { const match = store.transactions.find(row => row.id === item.id); if (match) item.status = match.status; }); });
    setRows(store.transactions.filter(item => item.type === 'rental' && (item.seller_id === user.id || item.buyer_id === user.id)));
    setOwned(store.listings.filter(item => item.owner_id === user.id && item.approval_status === 'approved' && item.availability === 'active' && ['rent', 'both'].includes(item.listing_type)));
  }, [user.id]);

  useEffect(() => {
    load();
    window.addEventListener('marketplace-store-change', load);
    return () => window.removeEventListener('marketplace-store-change', load);
  }, [load]);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setNotice('');
    setInvalidField('');
    const listing = owned.find(item => item.id === form.listing);
    if (!listing) { setError('Choose one of your active rental listings.'); return; }
    if (isSupabaseConfigured) {
      const { data: renter, error: profileError } = await supabase.from('profiles').select('id,full_name,email,is_verified').eq('email', form.renterEmail.trim().toLowerCase()).maybeSingle();
      if (profileError || !renter) { setInvalidField('renter-email'); setError(profileError?.message || 'That email does not match a marketplace account.'); return; }
      if (renter.id === user.id) { setInvalidField('renter-email'); setError('Choose another account as the renter.'); return; }
      if (!renter.is_verified) { setInvalidField('renter-email'); setError('The renter must complete account verification.'); return; }
      try {
        await createMarketplaceTransaction({ type: 'rental', status: 'pending', buyer_id: renter.id, seller_id: user.id, listing_id: listing.id, start_date: form.start, end_date: form.end, deposit_amount: listing.deposit || 0, deposit_status: listing.deposit ? 'pending' : 'not_applicable' });
        try { await createMarketplaceNotification(renter.id, 'rental_request', `${user.email.split('@')[0]} submitted a rental request for ${listing.title}.`); } catch { /* Recipient-write RLS may reserve notifications for server workflows. */ }
        setNotice('Rental recorded and the renter has been notified.');
        setForm({ listing: '', renterEmail: '', start: '', end: '' });
        await load();
      } catch (saveError) { setError(`Could not save this rental. ${saveError.message || 'Please try again.'}`); }
      return;
    }
    const store = readStore();
    const renter = store.accounts.find(account => account.email === form.renterEmail.trim().toLowerCase());
    if (!renter) { setInvalidField('renter-email'); setError('That email does not match an existing local demo account.'); return; }
    if (renter.id === user.id) { setInvalidField('renter-email'); setError('Choose another account as the renter.'); return; }
    const transaction = {
      id: `tx-${Date.now()}`, type: 'rental', status: 'pending', buyer_id: renter.id, seller_id: user.id,
      listing_id: listing.id, start_date: form.start, end_date: form.end, deposit_amount: listing.deposit || 0,
      deposit_status: listing.deposit ? 'pending' : 'not_applicable', created_at: new Date().toISOString(), listings: { title: listing.title, price: listing.price },
      renter: { full_name: renter.full_name, email: renter.email },
    };
    try {
      updateStore(data => {
        data.transactions.unshift(transaction);
        data.notifications.unshift({ id: `note-${Date.now()}-rental-request`, user_id: renter.id, title: 'Rental request submitted', type: 'rental_request', message: `${user.email.split('@')[0]} submitted a rental request for ${listing.title}.`, related_id: transaction.id, is_read: false, created_at: new Date().toISOString() });
      });
      logNotification(renter.id, 'rental_recorded', `${user.email.split('@')[0]} recorded a rental for ${listing.title}.`);
    } catch (saveError) {
      setError(`Could not save this rental in your browser. ${saveError.message || 'Please try again.'}`);
      return;
    }
    setNotice('Rental recorded and the renter has been notified.');
    setError('');
    setForm({ listing: '', renterEmail: '', start: '', end: '' });
    load();
  };

  const returned = async id => {
    if (isSupabaseConfigured) {
      const transaction = rows.find(item => item.id === id);
      try {
        await updateMarketplaceTransaction(id, { status: 'returned', deposit_status: 'returned' });
        if (transaction) await supabase.from('listings').update({ availability: 'active' }).eq('id', transaction.listing_id);
        if (transaction) try { await createMarketplaceNotification(transaction.buyer_id, 'rental_returned', `${transaction.listings?.title || 'Your rental'} was marked returned.`); } catch { /* Notification is optional under current RLS. */ }
        setNotice('Rental marked returned.'); await load();
      } catch (saveError) { setError(saveError.message || 'Could not update the rental.'); }
      return;
    }
    updateStore(store => {
      const transaction = store.transactions.find(item => item.id === id);
      if (transaction) { transaction.status = 'returned'; transaction.returned_at = new Date().toISOString(); transaction.deposit_status = 'returned'; const listing = store.listings.find(item => item.id === transaction.listing_id); if (listing) listing.availability = 'active'; store.notifications.unshift({ id: `note-${Date.now()}-returned`, user_id: transaction.buyer_id, title: 'Rental item returned', type: 'rental_returned', message: `${transaction.listings?.title || 'Your rental'} was marked returned.`, related_id: transaction.id, is_read: false, created_at: new Date().toISOString() }); }
    });
    setNotice('Rental marked returned; its transaction is complete.');
    load();
  };
  const approve = async id => {
    if (isSupabaseConfigured) {
      const transaction = rows.find(item => item.id === id);
      try {
        await updateMarketplaceTransaction(id, { status: 'approved', deposit_status: transaction?.deposit_amount > 0 ? 'held' : 'not_applicable' });
        if (transaction) await supabase.from('listings').update({ availability: 'unavailable' }).eq('id', transaction.listing_id);
        if (transaction) try { await createMarketplaceNotification(transaction.buyer_id, 'rental_approved', `${transaction.listings?.title || 'Your rental'} was approved.`); } catch { /* Notification is optional under current RLS. */ }
        setNotice('Rental approved.'); await load();
      } catch (saveError) { setError(saveError.message || 'Could not approve the rental.'); }
      return;
    }
    updateStore(store => {
      const transaction = store.transactions.find(item => item.id === id);
      if (!transaction) return;
      transaction.status = 'approved';
      transaction.deposit_status = transaction.deposit_amount > 0 ? 'held' : 'not_applicable';
      const listing = store.listings.find(item => item.id === transaction.listing_id);
      if (listing) listing.availability = 'unavailable';
      store.notifications.unshift({ id: `note-${Date.now()}-approved`, user_id: transaction.buyer_id, title: 'Rental approved', type: 'rental_approved', message: `${transaction.listings?.title || 'Your rental'} was approved.`, related_id: transaction.id, is_read: false, created_at: new Date().toISOString() });
    });
    setNotice('Rental approved.');
    load();
  };
  const reject = async id => {
    if (isSupabaseConfigured) {
      const transaction = rows.find(item => item.id === id);
      try {
        await updateMarketplaceTransaction(id, { status: 'cancelled' });
        if (transaction) try { await createMarketplaceNotification(transaction.buyer_id, 'rental_rejected', `${transaction.listings?.title || 'Your rental request'} was rejected.`); } catch { /* Notification is optional under current RLS. */ }
        setNotice('Rental request rejected.'); await load();
      } catch (saveError) { setError(saveError.message || 'Could not reject the rental.'); }
      return;
    }
    updateStore(store => {
      const transaction = store.transactions.find(item => item.id === id);
      if (!transaction) return;
      transaction.status = 'cancelled';
      transaction.cancelled_at = new Date().toISOString();
      store.notifications.unshift({ id: `note-${Date.now()}-rejected`, user_id: transaction.buyer_id, title: 'Rental rejected', type: 'rental_rejected', message: `${transaction.listings?.title || 'Your rental request'} was rejected.`, related_id: transaction.id, is_read: false, created_at: new Date().toISOString() });
    });
    setNotice('Rental request rejected.');
    load();
  };
  const completeRental = async id => {
    if (isSupabaseConfigured) {
      const transaction = rows.find(item => item.id === id);
      try {
        await updateMarketplaceTransaction(id, { status: 'completed', deposit_status: transaction?.deposit_status === 'held' ? 'returned' : transaction?.deposit_status });
        if (transaction) await supabase.from('listings').update({ availability: 'active' }).eq('id', transaction.listing_id);
        if (transaction) for (const participantId of [transaction.seller_id, transaction.buyer_id]) {
          try { await createMarketplaceNotification(participantId, 'rental_completed', `${transaction.listings?.title || 'The rental'} is complete and eligible for a seller review.`); } catch { /* Notification is optional under current RLS. */ }
        }
        setNotice('Rental completed. The renter may submit a seller review.'); await load();
      } catch (saveError) { setError(saveError.message || 'Could not complete the rental.'); }
      return;
    }
    updateStore(store => {
      const transaction = store.transactions.find(item => item.id === id);
      if (!transaction) return;
      transaction.status = 'completed';
      transaction.completed_at = new Date().toISOString();
      if (transaction.deposit_status === 'held') transaction.deposit_status = 'returned';
      const listing = store.listings.find(item => item.id === transaction.listing_id);
      if (listing) listing.availability = 'active';
      [transaction.seller_id, transaction.buyer_id].forEach(userId => store.notifications.unshift({ id: `note-${Date.now()}-${userId}-completed`, user_id: userId, title: 'Rental completed', type: 'rental_completed', message: `${transaction.listings?.title || 'The rental'} is complete and eligible for reviews.`, related_id: transaction.id, is_read: false, created_at: new Date().toISOString() }));
    });
    setNotice('Rental completed. Both participants may submit one review.');
    load();
  };

  return <div className="content-width standard-page" role="main">
    <div className="page-heading"><span className="eyebrow">KEEP THE GOOD THINGS MOVING</span><h1>Rental<br />check-in<span>.</span></h1><p>A clear view of what’s out, what’s due, and what’s back.</p></div>
    {error && <p className="admin-alert" id="rental-form-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    <section className="table-card"><div className="table-heading"><div><h2>Your rentals</h2><p>Meet up, exchange in person, and keep this list up to date.</p></div><span className="table-count">{rows.length} rentals</span></div>
      <div className="table-scroll"><table><thead><tr><th>ITEM</th><th>RENTER</th><th>START</th><th>END</th><th>DEPOSIT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
        {rows.map(item => <tr key={item.id}><td><strong>{item.listings?.title}</strong><small>CIT Marketplace</small></td><td>{item.renter?.full_name || readStore().accounts.find(account => account.id === item.buyer_id)?.full_name}</td><td>{item.start_date}</td><td>{item.end_date}</td><td>{formatCurrency(item.deposit_amount)} · {item.deposit_status}</td><td><span className={`status-pill status-${item.status}`}>{item.status}</span></td><td>{item.status === 'pending' && item.seller_id === user.id && <><button className="return-button" onClick={() => approve(item.id)}>Approve</button><button className="text-button" onClick={() => reject(item.id)}>Reject</button></>}{['ongoing','overdue','approved'].includes(item.status) && item.seller_id === user.id && <button className="return-button" onClick={() => returned(item.id)}>Mark returned</button>}{item.status === 'returned' && item.seller_id === user.id && <button className="return-button" onClick={() => completeRental(item.id)}>Complete rental</button>}</td></tr>)}
        {!rows.length && <tr><td colSpan="7">No rental transactions yet.</td></tr>}
      </tbody></table></div>
    </section>
    <section className="form-card rental-record-form"><div className="form-section-heading"><span className="step-number">＋</span><div><h2>Record a rental</h2><p>Record the in-person arrangement and notify the renter.</p></div></div>
      {!owned.length && <p className="admin-empty">There are no approved, active rental listings on your account yet.</p>}
      <form className="auth-form" onSubmit={submit}><label className="field-label" htmlFor="rental-listing">Your approved rental listing</label><select id="rental-listing" value={form.listing} onChange={event => setForm(current => ({ ...current, listing: event.target.value }))} required><option value="">Choose a listing</option>{owned.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <label className="field-label" htmlFor="renter-email">Renter’s @cit.edu email</label><input id="renter-email" type="email" value={form.renterEmail} aria-invalid={Boolean(error && invalidField === 'renter-email')} aria-describedby={error && invalidField === 'renter-email' ? 'rental-form-error' : undefined} onChange={event => { setForm(current => ({ ...current, renterEmail: event.target.value })); setError(''); setInvalidField(''); }} required />
        <div className="form-two-columns"><div><label className="field-label" htmlFor="rental-start">Start date</label><input id="rental-start" type="date" value={form.start} onChange={event => setForm(current => ({ ...current, start: event.target.value }))} required /></div><div><label className="field-label" htmlFor="rental-end">End date</label><input id="rental-end" type="date" min={form.start || undefined} value={form.end} onChange={event => setForm(current => ({ ...current, end: event.target.value }))} required /></div></div>
        <button className="button" disabled={!owned.length}>Record rental</button>
      </form>
    </section>
    <div className="offline-banner"><span>↗</span><p><strong>Remember: the hand-off happens in person.</strong><br />Agree on a public campus meetup and exchange the item and deposit offline.</p></div>
  </div>;
}
