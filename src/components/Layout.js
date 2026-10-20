import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  const location = useLocation();
  const dark = location.pathname.startsWith('/items/');
  return (
    <div className={dark ? 'app-shell dark-shell' : 'app-shell'}>
      <Navbar dark={dark} />
      <div className="route-content"><Outlet /></div>
      {!dark && location.pathname === '/' && (
        <footer className="site-footer">
          cit marketplace <span>·</span> payment and item exchange happen offline by cash and meetup
        </footer>
      )}
    </div>
  );
}
