import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const artwork = [
  ['multimeter', /multimeter|tool|lab/i],
  ['calculator', /calculator|electronic/i],
  ['book', /book|text/i],
  ['arduino', /arduino|board|kit/i],
  ['drafting', /draft|drawing/i],
  ['soldering', /solder|iron/i],
];

function getArtwork(title = '', category = '') {
  const match = artwork.find(([, pattern]) => pattern.test(`${title} ${category}`));
  return match?.[0] || 'multimeter';
}

export default function useMarketplaceListings({ visibleOnly = true } = {}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('listings')
      .select('id, title, description, condition, listing_type, price, deposit, location, approval_status, availability, owner_id, created_at, categories(name), listing_images(storage_path, sort_order)')
      .order('created_at', { ascending: false });
    if (visibleOnly) query = query.eq('approval_status', 'approved').eq('availability', 'active');
    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setListings([]);
    } else {
      const rows = data || [];
      const ownerSummariesResult = rows.length
        ? await supabase.rpc('get_listing_owner_summaries', { p_listing_ids: rows.map((row) => row.id) })
        : { data: [], error: null };
      const ownerNames = new Map((ownerSummariesResult.data || []).map((summary) => [summary.listing_id, summary.owner_name]));
      const mappedListings = await Promise.all((data || []).map(async (row) => {
        const category = row.categories?.name || 'Other';
        const images = [...(row.listing_images || [])].sort((a, b) => a.sort_order - b.sort_order);
        const imageUrls = await Promise.all(images.map(async (image) => {
          const { data: signedImage } = await supabase.storage.from('listing-images').createSignedUrl(image.storage_path, 3600);
          return signedImage?.signedUrl || '';
        }));
        return {
          ...row,
          category,
          type: row.listing_type,
          owner: ownerNames.get(row.id) || 'CIT member',
          pickup: row.location,
          gradient: getArtwork(row.title, category),
          imageUrls: imageUrls.filter(Boolean),
          imageUrl: imageUrls.find(Boolean) || '',
        };
      }));
      setListings(mappedListings);
      setError(ownerSummariesResult.error?.message || '');
    }
    setLoading(false);
  }, [visibleOnly]);

  useEffect(() => { refresh(); }, [refresh]);
  return { listings, loading, error, refresh };
}
