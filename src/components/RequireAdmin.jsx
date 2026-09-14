import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '../lib/useIsAdmin.js';

export default function RequireAdmin({ children }) {
  const { isAdmin, checked } = useIsAdmin();

  if (!checked) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#00264d' }}>
        Checking access…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center',
        background: '#f2ebdd', fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          background: '#fff', border: '1px solid #e4eaf2', borderRadius: 22,
          padding: '48px 56px', textAlign: 'center', maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0,32,80,0.1)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#00264d', marginBottom: 10 }}>
            Admin access required
          </div>
          <div style={{ fontSize: 14, color: '#5a6a7e', lineHeight: 1.6, marginBottom: 28 }}>
            Your account doesn't have admin privileges. Contact a PIFSA administrator to request access.
          </div>
          <a href="/workspace" style={{
            display: 'inline-block', background: '#00264d', color: '#fff',
            padding: '10px 28px', borderRadius: 100, fontWeight: 700,
            fontSize: 14, textDecoration: 'none',
          }}>
            Back to workspace
          </a>
        </div>
      </div>
    );
  }

  return children;
}
