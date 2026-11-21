import { useCallback, useEffect, useState } from 'react';
import { getBrowseListings, readStore } from '../data/localStore';
export default function useMarketplaceListings({ visibleOnly = true } = {}) {
  const [listings, setListings] = useState([]);
  const refresh = useCallback(() => { setListings(visibleOnly ? getBrowseListings() : readStore().listings); }, [visibleOnly]);
  useEffect(() => { refresh(); window.addEventListener('marketplace-store-change', refresh); window.addEventListener('storage', refresh); return () => { window.removeEventListener('marketplace-store-change', refresh); window.removeEventListener('storage', refresh); }; }, [refresh]);
  return { listings, loading: false, error: '', refresh };
}
