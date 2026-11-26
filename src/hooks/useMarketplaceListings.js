import { useCallback, useEffect, useState } from 'react';
import { getBrowseListings, readStore } from '../data/localStore';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const LISTING_SELECT = '*, categories(name), profiles(full_name), listing_images(storage_path, sort_order)';

function mapListing(row) {
  const images = [...(row.listing_images || [])]
    .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0))
    .map(image => image.public_url || image.url || (image.storage_path
      ? supabase.storage.from('listing-images').getPublicUrl(image.storage_path).data.publicUrl
      : ''))
    .filter(Boolean);
  return {
    ...row,
    category: row.categories?.name || 'Other',
    type: row.listing_type,
    owner: row.profiles?.full_name || 'CIT member',
    pickup: row.location,
    imageUrls: images,
    images,
  };
}

function addSellerRatings(listings, reviews, ratingError = '') {
  const ratingsBySeller = new Map();
  reviews.forEach(review => {
    const summary = ratingsBySeller.get(review.seller_id) || { total: 0, count: 0 };
    summary.total += Number(review.rating);
    summary.count += 1;
    ratingsBySeller.set(review.seller_id, summary);
  });

  return listings.map(listing => {
    const summary = ratingsBySeller.get(listing.owner_id);
    return {
      ...listing,
      sellerRating: summary ? (summary.total / summary.count).toFixed(1) : null,
      sellerReviewCount: summary?.count || 0,
      sellerRatingError: ratingError,
    };
  });
}

export default function useMarketplaceListings({ visibleOnly = true } = {}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!isSupabaseConfigured || !supabase) {
      const store = readStore();
      const listings = visibleOnly ? getBrowseListings() : store.listings;
      setListings(addSellerRatings(listings, store.reviews || []));
      setLoading(false);
      return;
    }

    let query = supabase.from('listings').select(LISTING_SELECT).order('created_at', { ascending: false });
    if (visibleOnly) query = query.eq('approval_status', 'approved').eq('availability', 'active');
    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setListings([]);
    } else {
      const rows = data || [];
      const ownerIds = [...new Set(rows.map(row => row.owner_id).filter(Boolean))];
      let reviews = [];
      let ratingError = '';
      if (ownerIds.length) {
        const { data: reviewRows, error: reviewError } = await supabase
          .from('reviews')
          .select('seller_id,rating')
          .in('seller_id', ownerIds);
        if (reviewError) ratingError = reviewError.message;
        else reviews = reviewRows || [];
      }
      setListings(addSellerRatings(rows.map(mapListing), reviews, ratingError));
    }
    setLoading(false);
  }, [visibleOnly]);

  useEffect(() => {
    refresh();
    if (!isSupabaseConfigured || !supabase) {
      window.addEventListener('marketplace-store-change', refresh);
      return () => window.removeEventListener('marketplace-store-change', refresh);
    }
    const channel = supabase
      .channel(`marketplace-listings-${visibleOnly ? 'visible' : 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh, visibleOnly]);

  return { listings, loading, error, refresh };
}
