import React from 'react';

const popular = [
  { category: 'Textbooks', title: 'Books for your next big idea', note: 'TEXTBOOKS', tone: 'popular-maroon', glyph: 'Aa' },
  { category: 'Lab equipment', title: 'Get set for lab day', note: 'LAB EQUIPMENT', tone: 'popular-gold', glyph: '⚗' },
  { category: 'Electronics', title: 'Tools that make it click', note: 'ELECTRONICS', tone: 'popular-rose', glyph: '⌘' },
  { category: 'Other', title: 'A little bit of everything', note: 'CAMPUS FINDS', tone: 'popular-sand', glyph: '✳' },
];

export default function PopularTiles({ setCategory }) {
  return (
    <section className="browse-popular-section" id="browse-popular" aria-labelledby="browse-popular-title">
      <div className="browse-section-heading"><div><span className="browse-section-eyebrow">GOOD THINGS GO QUICK</span><h2 id="browse-popular-title">Popular on campus</h2></div></div>
      <div className="browse-popular-grid">{popular.map((item) => <button type="button" key={item.category} className={`browse-popular-tile ${item.tone}`} onClick={() => { setCategory(item.category); document.getElementById('browse-results')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="popular-tile-note">{item.note}</span><strong>{item.title}</strong><span className="popular-tile-glyph" aria-hidden="true">{item.glyph}</span><span className="popular-tile-arrow" aria-hidden="true">↗</span></button>)}</div>
    </section>
  );
}
