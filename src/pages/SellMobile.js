import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function SellMobile() {
  const [color, setColor] = useState('mauve');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  return (
    <main className="mobile-flow-page">
      <section className="phone-card">
        <header className="phone-topbar"><button aria-label="Open menu">☰</button><Logo /><button aria-label="Notifications">♧</button></header>
        {submitted ? (
          <div className="success-screen"><span className="success-spark">✳</span><span className="eyebrow">AND THAT'S A WRAP</span><h1>Well Done<span>!</span></h1><p>Listing submitted, waiting for admin approval.</p><div className="success-check">✓</div><button className="button" onClick={() => setSubmitted(false)}>Back to your listing</button></div>
        ) : (
          <div className="phone-content"><div className={`mobile-item-visual mobile-${color}`}><span className="mobile-shape-back" /><span className="mobile-shape-front" /><span className="mobile-shape-detail" /><span className="mobile-visual-tag">01 · LAB ESSENTIAL</span></div><span className="eyebrow">LET'S MAKE IT LOOK GOOD</span><h1>Show us what<br />you've got<span>.</span></h1><p>Choose a color palette for your listing preview. You can add photos in the next step.</p><span className="swatch-label">PICK A MOOD</span><div className="color-swatches" role="group" aria-label="Choose a listing color"><button className={`color-swatch swatch-mauve${color === 'mauve' ? ' swatch-selected' : ''}`} aria-label="Dusty mauve" aria-pressed={color === 'mauve'} onClick={() => setColor('mauve')} /><button className={`color-swatch swatch-olive${color === 'olive' ? ' swatch-selected' : ''}`} aria-label="Olive green" aria-pressed={color === 'olive'} onClick={() => setColor('olive')} /><button className={`color-swatch swatch-gold${color === 'gold' ? ' swatch-selected' : ''}`} aria-label="Warm gold" aria-pressed={color === 'gold'} onClick={() => setColor('gold')} /></div>          <div className="mobile-actions"><button className="circle-back" aria-label="Go back" onClick={() => navigate('/sell')}>←</button><button className="mobile-next" onClick={() => setSubmitted(true)}>1/2 <span>NEXT</span><b>→</b></button></div></div>
        )}
        {submitted && <div className="success-bottom"><span>Your listing: <strong>₱30/day</strong></span><span className="bottom-check">✓</span></div>}
      </section>
      <p className="mobile-flow-caption">SELL ON CAMPUS · STEP {submitted ? '2' : '1'} OF 2</p>
    </main>
  );
}
