import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import '../styles/portal.css';
import '../styles/admin.css';
import '../styles/chat.css';

const QUICK_REPLIES = [
  'Hi! Thanks for reaching out to PIFSA. How can we help you today?',
  'Each program is ₱25,000, payable in full or in installments.',
  'You can apply through the form on our website. We will send the next steps by email.',
  'Please email your requirements and proof of payment to pifsa2017@gmail.com.',
];

const SAMPLE = {
  conversations: [{ id: 'c1', visitor_name: 'Maria Santos', visitor_email: 'maria@example.com', status: 'open', unread_staff: 2, last_message_at: new Date().toISOString(), created_at: new Date().toISOString() }],
  messages: { c1: [
    { id: 1, conversation_id: 'c1', sender: 'visitor', body: 'Hello! Is the Forensic Psychology program still open for August?', created_at: new Date(Date.now() - 300000).toISOString() },
    { id: 2, conversation_id: 'c1', sender: 'visitor', body: 'Also, can I pay in installments?', created_at: new Date(Date.now() - 240000).toISOString() },
  ] },
};

const ago = (iso) => {
  const s = Math.round((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};
const fmtTime = (iso) => new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function LiveChat() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [convs, setConvs] = useState([]);
  const [lastBody, setLastBody] = useState({});
  const [filter, setFilter] = useState('open');
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const threadRef = useRef(null);
  const activeRef = useRef(null);
  activeRef.current = activeId;

  const loadConvs = useCallback(async () => {
    if (!isSupabaseConfigured) { setConvs(SAMPLE.conversations); return; }
    const { data, error: err } = await supabase.from('chat_conversations')
      .select('id, visitor_name, visitor_email, status, unread_staff, last_message_at, created_at')
      .order('last_message_at', { ascending: false }).limit(200);
    if (err) { setError('Could not load chats (' + err.message + '). Run supabase/roles_exams_chat.sql first.'); return; }
    setConvs(data || []);
    const ids = (data || []).slice(0, 60).map((c) => c.id);
    if (ids.length) {
      const { data: last } = await supabase.from('chat_messages').select('conversation_id, body, sender, id')
        .in('conversation_id', ids).order('id', { ascending: false }).limit(300);
      const map = {};
      (last || []).forEach((m) => { if (!map[m.conversation_id]) map[m.conversation_id] = (m.sender === 'staff' ? 'You: ' : '') + m.body; });
      setLastBody(map);
    }
  }, []);

  const loadThread = useCallback(async (id) => {
    if (!isSupabaseConfigured) { setMessages(SAMPLE.messages[id] || []); return; }
    const { data } = await supabase.from('chat_messages').select('*').eq('conversation_id', id).order('id').limit(500);
    setMessages(data || []);
    await supabase.from('chat_conversations').update({ unread_staff: 0 }).eq('id', id).gt('unread_staff', 0);
    setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, unread_staff: 0 } : c)));
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);
  useEffect(() => { if (activeId) loadThread(activeId); }, [activeId, loadThread]);

  // Live updates: new messages and conversation changes; slow polling as a safety net
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel('staff-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const m = payload.new;
        setLastBody((lb) => ({ ...lb, [m.conversation_id]: (m.sender === 'staff' ? 'You: ' : '') + m.body }));
        if (m.conversation_id === activeRef.current) {
          setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
          if (m.sender === 'visitor') supabase.from('chat_conversations').update({ unread_staff: 0 }).eq('id', m.conversation_id).then(() => {});
        }
        loadConvs();
      })
      .subscribe();
    const poll = setInterval(() => { loadConvs(); if (activeRef.current) loadThread(activeRef.current); }, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [loadConvs, loadThread]);

  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }); }, [messages]);

  const totalUnread = convs.reduce((s, c) => s + (c.unread_staff || 0), 0);
  useEffect(() => {
    document.title = totalUnread ? `(${totalUnread}) Live Chat · PIFSA` : 'Live Chat · PIFSA';
    return () => { document.title = 'PIFSA — Philippine Investigation and Forensic Science Academy'; };
  }, [totalUnread]);

  const active = convs.find((c) => c.id === activeId);
  const shown = convs.filter((c) => c.status === filter);

  const send = async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !active) return;
    setSending(true); setError('');
    if (isSupabaseConfigured) {
      const { data, error: err } = await supabase.from('chat_messages')
        .insert([{ conversation_id: active.id, sender: 'staff', body, staff_email: user?.email || null }]).select().single();
      if (err) { setSending(false); setError('Could not send: ' + err.message); return; }
      setMessages((ms) => (ms.some((x) => x.id === data.id) ? ms : [...ms, data]));
    } else {
      setMessages((ms) => [...ms, { id: Date.now(), sender: 'staff', body, created_at: new Date().toISOString() }]);
    }
    setDraft(''); setSending(false);
  };

  const setStatus = async (status) => {
    if (isSupabaseConfigured) await supabase.from('chat_conversations').update({ status }).eq('id', active.id);
    setConvs((cs) => cs.map((c) => (c.id === active.id ? { ...c, status } : c)));
    if (status === 'closed') setActiveId(null);
  };

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="admin-top-left">
          <img src="/images/logo.png" alt="PIFSA" />
          <div>
            <div className="admin-top-title">Live Chat</div>
            <div className="admin-top-sub">{totalUnread ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'Website visitor inbox'}</div>
          </div>
        </div>
        <div className="admin-top-right">
          <button className="admin-switch" onClick={() => navigate('/portal')}>CRM System</button>
          <button className="admin-switch" onClick={() => navigate('/workspace')}>Workspace</button>
          <button className="portal-signout" onClick={async () => { await signOut(); navigate('/'); }}>Sign out</button>
        </div>
      </header>

      <div className={'lc' + (active ? ' has-active' : '')}>
        <aside className="lc-side">
          <div className="lc-side-head">
            <h2>Conversations</h2>
            <div className="lc-filter">
              {['open', 'closed'].map((f) => (
                <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                  {f === 'open' ? 'Open' : 'Closed'} ({convs.filter((c) => c.status === f).length})
                </button>
              ))}
            </div>
          </div>
          {error && <div className="notice" style={{ margin: '0 12px 8px' }}>{error}</div>}
          <div className="lc-list">
            {shown.length === 0 && <div className="lc-empty">{filter === 'open' ? 'No open chats. New messages from the website chat bubble appear here.' : 'No closed chats.'}</div>}
            {shown.map((c) => (
              <button key={c.id} className={'lc-item' + (c.id === activeId ? ' on' : '')} onClick={() => setActiveId(c.id)}>
                <div className="lc-item-top">
                  <span className="lc-item-name">{c.visitor_name}</span>
                  <span className="lc-item-time">{ago(c.last_message_at)}</span>
                </div>
                <div className="lc-item-sub">
                  <span>{lastBody[c.id] || c.visitor_email || 'New conversation'}</span>
                  {c.unread_staff > 0 && <span className="lc-unread">{c.unread_staff}</span>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="lc-main">
          {!active ? (
            <div className="lc-placeholder">Select a conversation to reply.</div>
          ) : (
            <>
              <div className="lc-main-head">
                <button className="lc-back" onClick={() => setActiveId(null)} aria-label="Back to conversations">‹</button>
                <div className="lc-avatar">{active.visitor_name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <h3>{active.visitor_name}</h3>
                  <p>{active.visitor_email ? <a href={`mailto:${active.visitor_email}`}>{active.visitor_email}</a> : 'No email given'} · started {fmtTime(active.created_at)}</p>
                </div>
                <div className="lc-head-actions">
                  {active.status === 'open'
                    ? <button className="portal-btn-ghost" onClick={() => setStatus('closed')}>Close chat</button>
                    : <button className="portal-btn-ghost" onClick={() => setStatus('open')}>Reopen</button>}
                </div>
              </div>
              <div className="lc-thread" ref={threadRef}>
                {messages.map((m) => (
                  <div key={m.id} className={'cw-msg ' + (m.sender === 'staff' ? 'me' : 'them')}>
                    <div className="cw-bubble">{m.body}</div>
                    <span className="cw-time">{m.sender === 'staff' ? (m.staff_email || 'Staff') + ' · ' : ''}{fmtTime(m.created_at)}</span>
                  </div>
                ))}
              </div>
              <div className="lc-quick">
                {QUICK_REPLIES.map((q) => <button key={q} onClick={() => setDraft(q)} title={q}>{q.slice(0, 34)}…</button>)}
              </div>
              <form className="lc-compose" onSubmit={send}>
                <textarea
                  rows={1} placeholder="Write a reply… (Enter to send, Shift+Enter for a new line)" value={draft}
                  onChange={(e) => setDraft(e.target.value)} maxLength={2000}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <button className="portal-btn" disabled={!draft.trim() || sending}>{sending ? 'Sending…' : 'Send'}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
