import React, { useState } from 'react';
import { conversations } from '../data/appData';
import { Link } from 'react-router-dom';

const startingMessages = [
  { id: 'msg-1', text: 'Hi Ana! Is the multimeter available this afternoon?', own: false, time: '10:35 AM' },
  { id: 'msg-2', text: 'Yes, it is! I can meet you by the main gate after class.', own: true, time: '10:39 AM' },
  { id: 'msg-3', text: 'Could we meet at the main gate around 3?', own: false, time: '10:42 AM' },
];

export default function Messages() {
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [messages, setMessages] = useState(startingMessages);
  const [draft, setDraft] = useState('');
  const active = conversations.find((conversation) => conversation.id === activeId) || conversations[0];
  const sendMessage = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setMessages((current) => [...current, { id: `msg-${Date.now()}`, text: draft.trim(), own: true, time: 'Now' }]);
    setDraft('');
  };
  return (
    <div className="content-width standard-page messages-page">
      <div className="page-heading"><span className="eyebrow">A GOOD DEAL STARTS WITH A HELLO</span><h1>Your messages<span>.</span></h1><p>Make a plan to meet, then make the exchange in person.</p></div>
      <section className="messages-shell">
        <aside className="conversation-panel"><div className="conversation-top"><h2>Inbox</h2><button aria-label="Compose a new message">＋</button></div><label className="conversation-search"><span>⌕</span><input aria-label="Search conversations" placeholder="Search messages" /></label>
          {conversations.map((conversation) => <button type="button" key={conversation.id} className={`conversation-row${conversation.id === activeId ? ' conversation-active' : ''}`} onClick={() => { setActiveId(conversation.id); if (conversation.id !== conversations[0].id) setMessages([{ id: 'msg-first', text: conversation.lastMessage, own: false, time: conversation.time }]); else setMessages(startingMessages); }}><span className="avatar">{conversation.name.split(' ').map((name) => name[0]).join('')}</span><span className="conversation-copy"><strong>{conversation.name}</strong><small>{conversation.lastMessage}</small></span><span className="conversation-time">{conversation.time}</span>{conversation.unread && <i className="unread-dot" />}</button>)}
        </aside>
        <div className="chat-panel"><header className="chat-header"><span className="avatar">{active.name.split(' ').map((name) => name[0]).join('')}</span><span><strong>{active.name}</strong><small>Verified CIT member</small></span><Link to={`/items/${active.item === 'Digital Multimeter' ? 'digital-multimeter' : active.item === 'Arduino Uno Kit' ? 'arduino-uno-kit' : 'scientific-calculator'}`}>View item ↗</Link></header>
          <div className="item-chat-card"><span className="chat-item-thumb">✳</span><span><small>ABOUT THIS LISTING</small><strong>{active.item}</strong><small>Meet on campus to exchange</small></span></div>
          <div className="chat-messages" aria-live="polite">{messages.map((message) => <div key={message.id} className={`message-line${message.own ? ' own-message' : ''}`}><p>{message.text}</p><small>{message.time}</small></div>)}</div>
          <form className="message-form" onSubmit={sendMessage}><label className="sr-only" htmlFor="message-draft">Write a message</label><input id="message-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." /><button aria-label="Send message" type="submit">↑</button></form>
          <p className="chat-offline-note">Keep payments and item exchange offline by cash and meetup.</p>
        </div>
      </section>
    </div>
  );
}
