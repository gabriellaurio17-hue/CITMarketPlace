import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import BrowseCategoryRow from '../components/browse/BrowseCategoryRow';
import BrowseHero from '../components/browse/BrowseHero';
import PopularTiles from '../components/browse/PopularTiles';
import useMarketplaceListings from '../hooks/useMarketplaceListings';
import useListingFilters from '../hooks/useListingFilters';

const categories = ['All categories', 'Electronics', 'Lab equipment', 'Textbooks', 'Other'];
const conditions = ['Any condition', 'Like new', 'Good', 'Fair'];

export default function Browse() {
  const [searchParams] = useSearchParams();
  const { listings, loading, error } = useMarketplaceListings();
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

  const clearFilters = () => {
    filters.setQuery('');
    filters.setCategory('All categories');
    filters.setCondition('Any condition');
    filters.setType('all');
    filters.setMinPrice('');
    filters.setMaxPrice('');
  };

  return (
    <div className="browse-storefront">
      <main>
        <BrowseHero setType={filters.setType} />
        <div className="browse-main-content">
          <form className="browse-content-search" role="search" onSubmit={(event) => { event.preventDefault(); document.getElementById('browse-results')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <label className="sr-only" htmlFor="browse-search-category">Search category</label>
            <select id="browse-search-category" value={filters.category} onChange={(event) => filters.setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
            <label className="sr-only" htmlFor="browse-search-query">Search items, categories, or people</label>
            <input id="browse-search-query" type="search" placeholder="Search the marketplace..." value={filters.query} onChange={(event) => filters.setQuery(event.target.value)} />
            <button type="submit" aria-label="Search marketplace"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4.2 4.2" /></svg></button>
          </form>
          <BrowseCategoryRow category={filters.category} setCategory={filters.setCategory} />
          <PopularTiles setCategory={filters.setCategory} />

          <section className="browse-listings-section" id="browse-results" aria-labelledby="browse-listings-title">
            <div className="browse-listings-title-row"><div><span className="browse-section-eyebrow">THE LATEST FROM YOUR CAMPUS</span><h2 id="browse-listings-title">Fresh listings</h2></div><p>Find something useful. Pass something along.</p></div>
            <div className="browse-layout">
              <aside className="filter-panel browse-filter-panel" aria-label="Listing filters">
                <div className="filter-title"><h2>Filters</h2><button type="button" onClick={clearFilters}>Clear all</button></div>
                <fieldset><legend>What are you after?</legend><div className="segmented filter-segment">{[['all', 'All'], ['sale', 'Sale'], ['rent', 'Rent'], ['both', 'Both']].map(([value, label]) => <button type="button" key={value} className={filters.type === value ? 'selected' : ''} aria-pressed={filters.type === value} onClick={() => filters.setType(value)}>{label}</button>)}</div></fieldset>
                <label className="field-label" htmlFor="browse-category">Category</label>
                <select id="browse-category" value={filters.category} onChange={(event) => filters.setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
                <label className="field-label" htmlFor="browse-min-price">Minimum price</label>
                <div className="price-input"><span>₱</span><input id="browse-min-price" type="number" min="0" placeholder="No minimum" value={filters.minPrice} onChange={(event) => filters.setMinPrice(event.target.value)} /></div>
                <label className="field-label" htmlFor="browse-max-price">Maximum price</label>
                <div className="price-input"><span>₱</span><input id="browse-max-price" type="number" min="0" placeholder="No maximum" value={filters.maxPrice} onChange={(event) => filters.setMaxPrice(event.target.value)} /></div>
                <label className="field-label" htmlFor="browse-condition">Condition</label>
                <select id="browse-condition" value={filters.condition} onChange={(event) => filters.setCondition(event.target.value)}>{conditions.map((item) => <option key={item}>{item}</option>)}</select>
              </aside>

              <div className="browse-results">
                <div className="results-heading browse-results-heading"><p><strong>{loading ? '—' : sortedListings.length}</strong> things to discover</p><label htmlFor="sort-listings">Sort by <select id="sort-listings" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="recommended">Recommended</option><option value="price-low">Price: low to high</option></select></label></div>
                {error ? <div className="empty-state browse-empty"><h2>Listings couldn’t load</h2><p>{error}</p></div> : loading ? <p className="admin-empty">Loading approved listings…</p> : sortedListings.length ? <div className="listing-grid browse-listing-grid">{sortedListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <div className="empty-state browse-empty"><span className="browse-empty-icon" aria-hidden="true">⌕</span><h2>{listings.length ? 'No listings match those filters' : 'No listings yet'}</h2><p>{listings.length ? 'Try changing your search or clearing a filter.' : 'Be the first to share something useful with the CIT community.'}</p><button type="button" className="browse-clear-button" onClick={clearFilters}>Clear filters</button><Link className="browse-post-button" to="/sell">Post a listing <span aria-hidden="true">↗</span></Link></div>}
              </div>
            </div>
          </section>
        </div>
      </main>
      <footer className="browse-footer"><Link to="/">cit marketplace</Link><span>Campus finds, shared by the CIT community.</span><span>Payments and item exchanges happen in person.</span></footer>
    </div>
  );
}
