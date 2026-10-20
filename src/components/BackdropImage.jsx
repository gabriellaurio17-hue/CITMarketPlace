import React, { memo } from 'react';

function BackdropImage({
  src,
  position = 'center',
  fade = 'bottom',
  tint = 'maroon',
  overlayColor,
  height = '100%',
  top = '0',
  bottom = '0',
}) {
  const overlay = overlayColor || (tint === 'dark'
    ? 'rgba(43,5,9,.5)'
    : tint === 'maroon'
      ? 'rgba(255,255,255,.25)'
      : null);

  return (
    <div
      className={`backdrop backdrop--${tint} backdrop--fade-${fade}`}
      aria-hidden="true"
      style={{
        backgroundImage: overlay
          ? `linear-gradient(${overlay}, ${overlay}), url(${src})`
          : `url(${src})`,
        backgroundPosition: position,
        top,
        bottom,
        height: top === '0' && bottom === '0' ? height : undefined,
      }}
    />
  );
}

export default memo(BackdropImage);
