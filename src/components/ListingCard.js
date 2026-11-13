import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import formatCurrency from '../utils/formatCurrency';

function ListingCard({ listing }) {
  const postedDate = listing.created_at
    ? new Date(listing.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  return (
    <Link className="listing-card" to={`/items/${listing.id}`}>
      <div className={`listing-art art-${listing.gradient}${listing.imageUrl ? ' listing-art-photo' : ''}`} style={listing.imageUrl ? { backgroundImage: `url("${listing.imageUrl}")` } : undefined}>
        <span className={`kind-pill ${listing.type}`}>{listing.type === 'rent' ? 'For rent' : listing.type === 'both' ? 'Sale or rent' : 'For sale'}</span>
        {!listing.imageUrl && <span className="art-object" aria-hidden="true" />}
      </div>
      <div className="listing-card-body">
        <div className="listing-meta"><span>{listing.category}</span><span>{listing.condition}</span></div>
        <h3>{listing.title}</h3>
        <p className="listing-price">
          {formatCurrency(listing.price)}{listing.type === 'rent' ? <span> / day</span> : null}
        </p>
        <div className="listing-card-byline"><span>Posted by {listing.owner}</span>{postedDate && <time dateTime={listing.created_at}>{postedDate}</time>}</div>
      </div>
    </Link>
  );
}

export default memo(ListingCard);
