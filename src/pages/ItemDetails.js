import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import useMarketplaceListings from '../hooks/useMarketplaceListings';
import { updateStore } from '../data/localStore';
import formatCurrency from '../utils/formatCurrency';
import Watermark from '../components/Watermark';

export default function ItemDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { listings, loading, error } = useMarketplaceListings({ visibleOnly: false });
  const listing = listings.find((item) => item.id === id);
  const [days, setDays] = useState(1);
  const [dealType, setDealType] = useState('sale');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportTarget, setReportTarget] = useState('listing');
  const [reportError, setReportError] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  useEffect(() => { setDays(1); setDealType('sale'); setSelectedImageIndex(0); }, [id]);

  const submitReport = async (event) => {
    event.preventDefault();
    if (!user) { navigate('/login'); return; }
    setReportError('');
    updateStore(s => s.reports.unshift({ id: `report-${Date.now()}`, reporter_id: user.id, reporter_name: user.email, target_type: reportTarget, target_id: reportTarget === 'listing' ? listing.id : listing.owner_id, reason: reportReason.trim(), status: 'open', created_at: new Date().toISOString() }));
    setReportSubmitted(true);
    setReporting(false);
    setReportReason('');
  };

  if (loading) return <div className="loading-state">Loading listing…</div>;
  if (error) return <div className="content-width standard-page" role="main"><section className="not-found-state"><h1>Couldn’t load listing.</h1><p>{error}</p><Link className="button gold-button" to="/browse">Back to Browse</Link></section></div>;
  if (!listing) {
    return <div className="item-detail-page"><main className="detail-main"><section className="not-found-state"><span className="eyebrow">THAT ITEM HAS MOVED ON</span><h1>Listing not found.</h1><p>It may have been removed or the link may be out of date.</p><Link className="button gold-button" to="/browse">Back to Browse ↗</Link></section></main></div>;
  }

  const isRental = listing.type === 'rent' || (listing.type === 'both' && dealType === 'rent');
  const total = isRental ? listing.price * days : listing.price;
  const deposit = Number(listing.deposit) || 0;
  const dueAtMeetup = total + (isRental ? deposit : 0);
  const isAvailable = (listing.availability || 'active').toLowerCase() === 'active';
  const images = listing.imageUrls?.length ? listing.imageUrls : listing.imageUrl ? [listing.imageUrl] : [];
  const selectedImage = images[selectedImageIndex] || images[0] || '';
  const postedDate = listing.created_at ? new Date(listing.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : null;
  const ownerInitials = (listing.owner || 'CIT member').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const lastWord = listing.title.split(' ').at(-1);
  const reportButton = user?.id !== listing.owner_id ? <button type="button" className="text-button" onClick={() => { setReporting((value) => !value); setReportSubmitted(false); }}>Report listing</button> : null;

  return (
    <div className="item-detail-page">
      <main className="detail-main watermark-parent has-watermark">
        <Watermark dark>{lastWord}</Watermark>
        <div className="detail-breadcrumb"><Link to="/browse">Browse</Link><span> / </span>{listing.category}<span> / </span><span>{listing.title}</span></div>
        <div className="detail-layout">
          <section className="detail-intro"><span className="eyebrow">CIT MARKETPLACE LISTING</span><h1>{listing.title}</h1><p>{listing.description}</p><p className="detail-posted-by">Posted by <strong>{listing.owner}</strong>{postedDate && <> · {postedDate}</>}</p></section>
          <div className="detail-gallery"><div className={`detail-art art-${listing.gradient}`} role={selectedImage ? 'img' : undefined} aria-label={selectedImage ? `${listing.title} photo ${selectedImageIndex + 1}` : undefined} style={selectedImage ? { backgroundImage: `url("${selectedImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>{!selectedImage && <><span className="detail-art-halo" /><span className="detail-product"><i /><b /><em /></span></>}<span className="art-caption">{listing.category.toUpperCase()}</span></div>{images.length > 1 && <div className="detail-image-thumbnails" aria-label="Listing photos">{images.map((image, index) => <button key={`${image}-${index}`} type="button" className={selectedImageIndex === index ? 'selected' : ''} aria-label={`Show photo ${index + 1} of ${images.length}`} aria-pressed={selectedImageIndex === index} onClick={() => setSelectedImageIndex(index)} style={{ backgroundImage: `url("${image}")` }} />)}</div>}</div>
          <aside className="detail-price-panel">
            <div className="detail-kind"><span className={`kind-pill ${isRental ? 'rent' : 'sale'}`}>{isRental ? 'FOR RENT' : listing.type === 'both' ? 'SALE OR RENT' : 'FOR SALE'}</span><span>{listing.condition}</span></div>
            {listing.type === 'both' && <div className="segmented detail-deal-type" role="group" aria-label="Choose sale or rental"><button type="button" className={dealType === 'sale' ? 'selected' : ''} aria-pressed={dealType === 'sale'} onClick={() => setDealType('sale')}>Buy</button><button type="button" className={dealType === 'rent' ? 'selected' : ''} aria-pressed={dealType === 'rent'} onClick={() => setDealType('rent')}>Rent</button></div>}
            {isRental && <div className="rental-stepper"><div><small>RENTAL LENGTH</small><div className="day-number">{String(days).padStart(2, '0')}<span> day{days > 1 ? 's' : ''}</span></div></div><div className="stepper-controls"><button type="button" aria-label="Decrease rental duration" disabled={days <= 1} onClick={() => setDays((current) => Math.max(1, current - 1))}>◀</button><button type="button" aria-label="Increase rental duration" disabled={days >= 14} onClick={() => setDays((current) => Math.min(14, current + 1))}>▶</button></div></div>}
            <dl className="detail-facts"><div><dt>Pickup</dt><dd>{listing.pickup || listing.location || 'Arrange a public campus pickup with the owner.'}</dd></div>{!isRental && <div><dt>Seller</dt><dd>{listing.owner}</dd></div>}<div><dt>Condition</dt><dd>{listing.condition}</dd></div><div><dt>Availability</dt><dd>{isAvailable ? 'Available' : 'Unavailable'}</dd></div></dl>
            <div className="total-block"><span>{isRental ? 'RENTAL COST' : 'ASKING PRICE'}</span><strong>{formatCurrency(total)}{isRental && <small> for {days} day{days > 1 ? 's' : ''}</small>}</strong>{isRental && <div className="rental-cost-breakdown"><p><span>Refundable deposit</span><strong>{formatCurrency(deposit)}</strong></p><p><strong>Estimated due at meetup</strong><strong>{formatCurrency(dueAtMeetup)}</strong></p></div>}</div>
            {user?.id !== listing.owner_id && (isAvailable ? <Link className="button detail-action" to={`/messages?listing=${listing.id}&seller=${listing.owner_id}`}>Message owner <span>↗</span></Link> : <p className="listing-unavailable" role="status">This listing is currently unavailable.</p>)}
            <p className="offline-note">Payment and item exchange happen offline, by cash and meetup.</p>
          </aside>
        </div>
        <div className="owner-strip"><div className="owner-identity"><span className="owner-avatar">{ownerInitials}</span><span><strong>{listing.owner}</strong><small>{postedDate ? `Posted ${postedDate}` : 'CIT Marketplace member'}</small></span></div><div className="owner-rating"><strong>New seller</strong><small>Ratings appear after completed transactions</small></div><div className="approval-status"><i /> Admin approved</div><div className="terms-copy">{listing.rental_terms || (isRental ? 'Return in the same condition. Deposit returned at meetup.' : 'Arrange a campus meetup directly with the seller.')}</div>{reportButton}</div>
        {reporting && <form className="report-form" onSubmit={submitReport}><label className="field-label" htmlFor="report-target">Report type</label><select id="report-target" value={reportTarget} onChange={(event) => setReportTarget(event.target.value)}><option value="listing">This listing</option><option value="user">The listing owner</option></select><label className="field-label" htmlFor="report-reason">Why are you reporting this {reportTarget}?</label><textarea id="report-reason" rows="3" value={reportReason} onChange={(event) => setReportReason(event.target.value)} required maxLength="1000" /><button className="button button-small" type="submit">Send report</button>{reportError && <p className="auth-error" role="alert">{reportError}</p>}</form>}
        {reportSubmitted && <p className="admin-notice" role="status">Report sent to the marketplace administrators.</p>}
      </main>
    </div>
  );
}
