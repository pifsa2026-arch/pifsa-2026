import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

// Preview/dev mode: append ?preview=1 to the URL (e.g. /portal?preview=1) to view
// the portal with sample data WITHOUT logging in. Only works when the app is running
// in Vite dev (import.meta.env.DEV) OR when explicitly enabled via VITE_ALLOW_PREVIEW=true.
// This lets you click through the whole portal locally (npm run dev) at zero cost —
// no Netlify build, no Supabase login required.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

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
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#00264d' }}>
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
