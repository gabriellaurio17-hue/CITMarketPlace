import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BackdropImage from '../components/BackdropImage';
import ListingCard from '../components/ListingCard';
import Watermark from '../components/Watermark';
import listings from '../data/listings';

export default function Home() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchType, setSearchType] = useState('both');
  const navigate = useNavigate();
  const freshListings = useMemo(
    () => listings.filter((listing) => activeTab === 'all' || listing.type === (activeTab === 'sale' ? 'sale' : 'rent')),
    [activeTab]
  );

  const openBrowse = () => navigate(`/browse?type=${searchType}`);

  return (
    <div className="home-page">
      <section className="home-hero watermark-parent has-watermark">
        <Watermark>MARKET</Watermark>
        <div className="hero-copy">
          <span className="eyebrow"><span className="live-dot" /> YOUR CAMPUS, YOUR MARKETPLACE</span>
          <h1>buy, sell <span>&amp;</span><br />rent on campus</h1>
          <p>The things you need, from the people you trust.<br />Made for the CIT community.</p>
          <Link className="button hero-button" to="/browse">Explore the marketplace <span>↗</span></Link>
        </div>
      </section>

      <div className="bento-backdrop-zone watermark-parent photo-panel">
        <BackdropImage src="/images/wall-of-fame.jpg" position="center 30%" tint="none" overlayColor="rgba(43,5,9,.25)" />
        <section className="bento-grid" aria-label="Marketplace features">
        <div className="bento-card search-bento">
          <div className="bento-label light-label">FIND YOUR NEXT THING</div>
          <div className="segmented segmented-dark" role="group" aria-label="Listing type">
            {['sale', 'rent', 'both'].map((kind) => <button key={kind} type="button" className={searchType === kind ? 'selected' : ''} onClick={() => setSearchType(kind)}>{kind === 'both' ? 'Both' : kind === 'sale' ? 'Sale' : 'Rent'}</button>)}
          </div>
          <button className="search-row" type="button" onClick={openBrowse}><span className="row-icon">⌕</span><span>What are you looking for?</span><span>↗</span></button>
          <button className="search-row" type="button" onClick={() => navigate('/browse')}><span className="row-icon">⌖</span><span>Anywhere on campus</span><span>⌄</span></button>
          <button className="search-submit" type="button" onClick={openBrowse}>Find something good <span>→</span></button>
        </div>
        <Link to="/browse?category=Lab%20equipment" className="bento-card lab-bento">
          <div className="lab-visual"><span className="lab-ring" /><span className="lab-tube" /><span className="lab-label">LAB</span></div>
          <div className="lab-caption"><span>GOOD TO BORROW</span><strong>Lab equipment</strong></div>
          <span className="bento-arrow">↗</span>
        </Link>
        <Link to="/signup" className="bento-card try-bento">
          <span className="bento-label">GOT SOMETHING?</span><strong>Try it now<span>.</span></strong><span className="try-link">free with your @cit.edu email <span>↗</span></span>
        </Link>
        <div className="bento-card rental-bento">
          <div className="rental-illustration"><div className="calendar-card"><span>OCT</span><strong>20</strong><i>RETURN DAY</i></div><span className="sparkle">✳</span></div>
          <div><span className="bento-label">NO MORE GUESSING</span><h3>Always know where your rental stands.</h3></div>
        </div>
        <div className="bento-card notifications-bento">
          <div className="notification-header"><span className="bento-label">A LITTLE HEADS-UP</span><span className="notification-count">2</span></div>
          <div className="dark-notice"><span className="notice-icon">✉</span><span><strong>New message</strong><small>from Paolo Garcia</small></span><i className="notice-dot" /></div>
          <div className="dark-notice"><span className="notice-icon">◷</span><span><strong>Return due Oct 20</strong><small>Digital Multimeter</small></span><i className="notice-dot" /></div>
        </div>
        <div className="bento-card verified-bento">
          <span className="verified-star">✳</span><span className="bento-label light-label">CAMPUS-ONLY, ALWAYS</span>
          <h3>Instantly know every seller is verified.</h3>
          <button type="button" className="watch-button" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}><span>▶</span> Watch how it works</button>
        </div>
        </section>
      </div>

      <section className="fresh-section content-width">
        <div className="section-heading">
          <div><span className="eyebrow">A FEW GOOD FINDS</span><h2>Fresh on campus<span>.</span></h2></div>
          <Link className="text-link" to="/browse">See everything <span>↗</span></Link>
        </div>
        <div className="tabs" role="tablist" aria-label="Listing type">
          {[['all', 'All'], ['sale', 'For sale'], ['rent', 'For rent']].map(([value, label]) => <button role="tab" aria-selected={activeTab === value} className={activeTab === value ? 'tab active-tab' : 'tab'} key={value} onClick={() => setActiveTab(value)}>{label}</button>)}
        </div>
        <div className="listing-grid">{freshListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
      </section>
      <section
        className="how-section content-width photo-panel"
        id="how-it-works"
        style={{ backgroundImage: `linear-gradient(rgba(43,5,9,.76), rgba(43,5,9,.76)), url(${process.env.PUBLIC_URL}/images/campus-illustration.jpg)` }}
      >
        <span className="eyebrow">GOOD PEOPLE. GOOD FINDS.</span><h2>Campus life, made a little easier.</h2>
        <p>Every account belongs to a verified CIT student, faculty member, or staff member. Find each other, agree on a meetup, and exchange items in person.</p>
        <Link className="button" to="/sell">List your first item <span>↗</span></Link>
      </section>
    </div>
  );
}
