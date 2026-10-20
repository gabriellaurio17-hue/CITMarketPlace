import React, { useState } from 'react';
import { initialRentals } from '../data/appData';
import formatCurrency from '../utils/formatCurrency';

export default function Rentals() {
  const [rentals, setRentals] = useState(initialRentals);
  const markReturned = (id) => setRentals((current) => current.map((rental) => rental.id === id ? { ...rental, status: 'Returned' } : rental));
  return (
    <div className="content-width standard-page">
      <div className="page-heading"><span className="eyebrow">KEEP THE GOOD THINGS MOVING</span><h1>Rental<br />check-in<span>.</span></h1><p>A clear view of what's out, what's due, and what's back.</p></div>
      <section className="table-card"><div className="table-heading"><div><h2>Your rentals</h2><p>Meet up, exchange in person, and keep this list up to date.</p></div><span className="table-count">{rentals.length} rentals</span></div>
        <div className="table-scroll"><table><thead><tr><th>ITEM</th><th>RENTER</th><th>START</th><th>END</th><th>DEPOSIT</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rentals.map((rental) => <tr key={rental.id}><td data-label="Item"><strong>{rental.item}</strong><small>CIT marketplace</small></td><td data-label="Renter">{rental.renter}</td><td data-label="Start">{rental.start}</td><td data-label="End">{rental.end}</td><td data-label="Deposit">{formatCurrency(rental.deposit)}</td><td data-label="Status"><span className={`status-pill status-${rental.status.toLowerCase()}`}>{rental.status}</span></td><td data-label="Action">{rental.status !== 'Returned' && <button className="return-button" onClick={() => markReturned(rental.id)}>Mark returned</button>}</td></tr>)}</tbody></table></div>
      </section>
      <div className="offline-banner"><span>↗</span><p><strong>Remember: the hand-off happens in person.</strong><br />Agree on a public campus meetup and exchange the item and deposit offline.</p></div>
    </div>
  );
}
