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
        <header className="phone-topbar"><button type="button" aria-label="Back to listing form" onClick={() => navigate('/sell')}>←</button><Logo /><button type="button" aria-label="Open notifications" onClick={() => navigate('/notifications')}>♧</button></header>
        {submitted ? (
          <div className="success-screen" role="status" aria-live="polite"><span className="success-spark" aria-hidden="true">✳</span><span className="eyebrow">PREVIEW COMPLETE</span><h1>Looks good<span>!</span></h1><p>This color preview did not create or submit a listing. Use the listing form to publish an item.</p><div className="success-check" aria-hidden="true">✓</div><button className="button" type="button" onClick={() => navigate('/sell')}>Go to listing form</button></div>
        ) : (
          <div className="phone-content"><div className={`mobile-item-visual mobile-${color}`} aria-hidden="true"><span className="mobile-shape-back" /><span className="mobile-shape-front" /><span className="mobile-shape-detail" /><span className="mobile-visual-tag">01 · LAB ESSENTIAL</span></div><span className="eyebrow">LET'S MAKE IT LOOK GOOD</span><h1>Show us what<br />you've got<span>.</span></h1><p>Choose a color palette for a sample preview. This preview does not save or publish an item.</p><span className="swatch-label">PICK A MOOD</span><div className="color-swatches" role="group" aria-label="Choose a listing color"><button type="button" className={`color-swatch swatch-mauve${color === 'mauve' ? ' swatch-selected' : ''}`} aria-label="Dusty mauve" aria-pressed={color === 'mauve'} onClick={() => setColor('mauve')} /><button type="button" className={`color-swatch swatch-olive${color === 'olive' ? ' swatch-selected' : ''}`} aria-label="Olive green" aria-pressed={color === 'olive'} onClick={() => setColor('olive')} /><button type="button" className={`color-swatch swatch-gold${color === 'gold' ? ' swatch-selected' : ''}`} aria-label="Warm gold" aria-pressed={color === 'gold'} onClick={() => setColor('gold')} /></div>          <div className="mobile-actions"><button type="button" className="circle-back" aria-label="Go back to listing form" onClick={() => navigate('/sell')}>←</button><button type="button" className="mobile-next" onClick={() => setSubmitted(true)}>1/2 <span>PREVIEW</span><b aria-hidden="true">→</b></button></div></div>
        )}
        {submitted && <div className="success-bottom"><span>Preview price: <strong>₱30/day</strong></span><span className="bottom-check" aria-hidden="true">✓</span></div>}
      </section>
      <p className="mobile-flow-caption">SELL ON CAMPUS · STEP {submitted ? '2' : '1'} OF 2</p>
    </main>
  );
}
