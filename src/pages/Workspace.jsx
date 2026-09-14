import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { useIsAdmin } from '../lib/useIsAdmin.js';
import '../styles/portal.css';

export default function Workspace() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, checked } = useIsAdmin();

  const logout = async () => { await signOut(); navigate('/'); };

  return (
    <div className="workspace">
      <div className="workspace-inner">
        <div className="workspace-brand">
          <img src="/images/logo.png" alt="PIFSA" />
          <div>
            <div className="workspace-title">PIFSA Portal</div>
            <div className="workspace-sub">{user?.email}</div>
          </div>
        </div>
        <h1 className="workspace-h1">Choose a workspace</h1>
        <p className="workspace-lead">Where would you like to go?</p>

        <div className="workspace-cards">
          <div className="ws-card" role="button" tabIndex={0} onClick={() => navigate('/portal')}>
            <div className="ws-card-icon crm">☷</div>
            <h3>CRM System</h3>
            <p>Manage leads, enrollment, revenue, and automations.</p>
            <span className="ws-card-go">Open CRM →</span>
          </div>

          <div className={'ws-card' + (checked && !isAdmin ? ' locked' : '')}
            role="button" tabIndex={0}
            onClick={() => { if (isAdmin) navigate('/admin'); }}>
            <div className="ws-card-icon ws-admin">⚙</div>
            <h3>Admin Console</h3>
            <p>Edit the public landing page — calendar events and upcoming programs.</p>
            {checked && !isAdmin
              ? <span className="ws-card-locked">🔒 Admin access required</span>
              : <span className="ws-card-go">Open Console →</span>}
          </div>
        </div>

        <button className="workspace-signout" onClick={logout}>Sign out</button>
      </div>
    </div>
  );
}
