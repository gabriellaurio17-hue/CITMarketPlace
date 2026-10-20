import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import formatCurrency from '../utils/formatCurrency';

function ListingCard({ listing }) {
  return (
    <Link className="listing-card" to={`/items/${listing.id}`}>
      <div className={`listing-art art-${listing.gradient}`}>
        <span className={`kind-pill ${listing.type}`}>{listing.type === 'rent' ? 'For rent' : 'For sale'}</span>
        <span className="art-object" aria-hidden="true" />
      </div>
      <div className="listing-card-body">
        <div className="listing-meta"><span>{listing.category}</span><span>{listing.condition}</span></div>
        <h3>{listing.title}</h3>
        <p className="listing-price">
          {formatCurrency(listing.price)}{listing.type === 'rent' ? <span> / day</span> : null}
        </p>
      </div>
    </Link>
  );
}

export default memo(ListingCard);
