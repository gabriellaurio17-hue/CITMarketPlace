import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { logNotification, readStore, updateStore } from '../data/localStore';
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

  const load = useCallback(() => {
    const store = readStore();
    setRows(store.transactions.filter(item => item.type === 'rental' && (item.seller_id === user.id || item.buyer_id === user.id)));
    setOwned(store.listings.filter(item => item.owner_id === user.id && item.approval_status === 'approved' && item.availability === 'active' && ['rent', 'both'].includes(item.listing_type)));
  }, [user.id]);

  useEffect(() => {
    load();
    window.addEventListener('marketplace-store-change', load);
    return () => window.removeEventListener('marketplace-store-change', load);
  }, [load]);

  const submit = event => {
    event.preventDefault();
    setError('');
    setNotice('');
    setInvalidField('');
    const store = readStore();
    const renter = store.accounts.find(account => account.email === form.renterEmail.trim().toLowerCase());
    const listing = owned.find(item => item.id === form.listing);
    if (!renter) { setInvalidField('renter-email'); setError('That email does not match an existing local demo account.'); return; }
    if (renter.id === user.id) { setInvalidField('renter-email'); setError('Choose another account as the renter.'); return; }
    const transaction = {
      id: `tx-${Date.now()}`, type: 'rental', status: 'ongoing', buyer_id: renter.id, seller_id: user.id,
      listing_id: listing.id, start_date: form.start, end_date: form.end, deposit_amount: listing.deposit || 0,
      deposit_status: 'held', created_at: new Date().toISOString(), listings: { title: listing.title, price: listing.price },
      renter: { full_name: renter.full_name, email: renter.email },
    };
    try {
      updateStore(data => data.transactions.unshift(transaction));
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

  const returned = id => {
    updateStore(store => {
      const transaction = store.transactions.find(item => item.id === id);
      if (transaction) { transaction.status = 'completed'; transaction.deposit_status = 'returned'; }
    });
    setNotice('Rental marked returned; its transaction is complete.');
    load();
  };

  return <div className="content-width standard-page" role="main">
    <div className="page-heading"><span className="eyebrow">KEEP THE GOOD THINGS MOVING</span><h1>Rental<br />check-in<span>.</span></h1><p>A clear view of what’s out, what’s due, and what’s back.</p></div>
    {error && <p className="admin-alert" id="rental-form-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    <section className="table-card"><div className="table-heading"><div><h2>Your rentals</h2><p>Meet up, exchange in person, and keep this list up to date.</p></div><span className="table-count">{rows.length} rentals</span></div>
      <div className="table-scroll"><table><thead><tr><th>ITEM</th><th>RENTER</th><th>START</th><th>END</th><th>DEPOSIT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
        {rows.map(item => <tr key={item.id}><td><strong>{item.listings?.title}</strong><small>CIT Marketplace</small></td><td>{item.renter?.full_name || readStore().accounts.find(account => account.id === item.buyer_id)?.full_name}</td><td>{item.start_date}</td><td>{item.end_date}</td><td>{formatCurrency(item.deposit_amount)} · {item.deposit_status}</td><td><span className={`status-pill status-${item.status}`}>{item.status}</span></td><td>{item.status === 'ongoing' && item.seller_id === user.id && <button className="return-button" onClick={() => returned(item.id)}>Mark returned</button>}</td></tr>)}
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
