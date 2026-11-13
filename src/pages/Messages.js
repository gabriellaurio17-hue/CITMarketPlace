import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';

function getMemberName(conversation, userId) {
  const isBuyer = conversation.buyer_id === userId;
  return isBuyer ? conversation.seller?.full_name : conversation.buyer?.full_name;
}

export default function Messages() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedListing = searchParams.get('listing');
  const requestedSeller = searchParams.get('seller');
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('conversations')
      .select('id, listing_id, buyer_id, seller_id, created_at, listings(title), buyer:profiles!conversations_buyer_id_fkey(full_name), seller:profiles!conversations_seller_id_fkey(full_name)')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (queryError) {
      setError(queryError.message);
      setConversations([]);
      setLoading(false);
      return;
    }
    let rows = data || [];
    if (requestedListing && requestedSeller && requestedSeller !== user.id) {
      let conversation = rows.find((item) => item.listing_id === requestedListing && item.buyer_id === user.id);
      if (!conversation && profile?.is_verified) {
        const { data: created, error: createError } = await supabase.from('conversations').insert({
          listing_id: requestedListing,
          buyer_id: user.id,
          seller_id: requestedSeller,
        }).select('id').single();
        if (createError && createError.code !== '23505') setError(createError.message);
        const { data: refreshed } = await supabase
          .from('conversations')
          .select('id, listing_id, buyer_id, seller_id, created_at, listings(title), buyer:profiles!conversations_buyer_id_fkey(full_name), seller:profiles!conversations_seller_id_fkey(full_name)')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order('created_at', { ascending: false });
        rows = refreshed || rows;
        conversation = rows.find((item) => item.id === created?.id || (item.listing_id === requestedListing && item.buyer_id === user.id));
      }
      if (!conversation && !profile?.is_verified) setError('Your campus account must be verified before you can message.');
      if (!conversation && requestedSeller === user.id) setError('You cannot start a conversation with yourself.');
      if (conversation) setActiveId(conversation.id);
    }
    setConversations(rows);
    if (!activeId && rows.length && !requestedListing) setActiveId(rows[0].id);
    setLoading(false);
  }, [activeId, profile?.is_verified, requestedListing, requestedSeller, user]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) { setMessages([]); return; }
    const { data, error: queryError } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (queryError) { setError(queryError.message); return; }
    setMessages((data || []).map((message) => ({
      id: message.id,
      text: message.content,
      own: message.sender_id === user.id,
      time: new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    })));
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadMessages(activeId); }, [activeId, loadMessages]);
  useEffect(() => {
    if (!activeId) return undefined;
    const channel = supabase.channel(`messages:${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` }, () => loadMessages(activeId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId, loadMessages]);

  const active = conversations.find((conversation) => conversation.id === activeId);
  const activeName = active ? getMemberName(active, user.id) || 'CIT member' : '';
  const filteredConversations = useMemo(() => conversations.filter((conversation) => `${getMemberName(conversation, user.id) || ''} ${conversation.listings?.title || ''}`.toLowerCase().includes(search.toLowerCase())), [conversations, search, user.id]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !active || !profile?.is_verified) return;
    setSending(true);
    const { error: sendError } = await supabase.from('messages').insert({
      conversation_id: active.id,
      sender_id: user.id,
      content: draft.trim(),
    });
    setSending(false);
    if (sendError) { setError(sendError.message); return; }
    setDraft('');
    await loadMessages(active.id);
  };

  return (
    <div className="content-width standard-page messages-page">
      <div className="page-heading"><span className="eyebrow">A GOOD DEAL STARTS WITH A HELLO</span><h1>Your messages<span>.</span></h1><p>Make a plan to meet, then make the exchange in person.</p></div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <section className="messages-shell">
        <aside className="conversation-panel"><div className="conversation-top"><h2>Inbox</h2></div><label className="conversation-search"><span>⌕</span><input aria-label="Search conversations" placeholder="Search messages" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          {loading ? <p className="admin-empty">Loading conversations…</p> : filteredConversations.length ? filteredConversations.map((conversation) => <button type="button" key={conversation.id} className={`conversation-row${conversation.id === activeId ? ' conversation-active' : ''}`} onClick={() => setActiveId(conversation.id)}><span className="avatar">{(getMemberName(conversation, user.id) || 'CIT').split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</span><span className="conversation-copy"><strong>{getMemberName(conversation, user.id) || 'CIT member'}</strong><small>{conversation.listings?.title || 'Marketplace listing'}</small></span></button>) : <p className="admin-empty">No conversations yet. Open a listing and message its owner to start one.</p>}
        </aside>
        <div className="chat-panel">{active ? <>
          <header className="chat-header"><span className="avatar">{activeName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</span><span><strong>{activeName}</strong><small>Marketplace member</small></span><Link to={`/items/${active.listing_id}`}>View item ↗</Link></header>
          <div className="item-chat-card"><span className="chat-item-thumb">✳</span><span><small>ABOUT THIS LISTING</small><strong>{active.listings?.title || 'Marketplace listing'}</strong><small>Meet on campus to exchange</small></span></div>
          <div className="chat-messages" aria-live="polite">{messages.map((message) => <div key={message.id} className={`message-line${message.own ? ' own-message' : ''}`}><p>{message.text}</p><small>{message.time}</small></div>)}</div>
          <form className="message-form" onSubmit={sendMessage}><label className="sr-only" htmlFor="message-draft">Write a message</label><input id="message-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={profile?.is_verified ? 'Write a message...' : 'Account verification required'} disabled={!profile?.is_verified} /><button aria-label="Send message" type="submit" disabled={sending || !profile?.is_verified}>{sending ? '…' : '↑'}</button></form>
          <p className="chat-offline-note">Keep payments and item exchange offline by cash and meetup.</p>
        </> : <div className="empty-state"><h2>Select a conversation</h2><p>Choose a chat or open a listing to message its owner.</p><Link className="button" to="/browse">Browse listings</Link></div>}</div>
      </section>
    </div>
  );
}
