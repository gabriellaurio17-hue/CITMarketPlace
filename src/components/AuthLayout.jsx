import React from 'react';
import Logo from './Logo';

export default function AuthLayout({ headline, children }) {
  return (
    <main
      className="auth-page"
      style={{ backgroundImage: 'linear-gradient(rgba(43,5,9,.45), rgba(43,5,9,.45)), url(/images/wall-of-fame.jpg)' }}
    >
      <Logo light />
      <div className="auth-content">
        <section className="auth-photo-copy">
          <h1>{headline}</h1>
          <p>Only verified @cit.edu accounts can list items and send messages.</p>
        </section>
        <section className="auth-card">{children}</section>
      </div>
    </main>
  );
}
