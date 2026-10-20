import { useMemo, useState } from 'react';

export default function useListingFilters(listings) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [condition, setCondition] = useState('Any condition');
  const [type, setType] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const filteredListings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesQuery = !normalizedQuery || [listing.title, listing.category, listing.owner]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesCategory = category === 'All categories' || listing.category === category;
      const matchesCondition = condition === 'Any condition' || listing.condition === condition;
      const matchesType = type === 'all' || type === 'both' || listing.type === type;
      const matchesMinPrice = minPrice === '' || listing.price >= Number(minPrice);
      const matchesMaxPrice = maxPrice === '' || listing.price <= Number(maxPrice);
      return matchesQuery && matchesCategory && matchesCondition && matchesType && matchesMinPrice && matchesMaxPrice;
    });
  }, [category, condition, listings, maxPrice, minPrice, query, type]);

  return {
    query, setQuery, category, setCategory, condition, setCondition, type, setType,
    minPrice, setMinPrice, maxPrice, setMaxPrice, filteredListings,
  };
}
