import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../services/http.js';
import { useAuth } from '../context/useAuth.js';

export default function Messages() {
  const { threadId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [thread, setThread] = useState(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const loadThreads = useCallback(async () => { const { conversations } = await apiRequest('/api/messages/threads'); setThreads(conversations); }, []);
  const loadThread = useCallback(async () => { if (!threadId) { setThread(null); return; } const { conversation } = await apiRequest(`/api/messages/threads/${threadId}`); setThread(conversation); }, [threadId]);
  useEffect(() => { loadThreads().catch((e) => setError(e.message)); }, [loadThreads]);
  useEffect(() => { loadThread().catch((e) => setError(e.message)); const timer = setInterval(() => { loadThreads().catch(() => {}); loadThread().catch(() => {}); }, 5000); return () => clearInterval(timer); }, [loadThread, loadThreads]);
  const send = async (event) => { event.preventDefault(); if (!body.trim()) return; setBusy(true); setError(''); try { await apiRequest(`/api/messages/threads/${threadId}/messages`, { method: 'POST', body: { body } }); setBody(''); await Promise.all([loadThread(), loadThreads()]); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const other = thread && (user?.role === 'customer' ? thread.vendor : thread.customer);
  return <main className="messages-page"><header><span className="eyebrow">DIRECT SUPPORT</span><h1>Messages</h1><p>Talk directly with a marketplace customer or seller.</p></header>{error && <p className="shop-message" role="alert">{error}</p>}<div className="messages-layout"><aside className="messages-list"><h2>Conversations</h2>{threads.map((item) => { const person = user?.role === 'customer' ? item.vendor : item.customer; return <Link className={`message-thread-link ${item._id === threadId ? 'selected' : ''}`} key={item._id} to={`/messages/${item._id}`}><strong>{person?.name || 'Member'}</strong><small>{item.product?.title || 'Marketplace conversation'}</small><span>{item.messages?.at(-1)?.body || 'Start the conversation'}</span></Link>; })}{!threads.length && <p className="admin-empty">No conversations yet. Open a product page to contact its seller.</p>}</aside><section className="message-panel">{thread ? <><div className="message-panel-heading"><strong>{other?.name}</strong><small>{thread.product?.title || 'Marketplace'}</small></div><div className="message-history">{thread.messages.map((message) => <article className={`chat-bubble ${message.sender === user?._id ? 'own' : ''}`} key={message._id}><p>{message.body}</p><small>{new Date(message.createdAt).toLocaleString()}</small></article>)}</div><form className="message-compose" onSubmit={send}><textarea rows="2" maxLength="2000" required value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message…"/><button className="dark-button" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button></form></> : <div className="message-empty">Choose a conversation to view messages.</div>}</section></div></main>;
}
