import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BackdropImage from '../components/BackdropImage';
import ListingCard from '../components/ListingCard';
import Watermark from '../components/Watermark';
import listings from '../data/listings';
import useListingFilters from '../hooks/useListingFilters';

const categories = ['All categories', 'Electronics', 'Lab equipment', 'Textbooks'];
const conditions = ['Any condition', 'Like new', 'Good', 'Fair'];

export default function Browse() {
  const [searchParams] = useSearchParams();
  const filters = useListingFilters(listings);
  const { setCategory, setType, setQuery } = filters;
  const [sortBy, setSortBy] = useState('recommended');
  useEffect(() => {
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    if (category && categories.includes(category)) setCategory(category);
    if (type && ['sale', 'rent', 'both'].includes(type)) setType(type);
    if (search) setQuery(search);
  }, [searchParams, setCategory, setQuery, setType]);
  const sortedListings = useMemo(() => {
    if (sortBy !== 'price-low') return filters.filteredListings;
    return [...filters.filteredListings].sort((first, second) => first.price - second.price);
  }, [filters.filteredListings, sortBy]);

  return (
    <div className="browse-page content-width watermark-parent has-watermark">
      <Watermark>BROWSE</Watermark>
      <div className="page-heading"><span className="eyebrow">THE CIT COMMUNITY, IN ONE PLACE</span><h1>Find your next<br className="mobile-break" /> <span>good thing.</span></h1><p>Buy it, borrow it, make a campus connection.</p></div>
      <label className="browse-search"><span aria-hidden="true">⌕</span><span className="sr-only">Search listings</span><input type="search" placeholder="Search items, categories, or people..." value={filters.query} onChange={(event) => filters.setQuery(event.target.value)} /><kbd>↵</kbd></label>
      <div className="browse-photo-zone watermark-parent">
        <BackdropImage src="/images/library.jpg" position="center 40%" fade="both" tint="maroon" />
        <div className="browse-layout">
        <aside className="filter-panel" aria-label="Listing filters">
          <div className="filter-title"><h2>Filters</h2><button type="button" onClick={() => { filters.setCategory('All categories'); filters.setCondition('Any condition'); filters.setType('all'); filters.setMinPrice(''); filters.setMaxPrice(''); }}>Clear all</button></div>
          <fieldset><legend>What are you after?</legend><div className="segmented filter-segment">{[['all', 'All'], ['sale', 'Sale'], ['rent', 'Rent'], ['both', 'Both']].map(([value, label]) => <button type="button" key={value} className={filters.type === value ? 'selected' : ''} onClick={() => filters.setType(value)}>{label}</button>)}</div></fieldset>
          <label className="field-label" htmlFor="browse-category">Category</label>
          <select id="browse-category" value={filters.category} onChange={(event) => filters.setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <label className="field-label" htmlFor="browse-min-price">Minimum price</label>
          <div className="price-input"><span>₱</span><input id="browse-min-price" type="number" min="0" placeholder="No minimum" value={filters.minPrice} onChange={(event) => filters.setMinPrice(event.target.value)} /></div>
          <label className="field-label" htmlFor="browse-max-price">Maximum price</label>
          <div className="price-input"><span>₱</span><input id="browse-max-price" type="number" min="0" placeholder="No maximum" value={filters.maxPrice} onChange={(event) => filters.setMaxPrice(event.target.value)} /></div>
          <label className="field-label" htmlFor="browse-condition">Condition</label>
          <select id="browse-condition" value={filters.condition} onChange={(event) => filters.setCondition(event.target.value)}>{conditions.map((item) => <option key={item}>{item}</option>)}</select>
        </aside>
        <section className="browse-results">
          <div className="results-heading"><p><strong>{sortedListings.length}</strong> things to discover</p><label htmlFor="sort-listings">Sort by <select id="sort-listings" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="recommended">Recommended</option><option value="price-low">Price: low to high</option></select></label></div>
          {sortedListings.length ? <div className="listing-grid">{sortedListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <div className="empty-state"><span>⌕</span><h2>No matches just yet</h2><p>Try a different search or loosen up your filters.</p><button className="button" onClick={() => { filters.setQuery(''); filters.setCategory('All categories'); filters.setCondition('Any condition'); filters.setType('all'); filters.setMinPrice(''); filters.setMaxPrice(''); }}>Clear filters</button></div>}
        </section>
        </div>
      </div>
    </div>
  );
}
