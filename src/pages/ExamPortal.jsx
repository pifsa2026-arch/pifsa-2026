import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import '../styles/portal.css';
import '../styles/exam-portal.css';

const fmt = (iso) => new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function ExamPortal() {
  const { user, role, examinee, loading, signOut } = useAuth();

  if (loading) return <div className="xp-loading">Loading…</div>;
  if (!user) return <AuthScreen />;

  return (
    <div className="xp">
      <header className="xp-top">
        <Link to="/" className="xp-brand"><img src="/images/logo.png" alt="" /><span>PIFSA Exam Portal</span></Link>
        <div className="xp-user">
          <span>{examinee?.full_name || user.email}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className="xp-main">
        {role === 'staff' || role === 'admin' ? (
          <StatusCard icon="🛡️" title="You are signed in as staff">
            Staff manage exams from the <Link to="/exams">Online Exams workspace</Link>. To try the examinee view, register a separate examinee account.
          </StatusCard>
        ) : !examinee ? (
          <StatusCard icon="⚠️" title="No examinee profile found">
            This account was not registered through the Exam Portal. Sign out and register, or contact PIFSA.
          </StatusCard>
        ) : examinee.status === 'pending' ? (
          <StatusCard icon="⏳" title="Your registration is being reviewed">
            Thanks, {examinee.full_name.split(' ')[0]}! A PIFSA administrator will approve your account and assign your exams. Check back later.
          </StatusCard>
        ) : examinee.status === 'rejected' ? (
          <StatusCard icon="🚫" title="Your account is not active">
            Please contact PIFSA at pifsa2017@gmail.com if you believe this is a mistake.
          </StatusCard>
        ) : (
          <Dashboard name={examinee.full_name} />
        )}
      </main>
    </div>
  );
}

function StatusCard({ icon, title, children }) {
  return (
    <div className="xp-status">
      <div className="xp-status-icon">{icon}</div>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [f, setF] = useState({ full_name: '', email: '', contact_number: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    if (!isSupabaseConfigured) { setError('The exam portal is not connected yet.'); return; }
    if (mode === 'register') {
      if (!f.full_name.trim()) { setError('Enter your full name as it should appear on records.'); return; }
      if (f.password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
      if (f.password !== f.confirm) { setError('The passwords do not match.'); return; }
    }
    setBusy(true);
    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
      if (err) setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message);
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email: f.email.trim(), password: f.password,
        options: {
          data: { role: 'examinee', full_name: f.full_name.trim(), contact_number: f.contact_number.trim() },
          emailRedirectTo: `${window.location.origin}/exam-portal`,
        },
      });
      if (err) setError(err.message);
      else if (!data.session) { setOk('Almost done! We sent a confirmation link to your email. Open it, then sign in here.'); setMode('signin'); }
    }
    setBusy(false);
  };

  return (
    <div className="auth-screen">
      <form className="auth-card xp-auth" onSubmit={submit}>
        <div className="auth-brand"><img src="/images/logo.png" alt="PIFSA" /><span>PIFSA Exam Portal</span></div>
        <div className="auth-tabs">
          <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); }}>Sign in</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); setOk(''); }}>Register</button>
        </div>
        <h1 className="auth-title">{mode === 'signin' ? 'Welcome back' : 'Create your examinee account'}</h1>
        <p className="auth-sub">{mode === 'signin' ? 'Sign in to take your assigned exams.' : 'After you register, a PIFSA administrator approves your account and assigns your exams.'}</p>
        {mode === 'register' && (
          <>
            <input className="auth-field" placeholder="Full name" autoComplete="name" value={f.full_name} onChange={set('full_name')} />
            <input className="auth-field" placeholder="Contact number" autoComplete="tel" value={f.contact_number} onChange={set('contact_number')} />
          </>
        )}
        <input className="auth-field" type="email" placeholder="Email" autoComplete="email" value={f.email} onChange={set('email')} />
        <input className="auth-field" type="password" placeholder={mode === 'register' ? 'Password (at least 8 characters)' : 'Password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} />
        {mode === 'register' && <input className="auth-field" type="password" placeholder="Confirm password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} />}
        {error && <div className="auth-error">{error}</div>}
        {ok && <div className="auth-ok">{ok}</div>}
        <button className="auth-btn" disabled={busy || !f.email || !f.password}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Register'}</button>
        <Link to="/" className="auth-back">← Back to site</Link>
      </form>
    </div>
  );
}

function Dashboard({ name }) {
  const navigate = useNavigate();
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [retakeFor, setRetakeFor] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('my_exams');
    if (err) setError(err.message);
    setExams(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const start = async (x) => {
    setBusy(true); setError('');
    const { data, error: err } = await supabase.rpc('start_attempt', { p_assignment: x.assignment_id });
    setBusy(false);
    if (err) { setError(err.message); setConfirm(null); return; }
    navigate(`/exam-portal/attempt/${data}`);
  };

  const sendRetake = async () => {
    setBusy(true); setError('');
    const { error: err } = await supabase.rpc('request_retake', { p_assignment: retakeFor.assignment_id, p_reason: reason.trim() });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setRetakeFor(null); setReason('');
    load();
  };

  const statusOf = (x) => {
    const now = Date.now();
    if (x.in_progress_attempt) return { label: 'In progress', cls: 'live' };
    if (x.opens_at && new Date(x.opens_at) > now) return { label: `Opens ${fmt(x.opens_at)}`, cls: 'soon' };
    if (x.attempts_used === 0 && x.closes_at && new Date(x.closes_at) <= now) return { label: 'Closed', cls: 'closed' };
    if (x.attempts_used === 0) return { label: 'Not started', cls: 'new' };
    if (x.last_status === 'submitted') return { label: 'Waiting for grading', cls: 'soon' };
    const p = x.last_max ? (Number(x.last_score) / Number(x.last_max)) * 100 : 0;
    return p >= Number(x.passing_score) ? { label: 'Passed', cls: 'pass' } : { label: 'Did not pass', cls: 'fail' };
  };

  return (
    <div>
      <div className="xp-hello">
        <h1>Hello, {name.split(' ')[0]}</h1>
        <p>These are the exams assigned to you. Once you start an exam the timer keeps running, even if you close the page.</p>
      </div>
      {error && <div className="auth-error">{error}</div>}
      {exams === null ? <div className="xp-loading small">Loading your exams…</div> : exams.length === 0 ? (
        <div className="xp-empty">No exams are assigned to you yet. They will appear here when PIFSA assigns them.</div>
      ) : (
        <div className="xp-grid">
          {exams.map((x) => {
            const st = statusOf(x);
            const pctScore = x.last_max ? Math.round((Number(x.last_score) / Number(x.last_max)) * 1000) / 10 : null;
            return (
              <article className="xp-card" key={x.assignment_id}>
                <span className={'xp-pill ' + st.cls}>{st.label}</span>
                <h2>{x.title}</h2>
                {x.description && <p className="xp-desc">{x.description}</p>}
                <div className="xp-facts">
                  <span>{x.question_count} questions</span>
                  <span>{x.duration_minutes} minutes</span>
                  <span>{x.passing_score}% to pass</span>
                </div>
                {x.closes_at && <div className="xp-deadline">Deadline: {fmt(x.closes_at)}</div>}
                {x.last_status === 'graded' && <div className="xp-score">Score: <b>{x.last_score} / {x.last_max}</b> ({pctScore}%)</div>}

                <div className="xp-card-actions">
                  {x.in_progress_attempt ? (
                    <button className="xp-btn" onClick={() => navigate(`/exam-portal/attempt/${x.in_progress_attempt}`)}>Resume exam</button>
                  ) : x.can_start ? (
                    <button className="xp-btn" onClick={() => setConfirm(x)}>{x.attempts_used > 0 ? 'Start retake' : 'Start exam'}</button>
                  ) : x.attempts_used > 0 && x.retake_status === 'pending' ? (
                    <span className="xp-note">Retake requested · waiting for approval</span>
                  ) : x.attempts_used > 0 && x.last_status ? (
                    <button className="xp-btn ghost" onClick={() => setRetakeFor(x)}>{x.retake_status === 'denied' ? 'Request another retake' : 'Request a retake'}</button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {confirm && (
        <div className="modal-backdrop" onClick={() => setConfirm(null)}>
          <div className="modal xp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>Ready to start?</h2><button className="modal-close" onClick={() => setConfirm(null)}>×</button></div>
            <div className="modal-body">
              <h3 className="xp-modal-title">{confirm.title}</h3>
              <ul className="xp-rules">
                <li>You have <b>{confirm.duration_minutes} minutes</b> once you start. The timer does not pause.</li>
                <li>Your answers save automatically as you go.</li>
                <li>When time runs out, the exam is submitted with the answers you have.</li>
                <li>You can take this exam once. Retakes need approval from PIFSA.</li>
              </ul>
            </div>
            <div className="modal-foot"><div className="modal-foot-right">
              <button className="portal-btn-ghost" onClick={() => setConfirm(null)}>Not yet</button>
              <button className="portal-btn" onClick={() => start(confirm)} disabled={busy}>{busy ? 'Starting…' : 'Start now'}</button>
            </div></div>
          </div>
        </div>
      )}

      {retakeFor && (
        <div className="modal-backdrop" onClick={() => setRetakeFor(null)}>
          <div className="modal xp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>Request a retake</h2><button className="modal-close" onClick={() => setRetakeFor(null)}>×</button></div>
            <div className="modal-body">
              <p className="xp-modal-text">PIFSA will review your request for <b>{retakeFor.title}</b>. If approved, you can start the exam once more.</p>
              <textarea className="portal-field" rows={4} maxLength={500} placeholder="Reason for the retake (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="modal-foot"><div className="modal-foot-right">
              <button className="portal-btn-ghost" onClick={() => setRetakeFor(null)}>Cancel</button>
              <button className="portal-btn" onClick={sendRetake} disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
}
