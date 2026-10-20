import React, { useState } from 'react';
import { initialNotifications } from '../data/appData';

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const markAllRead = () => setNotifications((current) => current.map((notification) => ({ ...notification, unread: false })));
  return (
    <div className="content-width standard-page notifications-page">
      <div className="page-heading notification-heading"><div><span className="eyebrow">YOU'RE ALL CAUGHT UP (ALMOST)</span><h1>Good things<br />to know<span>.</span></h1></div><button className="text-button" onClick={markAllRead} disabled={!unreadCount}>Mark all as read</button></div>
      <section className="notifications-list"><div className="notifications-list-title"><h2>Your notifications</h2><span>{unreadCount} unread</span></div>{notifications.map((notification) => <article className={`notification-row${notification.unread ? ' notification-unread' : ''}`} key={notification.id}><span className={`notification-symbol symbol-${notification.id}`}>{notification.id === 'note-1' ? '✉' : notification.id === 'note-2' ? '◷' : '✓'}</span><div><h3>{notification.title}{notification.unread && <i className="unread-dot" />}</h3><p>{notification.detail}</p><small>{notification.time}</small></div><button className="notification-menu" aria-label={`More options for ${notification.title}`}>···</button></article>)}</section>
      <div className="offline-banner"><span>✳</span><p><strong>Good plans happen face to face.</strong><br />Messages help you arrange a campus meetup. Payments and exchanges are offline.</p></div>
    </div>
  );
}
