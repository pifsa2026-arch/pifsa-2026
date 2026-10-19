import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

// Staff-only pages. Preview mode (?preview=1) works in local dev or when VITE_ALLOW_PREVIEW=true.
export default function RequireAuth({ children }) {
  const { user, isStaff, role, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const previewRequested = new URLSearchParams(location.search).get('preview') === '1';
  const previewAllowed = import.meta.env.DEV || import.meta.env.VITE_ALLOW_PREVIEW === 'true';

  if (previewRequested && previewAllowed) {
    return (
      <>
        <div className="preview-ribbon">PREVIEW MODE · sample data · not logged in</div>
        {children}
      </>
    );
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#00264d' }}>Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'examinee') return <Navigate to="/exam-portal" replace />;
  if (!isStaff) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f2ebdd', fontFamily: 'Inter, sans-serif', padding: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e4eaf2', borderRadius: 22, padding: '44px 48px', textAlign: 'center', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,32,80,0.1)' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#00264d', marginBottom: 10 }}>Staff access required</div>
          <p style={{ fontSize: 14, color: '#5a6a7e', lineHeight: 1.6, marginBottom: 24 }}>
            {user.email} is not on the PIFSA staff list. Ask an administrator to add you.
          </p>
          <button className="portal-btn" onClick={async () => { await signOut(); navigate('/'); }}>Sign out</button>
        </div>
      </div>
    );
  }
  return children;
}
