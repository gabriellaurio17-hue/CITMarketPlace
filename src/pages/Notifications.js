import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { readStore, updateStore } from '../data/localStore';

export default function Notifications() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState('');
  const load = useCallback(() => setRows(readStore().notifications.filter(item => item.user_id === user.id)), [user.id]);

  useEffect(() => {
    load();
    window.addEventListener('marketplace-store-change', load);
    return () => window.removeEventListener('marketplace-store-change', load);
  }, [load]);

  const mark = id => {
    updateStore(store => store.notifications.forEach(item => {
      if (item.user_id === user.id && (!id || item.id === id)) item.is_read = true;
    }));
    setNotice(id ? 'Notification marked as read.' : 'All notifications marked as read.');
    load();
  };
  const unread = rows.filter(item => !item.is_read).length;

  return (
    <main className="content-width standard-page notifications-page">
      <div className="page-heading notification-heading">
        <div><span className="eyebrow">YOU’RE ALL CAUGHT UP (ALMOST)</span><h1>Good things<br />to know<span>.</span></h1></div>
        <button className="text-button" type="button" onClick={() => mark()} disabled={!unread}>Mark all as read</button>
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      <section className="notifications-list" aria-labelledby="notifications-title">
        <div className="notifications-list-title"><h2 id="notifications-title">Your notifications</h2><span>{unread} unread</span></div>
        {rows.length ? rows.map(item => (
          <article className={`notification-row${!item.is_read ? ' notification-unread' : ''}`} key={item.id}>
            <span className="notification-symbol" aria-hidden="true">✓</span>
            <div>
              <h3>{item.type.replaceAll('_', ' ')}{!item.is_read && <i className="unread-dot" aria-hidden="true" />}</h3>
              <p>{item.message}</p>
              <small>{new Date(item.created_at).toLocaleString()}</small>
            </div>
            {!item.is_read && <button className="notification-menu" type="button" onClick={() => mark(item.id)}>Mark read</button>}
          </article>
        )) : <p className="admin-empty">You don’t have any notifications yet.</p>}
      </section>
      <div className="offline-banner"><span aria-hidden="true">✳</span><p><strong>Good plans happen face to face.</strong><br />Messages help you arrange a campus meetup. Payments and exchanges happen offline.</p></div>
    </main>
  );
}
