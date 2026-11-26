import { supabase } from '../lib/supabase';

function toListing(row) {
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

const listingFields = payload => ({
  title: payload.title,
  description: payload.description,
  condition: payload.condition,
  listing_type: payload.listing_type,
  price: payload.price,
  rental_terms: payload.rental_terms,
  deposit: payload.deposit,
  location: payload.location,
  approval_status: 'pending',
  availability: 'active',
});

async function saveListingImages(listingId, ownerId, imageSources = []) {
  if (!imageSources.length) return;

  const existingRows = await supabase
    .from('listing_images')
    .select('id,storage_path')
    .eq('listing_id', listingId);

  if (existingRows.error) throw existingRows.error;
  await supabase.from('listing_images').delete().eq('listing_id', listingId);

  const rows = [];
  for (let index = 0; index < imageSources.length; index += 1) {
    const source = imageSources[index];
    let storagePath = null;

    if (typeof source === 'string' && source.startsWith('data:image/')) {
      const response = await fetch(source);
      const blob = await response.blob();
      const extension = blob.type === 'image/png' ? 'png' : 'jpg';
      storagePath = `${ownerId}/${listingId}/${Date.now()}_${index}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(storagePath, blob, { contentType: blob.type, upsert: false });
      if (uploadError) throw uploadError;
    } else if (typeof source === 'string' && source.includes('/listing-images/')) {
      storagePath = decodeURIComponent(source.split('/listing-images/')[1].split('?')[0]);
    }

    if (storagePath) rows.push({ listing_id: listingId, storage_path: storagePath, sort_order: index });
  }

  if (rows.length) {
    const { error } = await supabase.from('listing_images').insert(rows);
    if (error) throw error;
  }

  const oldPaths = (existingRows.data || [])
    .map(row => row.storage_path)
    .filter(path => !rows.some(row => row.storage_path === path));
  if (oldPaths.length) await supabase.storage.from('listing-images').remove(oldPaths);
}

export async function createMarketplaceListing(payload) {
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('name', payload.category)
    .single();
  if (categoryError) throw categoryError;

  const { data, error } = await supabase
    .from('listings')
    .insert({ ...listingFields(payload), owner_id: payload.owner_id, category_id: category.id })
    .select('*, categories(name), profiles(full_name), listing_images(storage_path, sort_order)')
    .single();
  if (error) throw error;
  await saveListingImages(data.id, payload.owner_id, payload.imageUrls);
  const refreshed = await supabase
    .from('listings')
    .select('*, categories(name), profiles(full_name), listing_images(storage_path, sort_order)')
    .eq('id', data.id)
    .single();
  if (refreshed.error) throw refreshed.error;
  return toListing(refreshed.data);
}

export async function updateMarketplaceListing(id, ownerId, payload) {
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('name', payload.category)
    .single();
  if (categoryError) throw categoryError;

  const { data, error } = await supabase
    .from('listings')
    .update({ ...listingFields(payload), category_id: category.id })
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('*, categories(name), profiles(full_name), listing_images(storage_path, sort_order)')
    .single();
  if (error) throw error;
  await saveListingImages(data.id, ownerId, payload.imageUrls);
  const refreshed = await supabase
    .from('listings')
    .select('*, categories(name), profiles(full_name), listing_images(storage_path, sort_order)')
    .eq('id', data.id)
    .single();
  if (refreshed.error) throw refreshed.error;
  return toListing(refreshed.data);
}

export async function createMarketplaceNotification(userId, type, message) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    message,
    is_read: false,
  });
  if (error) throw error;
}

export async function createMarketplaceTransaction(transaction) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select('*, listings(title, price)')
    .single();
  if (error) throw error;
  return data;
}

export async function loadMarketplaceTransactions(userId, type) {
  let query = supabase
    .from('transactions')
    .select('*, listings(title, price), renter:profiles!transactions_buyer_id_fkey(full_name,email)')
    .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (type) query = query.eq('type', type);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateMarketplaceTransaction(id, values) {
  const { data, error } = await supabase
    .from('transactions')
    .update(values)
    .eq('id', id)
    .select('*, listings(title, price)')
    .single();
  if (error) throw error;
  return data;
}

export async function createMarketplaceReport(report) {
  const { error } = await supabase.from('reports').insert(report);
  if (error) throw error;
}

export async function createMarketplaceReview(review) {
  const { data, error } = await supabase.from('reviews').insert(review).select('*').single();
  if (error) throw error;
  return data;
}
