import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { addListing, categories, readStore, updateStore } from '../data/localStore';
const initialForm = { title: '', description: '', category: '', condition: 'Good', type: 'sale', price: '', deposit: '', pickup: '', rentalTerms: '' };
export default function Sell() {
  const [form, setForm] = useState(initialForm); const [photos, setPhotos] = useState([]); const [error, setError] = useState(''); const [photoError, setPhotoError] = useState(''); const [success, setSuccess] = useState(false); const errorRef = useRef(null);
  const { user, profile } = useAuth(); const [searchParams] = useSearchParams(); const editId = searchParams.get('edit');
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (!editId) return; const item = readStore().listings.find(x => x.id === editId && x.owner_id === user?.id); if (item) setForm({ title: item.title, description: item.description, category: item.category, condition: item.condition, type: item.listing_type, price: String(item.price), deposit: String(item.deposit || ''), pickup: item.location, rentalTerms: item.rental_terms || '' }); else setError('This listing could not be found in your account.'); }, [editId, user]);
  const update = field => event => { setSuccess(false); setForm(current => ({ ...current, [field]: event.target.value })); };
  const selectPhotos = event => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 5) { setPhotoError('Choose no more than 5 photos.'); setPhotos([]); event.target.value = ''; return; }
    if (selected.some(photo => photo.size > 10 * 1024 * 1024)) { setPhotoError('Each photo must be 10 MB or smaller.'); setPhotos([]); event.target.value = ''; return; }
    setPhotoError('');
    setPhotos(selected);
  };
  const submit = event => {
    event.preventDefault();
    setError('');
    setSuccess(false);
    const payload = { owner_id: user.id, category: form.category, title: form.title.trim(), description: form.description.trim(), condition: form.condition, listing_type: form.type, price: Number(form.price), deposit: form.type === 'sale' ? 0 : Number(form.deposit || 0), location: form.pickup.trim(), rental_terms: form.rentalTerms.trim(), imageUrls: [] };
    try {
      if (editId) {
        let updated = false;
        updateStore(s => { const row = s.listings.find(x => x.id === editId && x.owner_id === user.id); if (row) { Object.assign(row, payload, { categories: { name: payload.category }, approval_status: 'pending' }); updated = true; } });
        if (!updated) throw new Error('This listing could not be found in your account.');
      } else addListing(payload);
      setSuccess(true);
      if (!editId) { setForm(initialForm); setPhotos([]); event.currentTarget.reset(); }
    } catch (saveError) {
      setError(`Could not save your listing in this browser. ${saveError.message || 'Please try again.'}`);
    }
  };
  return <div className="sell-page content-width" role="main">
    <div className="page-heading"><span className="eyebrow">MAKE SOMEBODY’S DAY</span><h1>{editId ? <>Update your<br />listing<span>.</span></> : <>Put it back<br />in circulation<span>.</span></>}</h1><p>{editId ? 'Changes go back to Pending for admin review.' : 'List it for sale or rent, and keep good things on campus.'}</p></div>
    {error && <p className="admin-alert" ref={errorRef} tabIndex={-1} role="alert">{error}</p>}{success && <p className="admin-notice" role="status">{editId ? 'Changes saved. The listing is pending administrator review again.' : 'Listing submitted. It will appear in Browse after an administrator approves it.'} <Link to="/dashboard">View your dashboard</Link></p>}
    <div className="sell-layout"><form className="form-card listing-form" onSubmit={submit}>
      <div className="form-section-heading"><span className="step-number">01</span><div><h2>The essentials</h2><p>Tell the campus what you’ve got.</p></div></div>
      <label className="field-label" htmlFor="item-title">Listing title</label><input id="item-title" value={form.title} onChange={update('title')} required />
      <label className="field-label" htmlFor="item-description">Description</label><textarea id="item-description" rows="4" value={form.description} onChange={update('description')} required />
      <div className="form-two-columns"><div><label className="field-label" htmlFor="item-category">Category</label><select id="item-category" value={form.category} onChange={update('category')} required><option value="">Choose a category</option>{categories.map(category => <option key={category}>{category}</option>)}</select></div><div><label className="field-label" htmlFor="item-condition">Condition</label><select id="item-condition" value={form.condition} onChange={update('condition')}><option>Like new</option><option>Good</option><option>Fair</option></select></div></div>
      <fieldset className="type-fieldset"><legend>How would you like to list it?</legend><div className="listing-type-options">{[['sale','For sale','One-time sale'],['rent','For rent','Lend it for a while'],['both','Both','Let buyers decide']].map(([value,title,caption]) => <button type="button" key={value} className={`listing-type-option${form.type === value ? ' chosen' : ''}`} aria-pressed={form.type === value} onClick={() => setForm(current => ({ ...current, type: value }))}><span className="radio-dot"/><strong>{title}</strong><small>{caption}</small></button>)}</div></fieldset>
      <div className="form-two-columns"><div><label className="field-label" htmlFor="item-price">{form.type === 'rent' ? 'Price per day' : 'Price'}</label><div className="price-input"><span>₱</span><input id="item-price" type="number" min="1" value={form.price} onChange={update('price')} required /></div></div>{form.type !== 'sale' && <div><label className="field-label" htmlFor="item-deposit">Refundable deposit</label><div className="price-input"><span>₱</span><input id="item-deposit" type="number" min="0" value={form.deposit} onChange={update('deposit')} /></div></div>}</div>
      {form.type !== 'sale' && <><label className="field-label" htmlFor="rental-terms">Rental terms</label><textarea id="rental-terms" rows="2" value={form.rentalTerms} onChange={update('rentalTerms')} /></>}
      <label className="field-label" htmlFor="pickup-point">Preferred campus pickup point</label><input id="pickup-point" value={form.pickup} onChange={update('pickup')} required />
      <div className="form-section-heading photo-heading"><span className="step-number">02</span><div><h2>Show it off</h2><p>Add up to 5 JPG or PNG photos, 10 MB each.</p></div></div>
      <label className="photo-drop" htmlFor="listing-photos"><span className="upload-symbol" aria-hidden="true">↑</span><strong>{photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} selected` : 'Choose listing photos'}</strong><small>JPG or PNG, up to 5 photos, 10 MB each. Photos are preview-only in this browser demo.</small><input id="listing-photos" type="file" accept="image/png,image/jpeg" multiple aria-invalid={Boolean(photoError)} aria-describedby={photoError ? 'listing-photos-error' : undefined} onChange={selectPhotos} /></label>
      {photoError && <p className="auth-error" id="listing-photos-error" role="alert">{photoError}</p>}
      {photos.length > 0 && <ul className="selected-photo-list">{photos.map(photo => <li key={photo.name}>{photo.name}</li>)}</ul>}
      <div className="pending-note"><span>✳</span><p><strong>New listings start Pending.</strong><br/>An admin must approve the listing before other people can find it.</p></div>
      <button type="submit" className="button submit-listing">{editId ? 'Save changes' : 'Submit for approval'} <span aria-hidden="true">↗</span></button>
    </form><aside className="sell-aside"><div className="sell-tip"><span className="tip-icon">✳</span><span className="eyebrow">A LITTLE TIP</span><h3>Good listings make good connections.</h3><p>Be clear about condition, choose a public campus meetup spot, and keep payment offline.</p></div><div className="seller-preview"><span className="bento-label">YOUR CAMPUS PROFILE</span><div className="preview-profile"><span className="avatar avatar-large">{profile?.full_name?.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><span><strong>{profile?.full_name}</strong><small>Demo member</small></span></div><p>Your account uses your @cit.edu email.</p></div></aside></div>
  </div>;
}
