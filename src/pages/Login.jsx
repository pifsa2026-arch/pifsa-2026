import { useState } from 'react';
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
  const { user } = useAuth();

  if (user) { navigate('/workspace'); }

  const submit = async () => {
    setError('');
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    navigate('/workspace');
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/images/logo.png" alt="PIFSA" />
          <span>PIFSA Portal</span>
        </div>
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Access the enrollment CRM and marketing dashboards.</p>
        <input className="auth-field" type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <input className="auth-field" type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-btn" onClick={submit} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="auth-back">← Back to site</Link>
      </div>
    </div>
  );
}
