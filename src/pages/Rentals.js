import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import formatCurrency from '../utils/formatCurrency';

export default function Rentals() {
  const { user, profile } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [rentableListings, setRentableListings] = useState([]);
  const [form, setForm] = useState({ listing: '', renterEmail: '', start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadRentals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [rentalsResult, listingsResult] = await Promise.all([
      supabase.from('transactions').select('id, buyer_id, seller_id, start_date, end_date, deposit_amount, deposit_status, status, created_at, listings(title), renter:profiles!transactions_buyer_id_fkey(full_name, email)').eq('type', 'rental').or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`).order('start_date', { ascending: false }),
      supabase.from('listings').select('id, title, listing_type').eq('owner_id', user.id).eq('approval_status', 'approved').eq('availability', 'active').in('listing_type', ['rent', 'both']),
    ]);
    const failed = [rentalsResult, listingsResult].find((result) => result.error);
    setError(failed?.error?.message || '');
    setRentals(rentalsResult.data || []);
    setRentableListings(listingsResult.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadRentals(); }, [loadRentals]);

  const markReturned = async (id) => {
    setBusy(true);
    setError('');
    const { error: updateError } = await supabase.rpc('complete_rental_return', { p_transaction_id: id });
    setBusy(false);
    if (updateError) { setError(updateError.message); return; }
    setNotice('Rental marked returned; its transaction is complete.');
    await loadRentals();
  };

  const recordRental = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const { error: createError } = await supabase.rpc('create_marketplace_transaction_by_email', {
      p_listing_id: form.listing,
      p_buyer_email: form.renterEmail.trim().toLowerCase(),
      p_type: 'rental',
      p_start_date: form.start,
      p_end_date: form.end,
    });
    setBusy(false);
    if (createError) { setError(createError.message); return; }
    setNotice('Rental recorded and the renter has been notified.');
    setForm({ listing: '', renterEmail: '', start: '', end: '' });
    await loadRentals();
  };

  return (
    <div className="content-width standard-page">
      <div className="page-heading"><span className="eyebrow">KEEP THE GOOD THINGS MOVING</span><h1>Rental<br />check-in<span>.</span></h1><p>A clear view of what’s out, what’s due, and what’s back.</p></div>
      {error && <p className="admin-alert" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
      <section className="table-card"><div className="table-heading"><div><h2>Your rentals</h2><p>Meet up, exchange in person, and keep this list up to date.</p></div><span className="table-count">{rentals.length} rentals</span></div>
        <div className="table-scroll"><table><thead><tr><th>ITEM</th><th>RENTER</th><th>START</th><th>END</th><th>DEPOSIT</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rentals.map((rental) => <tr key={rental.id}><td data-label="Item"><strong>{rental.listings?.title || 'Marketplace listing'}</strong><small>CIT Marketplace</small></td><td data-label="Renter">{rental.renter?.full_name || rental.renter?.email || 'Member'}</td><td data-label="Start">{rental.start_date}</td><td data-label="End">{rental.end_date}</td><td data-label="Deposit">{formatCurrency(rental.deposit_amount)} · {rental.deposit_status}</td><td data-label="Status"><span className={`status-pill status-${rental.status}`}>{rental.end_date && new Date(`${rental.end_date}T23:59:59`) < new Date() && rental.status === 'ongoing' ? 'Overdue' : rental.status}</span></td><td data-label="Action">{rental.status === 'ongoing' && rental.seller_id === user.id && <button className="return-button" disabled={busy} onClick={() => markReturned(rental.id)}>Mark returned</button>}</td></tr>)}{!loading && !rentals.length && <tr><td colSpan="7">No rental transactions yet.</td></tr>}</tbody></table></div>
      </section>
      {profile?.is_verified && <section className="form-card rental-record-form"><div className="form-section-heading"><span className="step-number">＋</span><div><h2>Record a rental</h2><p>Record the in-person arrangement and notify the renter.</p></div></div>
        <form className="auth-form" onSubmit={recordRental}><label className="field-label" htmlFor="rental-listing">Your approved rental listing</label><select id="rental-listing" value={form.listing} onChange={(event) => setForm((current) => ({ ...current, listing: event.target.value }))} required><option value="">Choose a listing</option>{rentableListings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select><label className="field-label" htmlFor="renter-email">Renter’s @cit.edu email</label><input id="renter-email" type="email" value={form.renterEmail} onChange={(event) => setForm((current) => ({ ...current, renterEmail: event.target.value }))} required /><div className="form-two-columns"><div><label className="field-label" htmlFor="rental-start">Start date</label><input id="rental-start" type="date" value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} required /></div><div><label className="field-label" htmlFor="rental-end">End date</label><input id="rental-end" type="date" min={form.start || undefined} value={form.end} onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))} required /></div></div><button className="button" type="submit" disabled={busy || !rentableListings.length}>{busy ? 'Saving…' : 'Record rental'}</button></form>
      </section>}
      <div className="offline-banner"><span>↗</span><p><strong>Remember: the hand-off happens in person.</strong><br />Agree on a public campus meetup and exchange the item and deposit offline.</p></div>
    </div>
  );
}
