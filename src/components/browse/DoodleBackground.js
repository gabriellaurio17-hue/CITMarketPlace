import React from 'react';

const doodles = [
  ['book', 44, 95, -14, .9], ['notebook', 154, 335, 13, .85], ['flask', 278, 40, 18, .78],
  ['tube', 368, 375, -18, .85], ['calculator', 502, 70, 11, .78], ['microscope', 628, 355, -12, .92],
  ['pencil', 763, 55, 24, .85], ['ruler', 872, 375, -9, .8], ['atom', 1000, 56, -16, .92],
  ['cap', 1134, 345, 19, .8], ['bulb', 1275, 75, -13, .88], ['gown', 1395, 344, 12, .8],
  ['chip', 82, 390, 8, .75], ['atom', 237, 200, 23, .52], ['book', 480, 280, -8, .55],
  ['gown', 759, 220, 17, .5], ['flask', 1064, 226, -18, .55], ['calculator', 1320, 210, 9, .57],
];

export default function DoodleBackground() {
  return (
    <svg className="browse-doodles" viewBox="0 0 1440 420" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <defs>
        <symbol id="doodle-book" viewBox="0 0 64 64"><path d="M32 17c-8-7-17-7-25-5v37c9-2 17-1 25 6m0-38c8-7 17-7 25-5v37c-9-2-17-1-25 6zm0 0v37M13 20c5-1 9 0 13 2m-13 6c5-1 9 0 13 2m25-10c-5-1-9 0-13 2m13 6c-5-1-9 0-13 2" /></symbol>
        <symbol id="doodle-notebook" viewBox="0 0 64 64"><rect x="15" y="9" width="38" height="47" rx="4"/><path d="M22 9v47M9 18h6m-6 9h6m-6 9h6m-6 9h6m14-29h17m-17 8h17m-17 8h12" /></symbol>
        <symbol id="doodle-flask" viewBox="0 0 64 64"><path d="M24 8h16m-13 0v18L13 49a5 5 0 0 0 4 7h30a5 5 0 0 0 4-7L37 26V8M19 43h26m-20-7h14" /></symbol>
        <symbol id="doodle-tube" viewBox="0 0 64 64"><path d="M23 8h18M26 8v36a10 10 0 0 0 20 0V8M26 35h20m-17-7h14" /></symbol>
        <symbol id="doodle-calculator" viewBox="0 0 64 64"><rect x="15" y="7" width="34" height="50" rx="5"/><rect x="21" y="14" width="22" height="10" rx="2"/><path d="M23 32h2m8 0h2m8 0h2m-20 8h2m8 0h2m8 0h2m-20 8h2m8 0h2m8 0h2" /></symbol>
        <symbol id="doodle-microscope" viewBox="0 0 64 64"><path d="m25 10 9-5 13 22-9 5zm-7 18 9-5m-9 5a17 17 0 1 0 28 13m-18-9 10-6m-2 17h15m-35 8h38M27 40h17" /></symbol>
        <symbol id="doodle-pencil" viewBox="0 0 64 64"><path d="m18 46 4-13L46 9l10 10-24 24-14 3zm4-13 10 10m-3-18 10 10M18 46l-2 8 8-2" /></symbol>
        <symbol id="doodle-ruler" viewBox="0 0 64 64"><path d="m11 45 34-34 9 9-34 34zm26-26 5 5m-12 2 5 5m-12 2 5 5m-12 2 5 5" /></symbol>
        <symbol id="doodle-atom" viewBox="0 0 64 64"><ellipse cx="32" cy="32" rx="26" ry="10"/><ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(120 32 32)"/><circle cx="32" cy="32" r="3" fill="currentColor"/></symbol>
        <symbol id="doodle-cap" viewBox="0 0 64 64"><path d="m6 25 26-13 26 13-26 13zm9 5v14c10 8 24 8 34 0V30m9-5v20m0 0-4 8h8z" /></symbol>
        <symbol id="doodle-bulb" viewBox="0 0 64 64"><path d="M21 36a17 17 0 1 1 22 0c-4 3-5 7-5 10H26c0-3-1-7-5-10zm6 16h10m-8 5h6M32 2v5m22 3-4 4M10 10l4 4M3 31h6m46 0h6" /></symbol>
        <symbol id="doodle-gown" viewBox="0 0 64 64"><path d="m23 9 9 7 9-7 12 8-7 11-5-3v29H23V25l-5 3-7-11zm9 7v15m-8-7 8 7 8-7" /></symbol>
        <symbol id="doodle-chip" viewBox="0 0 64 64"><rect x="15" y="15" width="34" height="34" rx="5"/><rect x="23" y="23" width="18" height="18" rx="2"/><path d="M24 5v10m8-10v10m8-10v10m-16 34v10m8-10v10m8-10v10M5 24h10m-10 8h10m-10 8h10m34-16h10m-10 8h10m-10 8h10" /></symbol>
      </defs>
      {doodles.map(([name, x, y, rotation, scale], index) => <use key={`${name}-${index}`} href={`#doodle-${name}`} x={x - 32 * scale} y={y - 32 * scale} width={64 * scale} height={64 * scale} transform={`rotate(${rotation} ${x} ${y})`} />)}
    </svg>
  );
}
