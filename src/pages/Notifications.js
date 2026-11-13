import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error: queryError } = await supabase.from('notifications').select('id, type, message, related_item_id, is_read, created_at').eq('user_id', user.id).order('created_at', { ascending: false });
    setError(queryError?.message || '');
    setNotifications(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);
  useEffect(() => {
    if (!user) return undefined;
    const channel = supabase.channel(`notifications:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, loadNotifications)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadNotifications, user]);

  const markAllRead = async () => {
    setError('');
    const { error: updateError } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    if (updateError) { setError(updateError.message); return; }
    await loadNotifications();
  };

  const markRead = async (id) => {
    const { error: updateError } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id);
    if (updateError) { setError(updateError.message); return; }
    await loadNotifications();
  };

  return (
    <div className="content-width standard-page notifications-page">
      <div className="page-heading notification-heading"><div><span className="eyebrow">YOU’RE ALL CAUGHT UP (ALMOST)</span><h1>Good things<br />to know<span>.</span></h1></div><button className="text-button" onClick={markAllRead} disabled={!unreadCount}>Mark all as read</button></div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <section className="notifications-list"><div className="notifications-list-title"><h2>Your notifications</h2><span>{unreadCount} unread</span></div>
        {loading ? <p className="admin-empty">Loading notifications…</p> : notifications.length ? notifications.map((notification) => <article className={`notification-row${!notification.is_read ? ' notification-unread' : ''}`} key={notification.id}><span className="notification-symbol">{notification.type === 'new_message' ? '✉' : notification.type.includes('report') ? '◷' : '✓'}</span><div><h3>{notification.type.replaceAll('_', ' ')}{!notification.is_read && <i className="unread-dot" />}</h3><p>{notification.message}</p><small>{new Date(notification.created_at).toLocaleString()}</small></div>{!notification.is_read && <button className="notification-menu" aria-label="Mark notification as read" onClick={() => markRead(notification.id)}>Mark read</button>}</article>) : <p className="admin-empty">You don’t have any notifications yet.</p>}
      </section>
      <div className="offline-banner"><span>✳</span><p><strong>Good plans happen face to face.</strong><br />Messages help you arrange a campus meetup. Payments and exchanges happen offline.</p></div>
    </div>
  );
}
