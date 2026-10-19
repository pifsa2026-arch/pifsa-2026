import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import '../styles/portal.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) navigate(role === 'examinee' ? '/exam-portal' : '/workspace', { replace: true });
  }, [user, role, loading, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message);
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <img src="/images/logo.png" alt="PIFSA" />
          <span>PIFSA Portal</span>
        </div>
        <h1 className="auth-title">Staff sign in</h1>
        <p className="auth-sub">Enrollment CRM, completers, live chat and online exams.</p>
        <input className="auth-field" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="auth-field" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-btn" type="submit" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="auth-alt">Taking an exam? <Link to="/exam-portal">Go to the Exam Portal →</Link></div>
        <Link to="/" className="auth-back">← Back to site</Link>
      </form>
    </div>
  );
}
