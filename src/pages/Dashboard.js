import React from 'react';
import { Link } from 'react-router-dom';
import { myListings, transactions } from '../data/appData';
import formatCurrency from '../utils/formatCurrency';

export default function Dashboard() {
  return (
    <div className="content-width standard-page dashboard-page">
      <div className="page-heading dashboard-heading"><div><span className="eyebrow">YOUR CAMPUS CORNER</span><h1>Good to see you,<br />Ana<span>.</span></h1></div><Link className="button" to="/sell">＋ New listing</Link></div>
      <section className="profile-card"><span className="avatar profile-avatar">AR</span><div className="profile-info"><h2>Ana Reyes</h2><p>ana.reyes@cit.edu</p><span className="verified-badge">✓ Student · Verified</span></div><div className="account-state"><i /> ACCOUNT STATUS<strong>Active</strong></div><Link to="/notifications" className="profile-notifications">View notifications ↗</Link></section>
      <section className="stats-grid" aria-label="Account summary"><article className="stat-card"><span>YOUR LISTINGS</span><strong>4</strong><small>2 approved · 1 pending</small></article><article className="stat-card"><span>ACTIVE RENTALS</span><strong>2</strong><small>1 return due soon</small></article><article className="stat-card"><span>SELLER RATING</span><strong>4.8 <i>★</i></strong><small>From 12 campus reviews</small></article></section>
      <section className="dashboard-section"><div className="section-heading small-heading"><div><span className="eyebrow">WHAT YOU'VE PUT OUT THERE</span><h2>My listings</h2></div><Link className="text-link" to="/sell">Add a listing ↗</Link></div><div className="dashboard-table table-card"><div className="table-scroll"><table><thead><tr><th>LISTING</th><th>CATEGORY</th><th>PRICE</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{myListings.map((listing) => <tr key={listing.id}><td data-label="Listing"><strong>{listing.title}</strong><small>{listing.type === 'rent' ? 'For rent' : 'For sale'}</small></td><td data-label="Category">{listing.category}</td><td data-label="Price">{formatCurrency(listing.price)}{listing.type === 'rent' ? ' / day' : ''}</td><td data-label="Status"><span className={`status-pill status-${listing.status.toLowerCase()}`}>{listing.status}</span></td><td data-label="Actions"><button className="more-button" aria-label={`More options for ${listing.title}`}>···</button></td></tr>)}</tbody></table></div></div></section>
      <section className="dashboard-section"><div className="section-heading small-heading"><div><span className="eyebrow">THE GOOD STUFF, SETTLED OFFLINE</span><h2>Transaction history</h2></div></div><div className="transaction-list">{transactions.map((transaction) => <article className="transaction-row" key={transaction.id}><span className="transaction-icon">↗</span><span className="transaction-name"><strong>{transaction.title}</strong><small>{transaction.date} · {transaction.kind}</small></span><strong>{formatCurrency(transaction.amount)}</strong></article>)}</div></section>
    </div>
  );
}
