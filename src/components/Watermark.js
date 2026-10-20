import React from 'react';

export default function Watermark({ children, dark = false }) {
  return <div className={`watermark${dark ? ' watermark-dark' : ''}`} aria-hidden="true">{children}</div>;
}
