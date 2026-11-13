import React from 'react';

const categoryCards = [
  { label: 'Textbooks', category: 'Textbooks', subtitle: 'Study essentials', icon: 'book' },
  { label: 'Lab equipment', category: 'Lab equipment', subtitle: 'Gear for the lab', icon: 'flask' },
  { label: 'Calculators', category: 'Electronics', subtitle: 'Tools that add up', icon: 'calculator' },
  { label: 'Engineering tools', category: 'Lab equipment', subtitle: 'Build and measure', icon: 'ruler' },
  { label: 'Electronics', category: 'Electronics', subtitle: 'Useful tech finds', icon: 'chip' },
  { label: 'Notes & reviewers', category: 'Textbooks', subtitle: 'Share what you know', icon: 'notebook' },
  { label: 'Uniforms', category: 'Other', subtitle: 'Campus wear', icon: 'gown' },
  { label: 'Other', category: 'Other', subtitle: 'Unexpected finds', icon: 'bulb' },
];

function CategoryIcon({ name }) {
  const paths = {
    book: <><path d="M20 7c-5-3-10-3-15-2v15c5-1 10-1 15 3m0-16c5-3 10-3 15-2v15c-5-1-10-1-15 3zm0 0v16" /></>,
    flask: <><path d="M15 5h10m-8 0v10L9 31a3 3 0 0 0 3 4h16a3 3 0 0 0 3-4l-8-16V5m-10 20h17" /></>,
    calculator: <><rect x="10" y="4" width="20" height="30" rx="3"/><rect x="14" y="8" width="12" height="6" rx="1"/><path d="M15 19h1m5 0h1m5 0h1m-13 5h1m5 0h1m5 0h1m-13 5h1m5 0h1m5 0h1" /></>,
    ruler: <><path d="m8 27 19-19 7 7-19 19zm15-12 4 4m-9 0 4 4m-9 0 4 4" /></>,
    chip: <><rect x="10" y="10" width="20" height="20" rx="3"/><rect x="15" y="15" width="10" height="10" rx="1"/><path d="M15 4v6m10-6v6m-10 20v6m10-6v6M4 15h6m-6 10h6m20-10h6m-6 10h6" /></>,
    notebook: <><rect x="11" y="5" width="22" height="29" rx="3"/><path d="M16 5v29M8 11h3m-3 6h3m-3 6h3m-3 6h3m9-20h10m-10 6h10m-10 6h7" /></>,
    gown: <><path d="m15 6 5 4 5-4 8 6-4 7-4-2v17H15V17l-4 2-4-7zm5 4v10m-5-2 5 4 5-4" /></>,
    bulb: <><path d="M14 23a10 10 0 1 1 12 0c-2 2-3 4-3 6h-7c0-2-1-4-2-6zm3 10h7m-5 4h3M20 2v3M6 7l3 3m22-3-3 3M3 19h4m26 0h4" /></>,
  };
  return <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function BrowseCategoryRow({ category, setCategory }) {
  return (
    <section className="browse-category-section" id="browse-categories" aria-labelledby="browse-category-title">
      <div className="browse-section-heading"><div><span className="browse-section-eyebrow">FIND YOUR CORNER</span><h2 id="browse-category-title">Browse by category</h2></div><span>Something useful is waiting.</span></div>
      <div className="browse-category-grid">
        {categoryCards.map((item) => {
          const selected = category === item.category && item.label.toLowerCase() === item.category.toLowerCase();
          return <button key={item.label} type="button" className={`browse-category-card${selected ? ' category-selected' : ''}`} onClick={() => setCategory(item.category)} aria-pressed={selected}>
          <span className="browse-category-icon"><CategoryIcon name={item.icon} /></span><strong>{item.label}</strong><small>{item.subtitle}</small>
        </button>;
        })}
      </div>
    </section>
  );
}
