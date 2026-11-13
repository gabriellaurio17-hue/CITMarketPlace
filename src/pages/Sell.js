import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';

const initialForm = { title: '', description: '', category: '', condition: 'Good', type: 'sale', price: '', deposit: '', pickup: '', rentalTerms: '' };
const maxPhotoBytes = 10 * 1024 * 1024;
const maxListingPhotos = 5;

export default function Sell() {
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [existingPhotoCount, setExistingPhotoCount] = useState(0);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get('edit');

  useEffect(() => {
    let active = true;
    supabase.from('categories').select('id, name').order('name').then(({ data, error: queryError }) => {
      if (!active) return;
      setCategories(data || []);
      if (queryError) setError(queryError.message);
      setLoadingCategories(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!editId || !user) return;
    let active = true;
    supabase.from('listings').select('id, title, description, category_id, categories(name), condition, listing_type, price, deposit, location, rental_terms, listing_images(id, sort_order)').eq('id', editId).eq('owner_id', user.id).maybeSingle().then(({ data, error: queryError }) => {
      if (!active) return;
      if (queryError || !data) { setError(queryError?.message || 'This listing could not be found in your account.'); return; }
      setForm({ title: data.title, description: data.description, category: data.categories?.name || '', condition: data.condition, type: data.listing_type, price: String(data.price), deposit: String(data.deposit), pickup: data.location, rentalTerms: data.rental_terms || '' });
      setExistingPhotoCount(data.listing_images?.length || 0);
    });
    return () => { active = false; };
  }, [editId, user]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const selectPhotos = (event) => {
    const selected = Array.from(event.target.files || []);
    const availableSlots = Math.max(0, maxListingPhotos - existingPhotoCount);
    setPhotos(selected);
    setError(selected.length > availableSlots ? `A listing can have up to ${maxListingPhotos} photos total.` : '');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!profile?.is_verified) { setError('Your campus account must be verified by an administrator before you can post a listing.'); return; }
    if (!editId && !photos.length) { setError('Choose at least one listing photo.'); return; }
    if (existingPhotoCount + photos.length > maxListingPhotos) { setError(`A listing can have up to ${maxListingPhotos} photos total.`); return; }
    if (photos.some((photo) => !['image/jpeg', 'image/png'].includes(photo.type) || photo.size > maxPhotoBytes)) { setError('Use JPG or PNG photos up to 10 MB each.'); return; }
    const category = categories.find((item) => item.name === form.category);
    if (!category) { setError('Choose a category.'); return; }
    setSubmitting(true);

    const listingPayload = {
      owner_id: user.id,
      category_id: category.id,
      title: form.title.trim(),
      description: form.description.trim(),
      condition: form.condition,
      listing_type: form.type,
      price: Number(form.price),
      rental_terms: form.type === 'sale' ? null : form.rentalTerms.trim() || null,
      deposit: form.type === 'sale' ? 0 : Number(form.deposit || 0),
      location: form.pickup.trim(),
    };
    const listingRequest = editId
      ? supabase.from('listings').update(listingPayload).eq('id', editId).eq('owner_id', user.id).select('id').single()
      : supabase.from('listings').insert({ ...listingPayload, approval_status: 'pending' }).select('id').single();
    const { data: listing, error: listingError } = await listingRequest;
    if (listingError) { setError(listingError.message); setSubmitting(false); return; }

    if (photos.length) {
      const uploadResults = await Promise.all(photos.map(async (photo, index) => {
        const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${user.id}/${listing.id}/${Date.now()}_${index}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from('listing-images').upload(storagePath, photo, { contentType: photo.type, upsert: false });
        return { storagePath, sortOrder: existingPhotoCount + index, error: uploadError };
      }));
      const uploadedPaths = uploadResults.filter((item) => !item.error).map((item) => item.storagePath);
      const failedUpload = uploadResults.find((item) => item.error);
      if (failedUpload) {
        if (uploadedPaths.length) await supabase.storage.from('listing-images').remove(uploadedPaths);
        if (!editId) await supabase.from('listings').delete().eq('id', listing.id);
        setError(failedUpload.error.message);
        setSubmitting(false);
        return;
      }
      const imageRows = uploadResults.map((item) => ({ listing_id: listing.id, storage_path: item.storagePath, sort_order: item.sortOrder }));
      const { error: imageError } = await supabase.from('listing_images').insert(imageRows);
      if (imageError) {
        await supabase.storage.from('listing-images').remove(uploadedPaths);
        if (!editId) await supabase.from('listings').delete().eq('id', listing.id);
        setError(imageError.message);
        setSubmitting(false);
        return;
      }
    }

    if (editId) { navigate('/dashboard'); return; }
    setSuccess(true);
    setForm(initialForm);
    setPhotos([]);
    setSubmitting(false);
    event.target.reset();
  };

  return (
    <div className="sell-page content-width">
      <div className="page-heading"><span className="eyebrow">MAKE SOMEBODY’S DAY</span><h1>{editId ? <>Update your<br />listing<span>.</span></> : <>Put it back<br />in circulation<span>.</span></>}</h1><p>{editId ? 'Changes go back to Pending for admin review.' : 'List it for sale or rent, and keep good things on campus.'}</p></div>
      {!profile?.is_verified && <div className="pending-note"><span>✳</span><p><strong>Account verification required.</strong><br />You can browse while your campus account is being reviewed. An admin must verify it before you can publish a listing.</p></div>}
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {success && <p className="admin-notice" role="status">Listing submitted. It will appear in Browse after an administrator approves it. <Link to="/dashboard">View your dashboard</Link></p>}
      <div className="sell-layout">
        <form className="form-card listing-form" onSubmit={submit}>
          <div className="form-section-heading"><span className="step-number">01</span><div><h2>The essentials</h2><p>Tell the campus what you’ve got.</p></div></div>
          <label className="field-label" htmlFor="item-title">Listing title</label><input id="item-title" value={form.title} onChange={update('title')} placeholder="e.g. Digital Multimeter" required />
          <label className="field-label" htmlFor="item-description">Description</label><textarea id="item-description" rows="4" value={form.description} onChange={update('description')} placeholder="Share a few details about your item..." required />
          <div className="form-two-columns"><div><label className="field-label" htmlFor="item-category">Category</label><select id="item-category" value={form.category} onChange={update('category')} required disabled={loadingCategories}><option value="">{loadingCategories ? 'Loading categories…' : 'Choose a category'}</option>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</select></div><div><label className="field-label" htmlFor="item-condition">Condition</label><select id="item-condition" value={form.condition} onChange={update('condition')}><option>Like new</option><option>Good</option><option>Fair</option></select></div></div>
          <fieldset className="type-fieldset"><legend>How would you like to list it?</legend><div className="listing-type-options">{[['sale', 'For sale', 'One-time sale'], ['rent', 'For rent', 'Lend it for a while'], ['both', 'Both', 'Let buyers decide']].map(([value, title, caption]) => <button type="button" key={value} className={`listing-type-option${form.type === value ? ' chosen' : ''}`} onClick={() => setForm((current) => ({ ...current, type: value }))}><span className="radio-dot" /><strong>{title}</strong><small>{caption}</small></button>)}</div></fieldset>
          <div className="form-two-columns"><div><label className="field-label" htmlFor="item-price">{form.type === 'rent' ? 'Price per day' : 'Price'}</label><div className="price-input"><span>₱</span><input id="item-price" type="number" min="1" step="0.01" value={form.price} onChange={update('price')} placeholder="0" required /></div></div>{form.type !== 'sale' && <div><label className="field-label" htmlFor="item-deposit">Refundable deposit</label><div className="price-input"><span>₱</span><input id="item-deposit" type="number" min="0" step="0.01" value={form.deposit} onChange={update('deposit')} placeholder="0" /></div></div>}</div>
          {form.type !== 'sale' && <><label className="field-label" htmlFor="rental-terms">Rental terms</label><textarea id="rental-terms" rows="2" value={form.rentalTerms} onChange={update('rentalTerms')} placeholder="Return expectations, rental duration, and other details" /></>}
          <label className="field-label" htmlFor="pickup-point">Preferred campus pickup point</label><input id="pickup-point" value={form.pickup} onChange={update('pickup')} placeholder="e.g. CIT Main Gate" required />
          <div className="form-section-heading photo-heading"><span className="step-number">02</span><div><h2>Show it off</h2><p>Add up to {maxListingPhotos} JPG or PNG photos, 10 MB each.</p></div></div>
          <label className="photo-drop" htmlFor="listing-photos"><span className="upload-symbol">↑</span><strong>{photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} selected` : editId ? 'Add photos to this listing (optional)' : 'Choose listing photos'}</strong><small>{existingPhotoCount} current · {maxListingPhotos - existingPhotoCount} remaining · JPG or PNG, up to 10 MB each</small><input id="listing-photos" type="file" accept="image/png,image/jpeg" multiple required={!editId} onChange={selectPhotos} /></label>
          {photos.length > 0 && <ul className="selected-photo-list" aria-label="Selected photos">{photos.map((photo) => <li key={`${photo.name}-${photo.lastModified}`}>{photo.name}</li>)}</ul>}
          <div className="pending-note"><span>✳</span><p><strong>New listings start Pending.</strong><br />An admin must approve the listing before other people can find it.</p></div>
          <button type="submit" className="button submit-listing" disabled={submitting || !profile?.is_verified}>{submitting ? 'Saving…' : editId ? 'Save changes' : 'Submit for approval'} <span>↗</span></button>
        </form>
        <aside className="sell-aside"><div className="sell-tip"><span className="tip-icon">✳</span><span className="eyebrow">A LITTLE TIP</span><h3>Good listings make good connections.</h3><p>Be clear about condition, choose a public campus meetup spot, and keep payment offline.</p></div><div className="seller-preview"><span className="bento-label">YOUR CAMPUS PROFILE</span><div className="preview-profile"><span className="avatar avatar-large">{profile?.full_name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CIT'}</span><span><strong>{profile?.full_name || user?.email}</strong><small>{profile?.is_verified ? '✓ CIT verified member' : 'Verification pending'}</small></span></div><p>Your account uses your @cit.edu email.</p></div></aside>
      </div>
    </div>
  );
}
