import React, { useState } from 'react';
import DoodleBackground from './DoodleBackground';

const messages = [
  ['Find your next good thing.', 'Buy it, borrow it, make a campus connection.'],
  ['Good finds, right on campus.', 'Discover useful things shared by the CIT community.'],
];

export default function BrowseHero({ setType }) {
  const [slide, setSlide] = useState(0);
  const scrollToListings = (type) => {
    if (type) setType(type);
    document.getElementById('browse-results')?.scrollIntoView({ behavior: 'smooth' });
  };
  const [heading, caption] = messages[slide];
  return (
    <section className="browse-hero-band" aria-label="Marketplace highlights">
      <DoodleBackground />
      <div className="browse-hero-inner">
        <div className="browse-hero-main">
          <div className="browse-hero-copy"><span className="browse-hero-kicker">MADE FOR THE CIT COMMUNITY</span><h1>{heading}</h1><p>{caption}</p><button type="button" className="browse-hero-button" onClick={() => scrollToListings('all')}>Start browsing <span aria-hidden="true">↗</span></button></div>
          <svg className="browse-hero-book" viewBox="0 0 220 180" fill="none" aria-hidden="true"><path d="M110 42C77 20 44 20 17 29v111c31-10 63-8 93 10 30-18 62-20 93-10V29c-27-9-60-9-93 13Z" fill="#fffdf9" stroke="#f2b632" strokeWidth="5"/><path d="M110 42v108M34 48c20-5 40-2 57 7M34 70c20-5 40-2 57 7m38-22c17-9 37-12 57-7m-57 29c17-9 37-12 57-7" stroke="#e7d9bd" strokeWidth="4" strokeLinecap="round"/><path d="m105 34 8-10 8 10" stroke="#f2b632" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div className="browse-hero-controls" aria-label="Hero slides"><button type="button" aria-label="Previous highlight" onClick={() => setSlide((slide + messages.length - 1) % messages.length)}>‹</button><button type="button" aria-label="Next highlight" onClick={() => setSlide((slide + 1) % messages.length)}>›</button></div>
        </div>
        <div className="browse-hero-rent"><span className="browse-hero-rent-icon" aria-hidden="true">♧</span><span className="browse-hero-kicker">BORROW FOR THE DAY</span><h2>Borrow what you need.</h2><p>Rent lab gowns, calculators and books from just ₱10 a day.</p><button type="button" onClick={() => scrollToListings('rent')}>See rentals <span aria-hidden="true">↗</span></button></div>
      </div>
      <div className="browse-hero-doodle-wrap"><span className="browse-hero-sun" /></div>
    </section>
  );
}
