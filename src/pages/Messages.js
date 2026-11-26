import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { readStore, updateStore } from '../data/localStore';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function LocalMessages() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const load = useCallback(() => {
    const store = readStore();
    let rows = store.conversations.filter(conversation => conversation.members.includes(user.id));
    const listing = params.get('listing');
    const seller = params.get('seller');
    if (listing && seller && seller !== user.id) {
      let conversation = rows.find(row => row.listing_id === listing && row.members.includes(seller));
      if (!conversation) {
        const item = store.listings.find(row => row.id === listing);
        if (item) {
          conversation = { id: `chat-${Date.now()}`, listing_id: listing, members: [user.id, seller], title: item.title };
          updateStore(current => current.conversations.push(conversation));
          rows = [conversation, ...rows];
        }
      }
      if (conversation) setActiveId(conversation.id);
    }
    setConversations(rows);
  }, [params, user.id]);
  useEffect(() => { load(); window.addEventListener('marketplace-store-change', load); return () => window.removeEventListener('marketplace-store-change', load); }, [load]);

  const active = conversations.find(row => row.id === activeId);
  const store = readStore();
  const messages = store.messages.filter(row => row.conversation_id === activeId);
  const other = active?.members.find(id => id !== user.id);
  const member = store.accounts.find(row => row.id === other);
  const filtered = conversations.filter(row => `${row.title} ${store.accounts.find(account => account.id === row.members.find(id => id !== user.id))?.full_name || ''}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <main className="content-width standard-page messages-page">
      <div className="page-heading"><span className="eyebrow">A GOOD DEAL STARTS WITH A HELLO</span><h1>Your messages<span>.</span></h1></div>
      <section className="messages-shell"><aside className="conversation-panel"><div className="conversation-top"><h2>Inbox</h2></div><label className="conversation-search"><input aria-label="Search conversations" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search messages" /></label>
        {filtered.map(conversation => {
          const participant = store.accounts.find(account => account.id === conversation.members.find(id => id !== user.id));
          return <button type="button" key={conversation.id} className={`conversation-row${conversation.id === activeId ? ' conversation-active' : ''}`} onClick={() => setActiveId(conversation.id)}><span className="avatar">{participant?.full_name?.split(' ').map(part => part[0]).join('') || 'CIT'}</span><span className="conversation-copy"><strong>{participant?.full_name || 'CIT member'}</strong><small>{conversation.title}</small></span></button>;
        })}
      </aside><div className="chat-panel">{active ? <>
        <header className="chat-header"><span className="avatar">{member?.full_name?.split(' ').map(part => part[0]).join('')}</span><span><strong>{member?.full_name || 'CIT member'}</strong></span><Link to={`/items/${active.listing_id}`}>View item ↗</Link></header>
        <div className="chat-messages" role="log">{messages.map(message => <div key={message.id} className={`message-line${message.sender_id === user.id ? ' own-message' : ''}`}><p>{message.content}</p></div>)}</div>
        <form className="message-form" onSubmit={event => { event.preventDefault(); if (!draft.trim()) return; updateStore(current => current.messages.push({ id: `msg-${Date.now()}`, conversation_id: active.id, sender_id: user.id, content: draft.trim(), created_at: new Date().toISOString(), read_by: [] })); setDraft(''); }}>
          <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message..." /><button type="submit">↑</button>
        </form>
      </> : <div className="empty-state"><h2>Select a conversation</h2><p>Choose a chat or open a listing to message its owner.</p></div>}</div></section>
    </main>
  );
}

function RemoteMessages() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    setError('');
    const { data, error: loadError } = await supabase
      .from('conversations')
      .select('*, listings(title)')
      .contains('member_ids', [user.id])
      .order('updated_at', { ascending: false });
    if (loadError) { setError(loadError.message); return; }
    const rows = data || [];
    setConversations(rows);

    const listingId = params.get('listing');
    const sellerId = params.get('seller');
    if (listingId && sellerId && sellerId !== user.id) {
      let conversation = rows.find(row => row.listing_id === listingId && row.member_ids.includes(sellerId));
      if (!conversation) {
        const { data: listing } = await supabase.from('listings').select('title').eq('id', listingId).single();
        const { data: created, error: createError } = await supabase
          .from('conversations')
          .insert({ listing_id: listingId, title: listing?.title || 'Marketplace conversation', member_ids: [user.id, sellerId] })
          .select('*, listings(title)')
          .single();
        if (createError) setError(createError.message);
        else conversation = created;
      }
      if (conversation) {
        setActiveId(conversation.id);
        setConversations(current => current.some(row => row.id === conversation.id) ? current : [conversation, ...current]);
      }
    } else if (!activeId && rows.length) setActiveId(rows[0].id);

    const ids = [...new Set(rows.flatMap(row => row.member_ids || []).concat(conversationIds(rows, listingId, sellerId)))];
    if (ids.length) {
      const { data: profileRows } = await supabase.from('profiles').select('id,full_name,email').in('id', ids);
      setProfiles(Object.fromEntries((profileRows || []).map(row => [row.id, row])));
    }
  }, [activeId, params, user.id]);

  const loadMessages = useCallback(async conversationId => {
    if (!conversationId) { setMessages([]); return; }
    const { data, error: loadError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (loadError) setError(loadError.message);
    else setMessages(data || []);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadMessages(activeId); if (!activeId) return undefined; const channel = supabase.channel(`messages-${activeId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` }, () => loadMessages(activeId)).subscribe(); return () => supabase.removeChannel(channel); }, [activeId, loadMessages]);

  const active = conversations.find(row => row.id === activeId);
  const otherId = active?.member_ids?.find(id => id !== user.id);
  const other = profiles[otherId];
  const filtered = conversations.filter(row => `${row.title} ${row.member_ids?.map(id => profiles[id]?.full_name || '').join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const send = async event => {
    event.preventDefault();
    if (!draft.trim() || !active) return;
    const { error: sendError } = await supabase.from('messages').insert({ conversation_id: active.id, sender_id: user.id, content: draft.trim(), read_by: [user.id] });
    if (sendError) { setError(sendError.message); return; }
    await supabase.from('conversations').update({ latest_message: draft.trim(), updated_at: new Date().toISOString() }).eq('id', active.id);
    setDraft('');
  };

  return (
    <main className="content-width standard-page messages-page">
      <div className="page-heading"><span className="eyebrow">A GOOD DEAL STARTS WITH A HELLO</span><h1>Your messages<span>.</span></h1></div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <section className="messages-shell"><aside className="conversation-panel"><div className="conversation-top"><h2>Inbox</h2></div><label className="conversation-search"><input aria-label="Search conversations" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search messages" /></label>
        {filtered.length ? filtered.map(conversation => {
          const participantId = conversation.member_ids?.find(id => id !== user.id);
          const participant = profiles[participantId];
          return <button type="button" key={conversation.id} className={`conversation-row${conversation.id === activeId ? ' conversation-active' : ''}`} onClick={() => setActiveId(conversation.id)}><span className="avatar">{participant?.full_name?.split(' ').map(part => part[0]).join('') || 'CIT'}</span><span className="conversation-copy"><strong>{participant?.full_name || 'CIT member'}</strong><small>{conversation.title || conversation.listings?.title}</small></span></button>;
        }) : <div className="empty-state"><p>{search ? 'No matching conversations.' : 'No conversations yet. Open a listing to message its owner.'}</p></div>}
      </aside><div className="chat-panel">{active ? <>
        <header className="chat-header"><span className="avatar">{other?.full_name?.split(' ').map(part => part[0]).join('') || 'CIT'}</span><span><strong>{other?.full_name || 'CIT member'}</strong></span><Link to={`/items/${active.listing_id}`}>View item ↗</Link></header>
        <div className="chat-messages" role="log">{messages.map(message => <div key={message.id} className={`message-line${message.sender_id === user.id ? ' own-message' : ''}`}><p>{message.content}</p></div>)}</div>
        <form className="message-form" onSubmit={send}><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message..." /><button type="submit">↑</button></form>
      </> : <div className="empty-state"><h2>Select a conversation</h2><p>Choose a chat or open a listing to message its owner.</p></div>}</div></section>
    </main>
  );
}

function conversationIds(rows, listingId, sellerId) {
  const ids = rows.flatMap(row => row.member_ids || []);
  if (listingId) ids.push(sellerId);
  return ids.filter(Boolean);
}

export default function Messages() {
  return isSupabaseConfigured ? <RemoteMessages /> : <LocalMessages />;
}
