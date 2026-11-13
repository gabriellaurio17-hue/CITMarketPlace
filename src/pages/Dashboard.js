import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import formatCurrency from '../utils/formatCurrency';

const hasReview = (transaction) => Array.isArray(transaction.reviews) ? transaction.reviews.length > 0 : Boolean(transaction.reviews?.id);

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rating, setRating] = useState(null);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewBusy, setReviewBusy] = useState('');
  const [saleForm, setSaleForm] = useState({ listing: '', buyerEmail: '' });
  const [saleBusy, setSaleBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [listingResult, transactionResult, reviewResult] = await Promise.all([
      supabase.from('listings').select('id, title, price, listing_type, approval_status, availability, categories(name)').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('id, type, status, created_at, deposit_amount, buyer_id, seller_id, listings(title, price), reviews(id)').or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`).order('created_at', { ascending: false }),
      supabase.from('reviews').select('rating').eq('seller_id', user.id),
    ]);
    const failed = [listingResult, transactionResult, reviewResult].find((result) => result.error);
    setError(failed?.error?.message || '');
    setListings(listingResult.data || []);
    setTransactions(transactionResult.data || []);
    const reviews = reviewResult.data || [];
    setRating(reviews.length ? (reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1) : null);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const submitReview = async (transaction) => {
    const draft = reviewDrafts[transaction.id] || { rating: '5', comment: '' };
    if (!draft.comment.trim()) { setError('Add a comment before submitting a review.'); return; }
    setReviewBusy(transaction.id);
    setError('');
    const { error: reviewError } = await supabase.from('reviews').insert({
      transaction_id: transaction.id,
      reviewer_id: user.id,
      seller_id: transaction.seller_id,
      rating: Number(draft.rating),
      comment: draft.comment.trim(),
    });
    setReviewBusy('');
    if (reviewError) { setError(reviewError.message); return; }
    await loadDashboard();
  };

  const setAvailability = async (listing) => {
    const next = listing.availability === 'active' ? 'unavailable' : 'active';
    const { error: updateError } = await supabase.from('listings').update({ availability: next }).eq('id', listing.id).eq('owner_id', user.id);
    if (updateError) { setError(updateError.message); return; }
    await loadDashboard();
  };

  const deleteListing = async (listing) => {
    if (!window.confirm(`Delete “${listing.title}”? This cannot be undone.`)) return;
    const { error: deleteError } = await supabase.from('listings').delete().eq('id', listing.id).eq('owner_id', user.id);
    if (deleteError) { setError(deleteError.message); return; }
    await loadDashboard();
  };

  const recordSale = async (event) => {
    event.preventDefault();
    setSaleBusy(true);
    setError('');
    const { error: saleError } = await supabase.rpc('create_marketplace_transaction_by_email', {
      p_listing_id: saleForm.listing,
      p_buyer_email: saleForm.buyerEmail.trim().toLowerCase(),
      p_type: 'sale',
      p_start_date: null,
      p_end_date: null,
    });
    setSaleBusy(false);
    if (saleError) { setError(saleError.message); return; }
    setSaleForm({ listing: '', buyerEmail: '' });
    await loadDashboard();
  };

  const completeSale = async (transactionId) => {
    setSaleBusy(true);
    const { error: completeError } = await supabase.rpc('complete_sale_transaction', { p_transaction_id: transactionId });
    setSaleBusy(false);
    if (completeError) { setError(completeError.message); return; }
    await loadDashboard();
  };

  const name = profile?.full_name || user?.email?.split('@')[0] || 'CIT member';
  const activeRentals = transactions.filter((item) => item.type === 'rental' && item.status === 'ongoing').length;
  const approved = listings.filter((item) => item.approval_status === 'approved').length;
  const pending = listings.filter((item) => item.approval_status === 'pending').length;

  return (
    <div className="content-width standard-page dashboard-page">
      <div className="page-heading dashboard-heading"><div><span className="eyebrow">YOUR CAMPUS CORNER</span><h1>Good to see you,<br />{name.split(' ')[0]}<span>.</span></h1></div><Link className="button" to="/sell">＋ New listing</Link></div>
      <section className="profile-card"><span className="avatar profile-avatar">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><div className="profile-info"><h2>{name}</h2><p>{user?.email}</p><span className="verified-badge">{profile?.is_verified ? '✓ CIT verified' : 'Verification pending'} · {profile?.role === 'admin' ? 'Admin' : `${profile?.classification || 'User'} account`}</span></div><div className="account-state"><i /> ACCOUNT STATUS<strong>{profile?.account_status || 'Unknown'}</strong></div><Link to="/notifications" className="profile-notifications">View notifications ↗</Link></section>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <section className="stats-grid" aria-label="Account summary"><article className="stat-card"><span>YOUR LISTINGS</span><strong>{loading ? '—' : listings.length}</strong><small>{approved} approved · {pending} pending</small></article><article className="stat-card"><span>ACTIVE RENTALS</span><strong>{loading ? '—' : activeRentals}</strong><small>Rental transactions in progress</small></article><article className="stat-card"><span>SELLER RATING</span><strong>{rating || '—'} {rating && <i>★</i>}</strong><small>Based on completed-transaction reviews</small></article></section>
      <section className="dashboard-section"><div className="section-heading small-heading"><div><span className="eyebrow">WHAT YOU'VE PUT OUT THERE</span><h2>My listings</h2></div><Link className="text-link" to="/sell">Add a listing ↗</Link></div><div className="dashboard-table table-card"><div className="table-scroll"><table><thead><tr><th>LISTING</th><th>CATEGORY</th><th>PRICE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{listings.map((listing) => <tr key={listing.id}><td data-label="Listing"><strong>{listing.title}</strong><small>{listing.listing_type === 'rent' ? 'For rent' : listing.listing_type === 'both' ? 'Sale or rent' : 'For sale'}</small></td><td data-label="Category">{listing.categories?.name || '—'}</td><td data-label="Price">{formatCurrency(listing.price)}{listing.listing_type === 'rent' ? ' / day' : ''}</td><td data-label="Status"><span className={`status-pill status-${listing.approval_status}`}>{listing.approval_status} · {listing.availability}</span></td><td data-label="Actions"><div className="listing-row-actions"><Link to={`/sell?edit=${listing.id}`}>Edit</Link><button type="button" onClick={() => setAvailability(listing)}>{listing.availability === 'active' ? 'Mark unavailable' : 'Mark available'}</button><button type="button" onClick={() => deleteListing(listing)}>Delete</button></div></td></tr>)}{!loading && !listings.length && <tr><td colSpan="5">You haven’t listed anything yet. <Link to="/sell">Create your first listing</Link>.</td></tr>}</tbody></table></div></div></section>
      {profile?.is_verified && <section className="form-card dashboard-sale-form"><div className="form-section-heading"><span className="step-number">＋</span><div><h2>Record a sale</h2><p>Record an offline handoff to a verified member.</p></div></div><form className="auth-form" onSubmit={recordSale}><label className="field-label" htmlFor="sale-listing">Your approved sale listing</label><select id="sale-listing" value={saleForm.listing} onChange={(event) => setSaleForm((current) => ({ ...current, listing: event.target.value }))} required><option value="">Choose a listing</option>{listings.filter((listing) => ['sale', 'both'].includes(listing.listing_type) && listing.approval_status === 'approved' && listing.availability === 'active').map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select><label className="field-label" htmlFor="sale-buyer-email">Buyer’s @cit.edu email</label><input id="sale-buyer-email" type="email" value={saleForm.buyerEmail} onChange={(event) => setSaleForm((current) => ({ ...current, buyerEmail: event.target.value }))} required /><button className="button" type="submit" disabled={saleBusy || !listings.some((listing) => ['sale', 'both'].includes(listing.listing_type) && listing.approval_status === 'approved' && listing.availability === 'active')}>{saleBusy ? 'Saving…' : 'Record sale'}</button></form></section>}
      <section className="dashboard-section"><div className="section-heading small-heading"><div><span className="eyebrow">THE GOOD STUFF, SETTLED OFFLINE</span><h2>Transaction history</h2></div></div><div className="transaction-list">{transactions.map((transaction) => <article className="transaction-row" key={transaction.id}><span className="transaction-icon">↗</span><span className="transaction-name"><strong>{transaction.listings?.title || `${transaction.type} transaction`}</strong><small>{new Date(transaction.created_at).toLocaleDateString()} · {transaction.status}</small>{transaction.status === 'ongoing' && transaction.type === 'sale' && transaction.seller_id === user.id && <button className="button button-small" disabled={saleBusy} onClick={() => completeSale(transaction.id)}>Mark sale complete</button>}{transaction.status === 'completed' && transaction.buyer_id === user.id && !hasReview(transaction) && <div className="review-inline"><label>Rate the seller <select value={reviewDrafts[transaction.id]?.rating || '5'} onChange={(event) => setReviewDrafts((current) => ({ ...current, [transaction.id]: { rating: event.target.value, comment: current[transaction.id]?.comment || '' } }))}><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label><textarea aria-label="Write a seller review" placeholder="Share a few words about your experience" value={reviewDrafts[transaction.id]?.comment || ''} onChange={(event) => setReviewDrafts((current) => ({ ...current, [transaction.id]: { rating: current[transaction.id]?.rating || '5', comment: event.target.value } }))} /><button className="button button-small" disabled={reviewBusy === transaction.id} onClick={() => submitReview(transaction)}>{reviewBusy === transaction.id ? 'Saving…' : 'Submit review'}</button></div>}{hasReview(transaction) && transaction.buyer_id === user.id && <small>Review submitted</small>}</span><strong>{formatCurrency(transaction.listings?.price || transaction.deposit_amount || 0)}</strong></article>)}{!loading && !transactions.length && <p className="admin-empty">Transactions will appear here after you arrange a sale or rental through the marketplace.</p>}</div></section>
    </div>
  );
}
