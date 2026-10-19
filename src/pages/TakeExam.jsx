import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { LETTERS } from '../lib/examParser.js';
import '../styles/portal.css';
import '../styles/exam-portal.css';

const storeKey = (id) => `pifsa_attempt_${id}`;
const readLocal = (id) => { try { return JSON.parse(localStorage.getItem(storeKey(id))) || {}; } catch { return {}; } };
const writeLocal = (id, v) => { try { localStorage.setItem(storeKey(id), JSON.stringify(v)); } catch { /* storage blocked */ } };
const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(sec).padStart(2, '0')}`;
};

export default function TakeExam() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [state, setState] = useState(null); // response of get_attempt
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [left, setLeft] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [saveState, setSaveState] = useState('saved');
  const offset = useRef(0);
  const answersRef = useRef({});
  const submittedRef = useRef(false);
  answersRef.current = answers;

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('get_attempt', { p_attempt: attemptId });
    if (err) { setError(err.message); return; }
    offset.current = new Date(data.attempt.server_now) - Date.now();
    setState(data);
    if (data.attempt.status === 'in_progress') {
      setAnswers({ ...(data.attempt.answers || {}), ...readLocal(attemptId) });
    } else {
      setResult({ status: data.attempt.status, score: data.attempt.score, max_score: data.attempt.max_score });
    }
  }, [attemptId]);

  useEffect(() => { if (user && role === 'examinee') load(); }, [user, role, load]);

  const submit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const { data, error: err } = await supabase.rpc('submit_attempt', { p_attempt: attemptId, p_answers: answersRef.current });
    setSubmitting(false); setConfirmOpen(false);
    if (err) { submittedRef.current = false; setError((auto ? 'Time is up, but submitting failed: ' : 'Could not submit: ') + err.message); return; }
    try { localStorage.removeItem(storeKey(attemptId)); } catch { /* ignore */ }
    setResult({ ...data, auto });
  }, [attemptId]);

  // Countdown, synced to the server clock; submits automatically at zero
  useEffect(() => {
    if (!state || state.attempt.status !== 'in_progress' || result) return;
    const due = new Date(state.attempt.due_at).getTime();
    const tick = () => {
      const ms = due - (Date.now() + offset.current);
      setLeft(ms);
      if (ms <= 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [state, result, submit]);

  // Save to this device immediately and to the server a moment after typing stops
  useEffect(() => {
    if (!state || result || state.attempt.status !== 'in_progress') return;
    writeLocal(attemptId, answers);
    setSaveState('saving');
    const t = setTimeout(async () => {
      const { error: err } = await supabase.rpc('save_attempt', { p_attempt: attemptId, p_answers: answersRef.current });
      setSaveState(err ? 'offline' : 'saved');
    }, 1500);
    return () => clearTimeout(t);
  }, [answers, attemptId, state, result]);

  useEffect(() => {
    if (!state || result) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state, result]);

  if (loading) return <div className="xp-loading">Loading…</div>;
  if (!user || role !== 'examinee') return <Navigate to="/exam-portal" replace />;

  const shell = (body) => (
    <div className="xp">
      <header className="xp-top">
        <Link to="/exam-portal" className="xp-brand"><img src="/images/logo.png" alt="" /><span>PIFSA Exam Portal</span></Link>
      </header>
      <main className="xp-main">{body}</main>
    </div>
  );

  if (error && !state) return shell(<div className="xp-status"><div className="xp-status-icon">⚠️</div><h1>Could not open this exam</h1><p>{error}</p><Link className="xp-btn" to="/exam-portal">Back to my exams</Link></div>);
  if (!state) return <div className="xp-loading">Opening your exam…</div>;

  if (result) {
    const graded = result.status === 'graded';
    const p = graded && result.max_score ? Math.round((Number(result.score) / Number(result.max_score)) * 1000) / 10 : null;
    const passed = graded && p >= Number(state.exam.passing_score);
    return shell(
      <div className="xp-status xp-result">
        <div className={'xp-result-ring ' + (graded ? (passed ? 'pass' : 'fail') : 'wait')}>{graded ? `${p}%` : '✓'}</div>
        <h1>{result.auto ? 'Time is up. Your exam was submitted.' : 'Your exam was submitted.'}</h1>
        {graded ? (
          <p>You scored <b>{result.score} out of {result.max_score}</b>. {passed ? 'Congratulations, you passed.' : `The passing score is ${state.exam.passing_score}%.`}</p>
        ) : (
          <p>Your essay answers will be graded by PIFSA. Your final score will appear on your exam list once grading is done.</p>
        )}
        <button className="xp-btn" onClick={() => navigate('/exam-portal')}>Back to my exams</button>
      </div>
    );
  }

  const qs = state.questions;
  const answered = qs.filter((q) => String(answers[q.id] ?? '').trim()).length;
  const setAnswer = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));
  const low = left !== null && left < 5 * 60 * 1000;

  return (
    <div className="xp xp-taking">
      <header className="xp-exam-bar">
        <div className="xp-exam-title">
          <img src="/images/logo.png" alt="" />
          <div><strong>{state.exam.title}</strong><span>{answered} of {qs.length} answered · {saveState === 'saving' ? 'Saving…' : saveState === 'offline' ? 'Saved on this device (reconnecting…)' : 'All answers saved'}</span></div>
        </div>
        <div className={'xp-timer' + (low ? ' low' : '')} aria-live="polite">{left === null ? '…' : clock(left)}</div>
        <button className="xp-btn" onClick={() => setConfirmOpen(true)}>Submit</button>
      </header>
      <div className="xp-progress"><i style={{ width: `${(answered / Math.max(qs.length, 1)) * 100}%` }} /></div>

      <div className="xp-exam">
        <aside className="xp-nav">
          <div className="xp-nav-label">Questions</div>
          <div className="xp-nav-grid">
            {qs.map((q, i) => (
              <a key={q.id} href={`#q-${q.id}`} className={String(answers[q.id] ?? '').trim() ? 'done' : ''}>{i + 1}</a>
            ))}
          </div>
        </aside>

        <div className="xp-questions">
          {error && <div className="auth-error">{error}</div>}
          {state.exam.instructions && <div className="xp-instructions">{state.exam.instructions}</div>}
          {qs.map((q, i) => (
            <div className="xp-q" id={`q-${q.id}`} key={q.id}>
              <div className="xp-q-top"><span>Question {i + 1}</span><span>{q.points} pt{Number(q.points) === 1 ? '' : 's'}</span></div>
              <p className="xp-q-prompt">{q.prompt}</p>
              {q.type === 'mc' && (
                <div className="xp-options">
                  {q.choices.map((c, ci) => (
                    <label key={ci} className={'xp-option' + (answers[q.id] === LETTERS[ci] ? ' on' : '')}>
                      <input type="radio" name={q.id} checked={answers[q.id] === LETTERS[ci]} onChange={() => setAnswer(q.id, LETTERS[ci])} />
                      <span className="xp-letter">{LETTERS[ci]}</span><span>{c}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'tf' && (
                <div className="xp-tf">
                  {['True', 'False'].map((v) => (
                    <button key={v} type="button" className={answers[q.id] === v ? 'on' : ''} onClick={() => setAnswer(q.id, v)}>{v}</button>
                  ))}
                </div>
              )}
              {q.type === 'identification' && (
                <input className="portal-field xp-input" placeholder="Type your answer" value={answers[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)} maxLength={300} />
              )}
              {q.type === 'essay' && (
                <textarea className="portal-field xp-input" rows={7} placeholder="Write your answer" value={answers[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)} maxLength={10000} />
              )}
            </div>
          ))}
          <div className="xp-end">
            <p>{answered === qs.length ? 'You have answered every question.' : `${qs.length - answered} question${qs.length - answered > 1 ? 's are' : ' is'} still unanswered.`}</p>
            <button className="xp-btn" onClick={() => setConfirmOpen(true)}>Submit exam</button>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="modal-backdrop" onClick={() => !submitting && setConfirmOpen(false)}>
          <div className="modal xp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2>Submit your exam?</h2><button className="modal-close" onClick={() => setConfirmOpen(false)}>×</button></div>
            <div className="modal-body">
              <p className="xp-modal-text">
                {answered === qs.length ? 'All questions are answered.' : <><b>{qs.length - answered} unanswered</b> question{qs.length - answered > 1 ? 's' : ''} will be marked wrong.</>}
                {' '}You cannot change your answers after submitting.
              </p>
            </div>
            <div className="modal-foot"><div className="modal-foot-right">
              <button className="portal-btn-ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>Keep answering</button>
              <button className="portal-btn" onClick={() => submit(false)} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
}
