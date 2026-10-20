import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import listings from '../data/listings';
import formatCurrency from '../utils/formatCurrency';
import Watermark from '../components/Watermark';

export default function ItemDetails() {
  const { id } = useParams();
  const listing = listings.find((item) => item.id === id);
  const [days, setDays] = useState(1);
  useEffect(() => setDays(1), [id]);

  if (!listing) {
    return (
      <div className="item-detail-page">
        <main className="detail-main">
          <section className="not-found-state">
            <span className="eyebrow">THAT ITEM HAS MOVED ON</span>
            <h1>Listing not found.</h1>
            <p>It may have been removed or the link may be out of date.</p>
            <Link className="button gold-button" to="/browse">Back to Browse <span>↗</span></Link>
          </section>
        </main>
      </div>
    );
  }
  const isRental = listing.type === 'rent';
  const total = isRental ? listing.price * days : listing.price;
  const lastWord = listing.title.split(' ').at(-1);

  return (
    <div className="item-detail-page">
      <main className="detail-main watermark-parent has-watermark">
        <Watermark dark>{lastWord}</Watermark>
        <div className="detail-breadcrumb"><Link to="/browse">Browse</Link><span> / </span>{listing.category}<span> / </span><span>{listing.title}</span></div>
        <div className="detail-layout">
          <section className="detail-intro">
            <span className="eyebrow">CIT VERIFIED LISTING <i className="verified-check">✓</i></span>
            <h1>{listing.title}</h1>
            <p>{listing.description}</p>
            <Link className="button gold-button" to="/messages">Message owner <span>↗</span></Link>
          </section>
          <div className={`detail-art art-${listing.gradient}`}><span className="detail-art-halo" /><span className="detail-product"><i /><b /><em /></span><span className="art-caption">{listing.category.toUpperCase()}</span></div>
          <aside className="detail-price-panel">
            <div className="detail-kind"><span className={`kind-pill ${listing.type}`}>{isRental ? 'FOR RENT' : 'FOR SALE'}</span><span>{listing.condition}</span></div>
            {isRental ? <div className="rental-stepper"><div><small>RENTAL LENGTH</small><div className="day-number">0{days}<span> days</span></div></div><div className="stepper-controls"><button aria-label="Decrease rental duration" disabled={days <= 1} onClick={() => setDays((current) => Math.max(1, current - 1))}>◀</button><button aria-label="Increase rental duration" disabled={days >= 14} onClick={() => setDays((current) => Math.min(14, current + 1))}>▶</button></div></div> : null}
            <dl className="detail-facts"><div><dt>Pickup</dt><dd>{listing.pickup}</dd></div>{isRental ? <div><dt>Refundable deposit</dt><dd>{formatCurrency(listing.deposit)}</dd></div> : <div><dt>Seller</dt><dd>{listing.owner}</dd></div>}<div><dt>Condition</dt><dd>{listing.condition}</dd></div></dl>
            <div className="total-block"><span>{isRental ? 'TOTAL FOR YOUR RENTAL' : 'ASKING PRICE'}</span><strong>{formatCurrency(total)}{isRental ? <small> / {days} day{days > 1 ? 's' : ''}</small> : null}</strong>{isRental ? <small className="deposit-note">+ {formatCurrency(listing.deposit)} refundable deposit</small> : null}</div>
            <Link className="button detail-action" to="/messages">Message {listing.owner.split(' ')[0]} <span>↗</span></Link>
            <p className="offline-note">Payment and item exchange happen offline, by cash and meetup.</p>
          </aside>
        </div>
        <div className="owner-strip"><div className="owner-identity"><span className="owner-avatar">{listing.owner.split(' ').map((word) => word[0]).join('')}</span><span><strong>{listing.owner}</strong><small>Verified CIT member</small></span></div><div className="owner-rating"><strong>★ {listing.rating}</strong><small>Seller rating</small></div><div className="approval-status"><i /> Admin approved</div><div className="terms-copy">{isRental ? 'Return in the same condition. Deposit returned at meetup.' : 'Arrange a campus meetup directly with the seller.'}</div></div>
      </main>
    </div>
  );
}
