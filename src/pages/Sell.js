import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const initialForm = { title: '', description: '', category: '', condition: 'Good', type: 'sale', price: '', deposit: '', pickup: '' };

export default function Sell() {
  const [form, setForm] = useState(initialForm);
  const navigate = useNavigate();
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="sell-page content-width">
      <div className="page-heading"><span className="eyebrow">MAKE SOMEBODY’S DAY</span><h1>Put it back<br />in circulation<span>.</span></h1><p>List it for sale or rent, and keep good things on campus.</p></div>
      <div className="sell-layout">
        <form className="form-card listing-form" onSubmit={submit}>
          <div className="form-section-heading"><span className="step-number">01</span><div><h2>The essentials</h2><p>Tell the campus what you've got.</p></div></div>
          <label className="field-label" htmlFor="item-title">Listing title</label><input id="item-title" value={form.title} onChange={update('title')} placeholder="e.g. Digital Multimeter" required />
          <label className="field-label" htmlFor="item-description">Description</label><textarea id="item-description" rows="4" value={form.description} onChange={update('description')} placeholder="Share a few details about your item..." required />
          <div className="form-two-columns"><div><label className="field-label" htmlFor="item-category">Category</label><select id="item-category" value={form.category} onChange={update('category')} required><option value="">Choose a category</option><option>Electronics</option><option>Lab equipment</option><option>Textbooks</option><option>Other</option></select></div><div><label className="field-label" htmlFor="item-condition">Condition</label><select id="item-condition" value={form.condition} onChange={update('condition')}><option>Like new</option><option>Good</option><option>Fair</option></select></div></div>
          <fieldset className="type-fieldset"><legend>How would you like to list it?</legend><div className="listing-type-options">{[['sale', 'For sale', 'One-time sale'], ['rent', 'For rent', 'Lend it for a while'], ['both', 'Both', 'Let buyers decide']].map(([value, title, caption]) => <button type="button" key={value} className={`listing-type-option${form.type === value ? ' chosen' : ''}`} onClick={() => setForm((current) => ({ ...current, type: value }))}><span className="radio-dot" /><strong>{title}</strong><small>{caption}</small></button>)}</div></fieldset>
          <div className="form-two-columns"><div><label className="field-label" htmlFor="item-price">{form.type === 'rent' ? 'Price per day' : 'Price'}</label><div className="price-input"><span>₱</span><input id="item-price" type="number" min="1" value={form.price} onChange={update('price')} placeholder="0" required /></div></div>{form.type !== 'sale' && <div><label className="field-label" htmlFor="item-deposit">Refundable deposit</label><div className="price-input"><span>₱</span><input id="item-deposit" type="number" min="0" value={form.deposit} onChange={update('deposit')} placeholder="0" /></div></div>}</div>
          <label className="field-label" htmlFor="pickup-point">Preferred campus pickup point</label><input id="pickup-point" value={form.pickup} onChange={update('pickup')} placeholder="e.g. CIT Main Gate" required />
          <div className="form-section-heading photo-heading"><span className="step-number">02</span><div><h2>Show it off</h2><p>A clear photo helps your listing stand out.</p></div></div>
          <label className="photo-drop" htmlFor="listing-photo"><span className="upload-symbol">↑</span><strong>Drop a photo here, or <u>browse</u></strong><small>JPG or PNG · Up to 10 MB</small><input id="listing-photo" type="file" accept="image/png,image/jpeg" /></label>
          <div className="pending-note"><span>✳</span><p><strong>All new listings are Pending.</strong><br />An admin will review your post before it appears on the marketplace.</p></div>
          <button type="submit" className="button submit-listing">Submit for approval <span>↗</span></button>
        </form>
        <aside className="sell-aside"><div className="sell-tip"><span className="tip-icon">✳</span><span className="eyebrow">A LITTLE TIP</span><h3>Good listings make good connections.</h3><p>Be clear about your item's condition, pick a public campus meetup spot, and keep payment offline.</p></div><div className="seller-preview"><span className="bento-label">YOUR CAMPUS PROFILE</span><div className="preview-profile"><span className="avatar avatar-large">AR</span><span><strong>Ana Reyes</strong><small>✓ CIT verified student</small></span></div><p>Your @cit.edu email keeps this marketplace campus-only.</p></div></aside>
      </div>
    </div>
  );
}
