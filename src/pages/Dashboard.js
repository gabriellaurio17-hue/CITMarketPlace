import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { readStore, updateStore } from '../data/localStore';
import { createMarketplaceNotification, createMarketplaceReview, createMarketplaceTransaction, findMarketplaceMemberByEmail, loadMarketplaceTransactions, updateMarketplaceTransaction } from '../data/marketplaceApi';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import formatCurrency from '../utils/formatCurrency';
export default function Dashboard({ embedded = false }) {
  const { user, profile } = useAuth(); const [data, setData] = useState({ listings: [], transactions: [], reviews: [] }); const [saleForm, setSaleForm] = useState({ listing: '', buyerEmail: '' }); const [saleError, setSaleError] = useState(''); const [dataError, setDataError] = useState(''); const [feedback, setFeedback] = useState(''); const [reviewText, setReviewText] = useState(''); const [reviewRating, setReviewRating] = useState('5');
  const load = useCallback(async () => {
    if (isSupabaseConfigured) {
      setDataError('');
      const [listingResult, transactions, reviewsResult] = await Promise.all([
        supabase.from('listings').select('*, categories(name), profiles(full_name)').eq('owner_id', user.id).order('created_at', { ascending: false }),
        loadMarketplaceTransactions(user.id),
        supabase.from('reviews').select('*').or(`seller_id.eq.${user.id},reviewer_id.eq.${user.id}`),
      ]);
      if (listingResult.error) { setDataError(listingResult.error.message); return; }
      if (reviewsResult.error) { setDataError(reviewsResult.error.message); return; }
      setData({
        listings: (listingResult.data || []).map(row => ({ ...row, category: row.categories?.name || 'Other', type: row.listing_type, owner: row.profiles?.full_name || 'CIT member' })),
        transactions,
        reviews: reviewsResult.data || [],
      });
      return;
    }
    const s = readStore();
    setDataError('');
    setData({ listings: s.listings.filter(x => x.owner_id === user.id), transactions: s.transactions.filter(x => x.buyer_id === user.id || x.seller_id === user.id), reviews: s.reviews });
  }, [user.id]);
  useEffect(() => {
    load();
    window.addEventListener('marketplace-store-change', load);
    const channel = isSupabaseConfigured && supabase
      ? supabase.channel(`seller-reviews-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `seller_id=eq.${user.id}` }, load)
        .subscribe()
      : null;
    return () => {
      window.removeEventListener('marketplace-store-change', load);
      if (channel) supabase.removeChannel(channel);
    };
  }, [load, user.id]);
  const setAvailability = async listing => {
    const next = listing.availability === 'active' ? 'unavailable' : 'active';
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('listings').update({ availability: next }).eq('id', listing.id).eq('owner_id', user.id);
      if (error) { setSaleError(error.message); return; }
      try { await createMarketplaceNotification(user.id, 'listing_availability', `${listing.title} is now ${next}.`); } catch { /* The listing update is authoritative. */ }
    } else updateStore(s => { const x = s.listings.find(row => row.id === listing.id); if (x) { x.availability = next; x.updated_at = new Date().toISOString(); } s.notifications.unshift({ id: `note-${Date.now()}-availability`, user_id: user.id, title: next === 'active' ? 'Listing available again' : 'Listing marked unavailable', message: `${listing.title} is now ${next}.`, type: 'listing_availability', related_id: listing.id, is_read: false, created_at: new Date().toISOString() }); });
    setFeedback(`Listing marked ${next}.`); await load();
  };
  const deleteListing = async listing => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('listings').delete().eq('id', listing.id).eq('owner_id', user.id);
      if (error) { setSaleError(error.message); return; }
    } else updateStore(s => { s.listings = s.listings.filter(x => x.id !== listing.id); s.conversations = s.conversations.filter(conversation => conversation.listing_id !== listing.id); s.notifications.unshift({ id: `note-${Date.now()}-deleted`, user_id: user.id, title: 'Listing deleted', message: `${listing.title} was deleted from your listings.`, type: 'listing_deleted', related_id: listing.id, is_read: false, created_at: new Date().toISOString() }); });
    setFeedback(`${listing.title} was removed from your listings.`); await load();
  };
  const recordSale = async event => {
    event.preventDefault(); setSaleError(''); setFeedback('');
    const listing = data.listings.find(x => x.id === saleForm.listing && x.owner_id === user.id);
    if (isSupabaseConfigured) {
      let buyer;
      try {
        buyer = await findMarketplaceMemberByEmail(saleForm.buyerEmail);
      } catch (error) {
        setSaleError(error.message || 'Could not look up that CIT member.');
        return;
      }
      if (!buyer || !listing) { setSaleError('Choose a listing and enter a CIT member email that can be found.'); return; }
      if (buyer.id === user.id) { setSaleError('Choose another account as the buyer.'); return; }
      if (!buyer.is_verified) { setSaleError('The buyer must complete account verification.'); return; }
      if (listing.availability !== 'active') { setSaleError('This listing is unavailable for a new sale.'); return; }
      try {
        await createMarketplaceTransaction({ type: 'sale', status: 'pending', seller_id: user.id, buyer_id: buyer.id, listing_id: listing.id, deposit_amount: 0, deposit_status: 'not_applicable' });
        try { await createMarketplaceNotification(buyer.id, 'sale_request', `${profile.full_name} submitted a purchase request for ${listing.title}.`); } catch { /* Notifications depend on recipient-write RLS. */ }
        setSaleForm({ listing: '', buyerEmail: '' }); setFeedback('Purchase request submitted. It is pending acceptance.'); await load();
      } catch (saveError) { setSaleError(saveError.message || 'Could not record this sale.'); }
      return;
    }
    const s = readStore(); const localListing = s.listings.find(x => x.id === saleForm.listing && x.owner_id === user.id); const buyer = s.accounts.find(x => x.email === saleForm.buyerEmail.trim().toLowerCase());
    if (!buyer || !localListing) { setSaleError('Choose a listing and enter an existing demo account email.'); return; }
    if (buyer.id === user.id) { setSaleError('Choose another account as the buyer.'); return; }
    if (!buyer.is_verified) { setSaleError('The buyer must complete account verification.'); return; }
    if (localListing.availability !== 'active') { setSaleError('This listing is unavailable for a new sale.'); return; }
    updateStore(store => { const transaction = { id: `tx-${Date.now()}`, type: 'sale', status: 'pending', seller_id: user.id, buyer_id: buyer.id, listing_id: localListing.id, title: localListing.title, amount: localListing.price, deposit_status: 'not_applicable', created_at: new Date().toISOString() }; store.transactions.unshift(transaction); store.notifications.unshift({ id: `note-${Date.now()}-sale-request`, user_id: buyer.id, title: 'Purchase request', type: 'sale_request', message: `${profile.full_name} submitted a purchase request for ${localListing.title}.`, related_id: transaction.id, is_read: false, created_at: new Date().toISOString() }); }); setSaleForm({ listing: '', buyerEmail: '' }); setFeedback('Purchase request submitted. It is pending acceptance.'); load();
  };
  const updateSaleStatus = (id, status) => {
    if (isSupabaseConfigured) {
      (async () => {
        try {
          await updateMarketplaceTransaction(id, { status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) });
          const tx = data.transactions.find(item => item.id === id);
          if (tx && ['accepted', 'ongoing', 'completed'].includes(status)) await supabase.from('listings').update({ availability: 'unavailable' }).eq('id', tx.listing_id);
          setFeedback(`Sale marked ${status}.`); await load();
        } catch (error) { setSaleError(error.message || 'Could not update the sale.'); }
      })();
      return;
    }
    updateStore(store => {
      const tx = store.transactions.find(item => item.id === id && item.type === 'sale');
      if (!tx || tx.status === 'cancelled' || tx.status === 'completed') return;
      const now = new Date().toISOString();
      tx.status = status;
      if (status === 'accepted' || status === 'ongoing' || status === 'completed') {
        const listing = store.listings.find(item => item.id === tx.listing_id);
        if (listing) {
          listing.availability = 'unavailable';
          listing.updated_at = now;
        }
      }
      if (status === 'ongoing') tx.accepted_at = now;
      if (status === 'completed') tx.completed_at = now;
      if (status === 'cancelled') {
        tx.cancelled_at = now;
        const hasOtherActiveSale = store.transactions.some(item =>
          item.id !== tx.id &&
          item.listing_id === tx.listing_id &&
          item.type === 'sale' &&
          ['accepted', 'ongoing', 'completed'].includes(item.status)
        );
        const listing = store.listings.find(item => item.id === tx.listing_id);
        if (listing && !hasOtherActiveSale && listing.approval_status === 'approved') listing.availability = 'active';
      }
      [tx.buyer_id, tx.seller_id].forEach(userId => store.notifications.unshift({
        id: `note-${Date.now()}-${status}-${userId}`,
        user_id: userId,
        title: `Sale ${status}`,
        type: `sale_${status}`,
        message: `${tx.title || 'Your purchase'} is now ${status}.`,
        related_id: tx.id,
        is_read: false,
        created_at: now,
      }));
    });
    setFeedback(`Sale marked ${status}.`);
    load();
  };
  const submitSellerReview = tx => {
    if (!reviewText.trim()) return;
    const exists = data.reviews.some(review => review.transaction_id === tx.id && review.reviewer_id === user.id);
    if (exists) return;
    if (isSupabaseConfigured) {
      if (tx.buyer_id !== user.id) { setSaleError('Only the buyer or renter can review the seller.'); return; }
      (async () => {
        try {
          await createMarketplaceReview({ transaction_id: tx.id, reviewer_id: user.id, seller_id: tx.seller_id, rating: Number(reviewRating), comment: reviewText.trim() });
          setReviewText(''); setFeedback('Your seller review was saved.'); await load();
        } catch (error) { setSaleError(error.message || 'Could not save the review.'); }
      })();
      return;
    }
    updateStore(s => s.reviews.push({
      id: `review-${Date.now()}`,
      transaction_id: tx.id,
      reviewer_id: user.id,
      reviewed_user_id: tx.seller_id,
      seller_id: tx.seller_id,
      rating: Number(reviewRating),
      comment: reviewText.trim(),
      created_at: new Date().toISOString(),
    }));
    setReviewText('');
    setFeedback('Your transaction review was saved.');
    load();
  };
  const name = profile?.full_name || user.email.split('@')[0]; const { listings, transactions, reviews } = data;
  const ratingRows = reviews.filter(x => x.seller_id === user.id); const rating = ratingRows.length ? (ratingRows.reduce((n, x) => n + x.rating, 0) / ratingRows.length).toFixed(1) : null;
  return <div className={`content-width standard-page dashboard-page${embedded ? ' faculty-dashboard-details' : ''}`} role={embedded ? undefined : 'main'}>
    <div className="page-heading dashboard-heading"><div><span className="eyebrow">YOUR CAMPUS CORNER</span><h1>Good to see you,<br/>{name.split(' ')[0]}<span>.</span></h1></div><Link className="button" to="/sell">＋ New listing</Link></div>
    {feedback && <p className="admin-notice" role="status">{feedback}</p>}
    {dataError && <p className="admin-alert" role="alert">Could not load your dashboard data: {dataError}</p>}
    <section className="profile-card"><span className="avatar profile-avatar">{name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}</span><div className="profile-info"><h2>{name}</h2><p>{user.email}</p><span className="verified-badge">✓ CIT verified · {profile?.role === 'admin' ? 'Admin' : `${profile?.classification} account`}</span></div><div className="account-state"><i/> ACCOUNT STATUS<strong>active</strong></div><Link to="/notifications" className="profile-notifications">View notifications ↗</Link></section>
    <section className="stats-grid"><article className="stat-card"><span>YOUR LISTINGS</span><strong>{listings.length}</strong><small>{listings.filter(x=>x.approval_status==='approved').length} approved · {listings.filter(x=>x.approval_status==='pending').length} pending</small></article><article className="stat-card"><span>ACTIVE RENTALS</span><strong>{transactions.filter(x=>x.type==='rental'&&x.status==='ongoing').length}</strong><small>Rental transactions in progress</small></article><article className="stat-card"><span>SELLER RATING</span><strong>{rating || '—'} {rating && <i>★</i>}</strong><small>{ratingRows.length ? `Based on ${ratingRows.length} completed-transaction ${ratingRows.length === 1 ? 'review' : 'reviews'}` : 'No completed-transaction reviews yet'}</small></article></section>
    <section className="dashboard-section"><div className="section-heading small-heading"><div><span className="eyebrow">WHAT YOU'VE PUT OUT THERE</span><h2>My listings</h2></div><Link className="text-link" to="/sell">Add a listing ↗</Link></div><div className="dashboard-table table-card"><div className="table-scroll"><table><thead><tr><th>LISTING</th><th>CATEGORY</th><th>PRICE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{listings.map(x=><tr key={x.id}><td data-label="Listing"><strong>{x.title}</strong><small>{x.listing_type==='rent'?'For rent':x.listing_type==='both'?'Sale or rent':'For sale'}</small></td><td>{x.category || x.categories?.name || '—'}</td><td>{formatCurrency(x.price)}{x.listing_type==='rent'?' / day':''}</td><td><span className={`status-pill status-${x.approval_status}`}>{x.approval_status} · {x.availability}</span></td><td><div className="listing-row-actions"><Link to={`/sell?edit=${x.id}`}>Edit</Link><button onClick={()=>setAvailability(x)}>{x.availability==='active'?'Mark unavailable':'Mark available'}</button><button onClick={()=>deleteListing(x)}>Delete</button></div></td></tr>)}{!listings.length&&<tr><td colSpan="5">You haven’t listed anything yet. <Link to="/sell">Create your first listing</Link>.</td></tr>}</tbody></table></div></div></section>
    {profile?.is_verified && <section className="form-card dashboard-sale-form"><div className="form-section-heading"><span className="step-number">＋</span><div><h2>Record a sale</h2><p>Record an offline handoff to a member.</p></div></div>{saleError&&<p className="admin-alert" role="alert">{saleError}</p>}<form className="auth-form" onSubmit={recordSale}><label className="field-label" htmlFor="sale-listing">Your approved sale listing</label><select id="sale-listing" value={saleForm.listing} onChange={e=>setSaleForm({...saleForm,listing:e.target.value})} required><option value="">Choose a listing</option>{listings.filter(x=>['sale','both'].includes(x.listing_type)&&x.approval_status==='approved'&&x.availability==='active').map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><label className="field-label" htmlFor="sale-buyer-email">Buyer’s @cit.edu email</label><input id="sale-buyer-email" type="email" value={saleForm.buyerEmail} onChange={e=>setSaleForm({...saleForm,buyerEmail:e.target.value})} required/><button className="button" type="submit">Record sale</button></form></section>}
    <section className="dashboard-section"><div className="section-heading small-heading"><div><span className="eyebrow">THE GOOD STUFF, SETTLED OFFLINE</span><h2>Transaction history</h2></div></div><div className="transaction-list">{transactions.map(x=><article className="transaction-row" key={x.id}><span className="transaction-icon">↗</span><span className="transaction-name"><strong>{x.title || x.listings?.title || `${x.type} transaction`}</strong><small>{new Date(x.created_at).toLocaleDateString()} · {x.status}</small>{x.type==='sale'&&x.status==='pending'&&x.seller_id===user.id&&<span className="listing-row-actions"><button className="button button-small" onClick={()=>updateSaleStatus(x.id,'accepted')}>Accept</button><button className="text-button" onClick={()=>updateSaleStatus(x.id,'cancelled')}>Reject</button></span>}{x.type==='sale'&&['accepted','ongoing'].includes(x.status)&&x.seller_id===user.id&&<button className="button button-small" onClick={()=>updateSaleStatus(x.id,'completed')}>Mark sale complete</button>}{x.status==='completed'&&x.buyer_id===user.id&&!data.reviews.some(r=>r.transaction_id===x.id&&r.reviewer_id===user.id)&&<div className="review-inline"><label>Rate the seller <select aria-label="Rate seller" value={reviewRating} onChange={e=>setReviewRating(e.target.value)}><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label><textarea aria-label="Write a seller review" placeholder="Share a few words about your experience" value={reviewText} onChange={e=>setReviewText(e.target.value)}/><button className="button button-small" onClick={()=>submitSellerReview(x)}>Submit review</button></div>}{data.reviews.some(r=>r.transaction_id===x.id&&r.reviewer_id===user.id)&&<small>Review submitted</small>}</span><strong>{formatCurrency(x.amount || x.listings?.price || x.deposit_amount || 0)}</strong></article>)}{!transactions.length&&<p className="admin-empty">Transactions will appear here after you arrange a sale or rental through the marketplace.</p>}</div></section>
  </div>;
}
