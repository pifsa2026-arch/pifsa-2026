import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import '../styles/chat.css';

const STORE = 'pifsa_chat';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch { return null; } };
const save = (v) => { try { v ? localStorage.setItem(STORE, JSON.stringify(v)) : localStorage.removeItem(STORE); } catch { /* storage blocked */ } };
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(load);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [intro, setIntro] = useState({ name: '', email: '', message: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(() => load()?.seen || 0);
  const lastId = useRef(0);
  const listRef = useRef(null);

  const fetchNew = useCallback(async () => {
    if (!session?.token) return;
    const { data, error: err } = await supabase.rpc('chat_fetch', { p_token: session.token, p_after: lastId.current });
    if (err) {
      if (/not found/i.test(err.message)) { save(null); setSession(null); setMessages([]); lastId.current = 0; }
      return;
    }
    if (data?.length) {
      lastId.current = data[data.length - 1].id;
      setMessages((m) => [...m, ...data.filter((x) => !m.some((y) => y.id === x.id))]);
    }
  }, [session]);

  // Poll quickly while open, slowly while closed (to show a badge when staff reply), and not at all in a hidden tab
  useEffect(() => {
    if (!session?.token || !isSupabaseConfigured) return;
    fetchNew();
    const t = setInterval(() => { if (!document.hidden) fetchNew(); }, open ? 4000 : 60000);
    return () => clearInterval(t);
  }, [session, open, fetchNew]);

  useEffect(() => {
    if (!open) return;
    const top = messages.length ? messages[messages.length - 1].id : 0;
    if (top > seen) { setSeen(top); if (session) save({ ...session, seen: top }); }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, messages, seen, session]);

  const unread = messages.filter((m) => m.sender === 'staff' && m.id > seen).length;

  const start = async (e) => {
    e.preventDefault();
    if (!intro.name.trim() || !intro.message.trim()) { setError('Please enter your name and a message.'); return; }
    setBusy(true); setError('');
    const { data, error: err } = await supabase.rpc('chat_start', { p_name: intro.name, p_email: intro.email });
    if (err || !data) { setBusy(false); setError('Chat is unavailable right now. Please email pifsa2017@gmail.com.'); return; }
    const s = { token: data.token, name: intro.name.trim(), seen: 0 };
    const sent = await supabase.rpc('chat_send', { p_token: s.token, p_body: intro.message });
    setBusy(false);
    if (sent.error) { setError(sent.error.message); return; }
    save(s); setSession(s); setIntro({ name: '', email: '', message: '' });
  };

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true); setError('');
    const { error: err } = await supabase.rpc('chat_send', { p_token: session.token, p_body: body });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setDraft('');
    fetchNew();
  };

  const endChat = () => {
    if (!window.confirm('End this chat? The conversation will be cleared from this browser.')) return;
    save(null); setSession(null); setMessages([]); lastId.current = 0; setSeen(0);
  };

  return (
    <div className="cw">
      {open && (
        <div className="cw-panel" role="dialog" aria-label="Chat with PIFSA">
          <div className="cw-head">
            <img src="/images/logo.png" alt="" />
            <div>
              <strong>Chat with PIFSA</strong>
              <span>A staff member will reply here</span>
            </div>
            <button className="cw-x" onClick={() => setOpen(false)} aria-label="Minimize chat">×</button>
          </div>

          {!isSupabaseConfigured ? (
            <div className="cw-body cw-pad">Chat is offline. Email us at pifsa2017@gmail.com.</div>
          ) : !session ? (
            <form className="cw-body cw-pad cw-intro" onSubmit={start}>
              <p>Hi! Ask us about programs, schedules, requirements or exams.</p>
              <input placeholder="Your name" value={intro.name} onChange={(e) => setIntro({ ...intro, name: e.target.value })} maxLength={80} />
              <input type="email" placeholder="Email (so we can follow up)" value={intro.email} onChange={(e) => setIntro({ ...intro, email: e.target.value })} maxLength={120} />
              <textarea rows={3} placeholder="How can we help?" value={intro.message} onChange={(e) => setIntro({ ...intro, message: e.target.value })} maxLength={2000} />
              {error && <div className="cw-error">{error}</div>}
              <button className="cw-send-btn" disabled={busy}>{busy ? 'Starting…' : 'Start chat'}</button>
            </form>
          ) : (
            <>
              <div className="cw-body cw-list" ref={listRef}>
                {messages.length === 0 && <div className="cw-empty">Loading conversation…</div>}
                {messages.map((m) => (
                  <div key={m.id} className={'cw-msg ' + (m.sender === 'visitor' ? 'me' : 'them')}>
                    <div className="cw-bubble">{m.body}</div>
                    <span className="cw-time">{m.sender === 'staff' ? 'PIFSA · ' : ''}{fmtTime(m.created_at)}</span>
                  </div>
                ))}
              </div>
              {error && <div className="cw-error cw-error-bar">{error}</div>}
              <form className="cw-compose" onSubmit={send}>
                <input placeholder="Type a message" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} aria-label="Message" />
                <button disabled={!draft.trim() || busy} aria-label="Send">➤</button>
              </form>
              <button className="cw-end" onClick={endChat}>End chat</button>
            </>
          )}
        </div>
      )}
      <button className={'cw-fab' + (open ? ' open' : '')} onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close chat' : 'Chat with us'}>
        {open ? '×' : (
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
        )}
        {!open && unread > 0 && <span className="cw-badge">{unread}</span>}
      </button>
    </div>
  );
}
