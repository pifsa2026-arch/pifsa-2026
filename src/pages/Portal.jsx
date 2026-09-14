import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import '../styles/portal.css';
import EnrollmentDashboard from '../components/portal/EnrollmentDashboard.jsx';
import RevenueDashboard from '../components/portal/RevenueDashboard.jsx';
import CRMDashboard from '../components/portal/CRMDashboard.jsx';
import AutomationDashboard from '../components/portal/AutomationDashboard.jsx';
import { LeadsProvider, useLeads } from '../lib/LeadsContext.jsx';
import { STAGES, TRAINING_DURATIONS, isFullyPaid } from '../lib/config.js';

const TABS = [
  { id: 'enrollment', label: 'Enrollment', icon: '\uD83D\uDCCA' },
  { id: 'revenue', label: 'Revenue', icon: '\uD83D\uDCB0' },
  { id: 'crm', label: 'CRM', icon: '\uD83D\uDC65' },
  { id: 'automation', label: 'Automation', icon: '\u26A1' },
];

const STAGE_COLORS = { Leads: '#5b8def', Applicants: '#b8860b', Examinees: '#7a5c1b', 'For Requirements': '#c98a2b', Admitted: '#27795b', Paid: '#1b7a52' };

function PortalInner() {
  const [tab, setTab] = useState('enrollment');
  const [navOpen, setNavOpen] = useState(false);
  const [ovYear, setOvYear] = useState('2027');
  const [ovDur, setOvDur] = useState('all');
  const [crmStageFilter, setCrmStageFilter] = useState(null);
  const { user, signOut } = useAuth();
  const { leads } = useLeads();
  const navigate = useNavigate();

  const logout = async () => { await signOut(); navigate('/'); };

  const ovLeads = leads.filter((l) => {
    if (ovDur !== 'all') return l.training_duration === ovDur;
    if (ovYear && l.training_duration) return l.training_duration.includes(ovYear);
    return true;
  });
  const stageCounts = STAGES.reduce((a, s) => { a[s] = ovLeads.filter((l) => l.stage === s).length; return a; }, {});
  const totalLeads = ovLeads.length;
  const fullyPaid = ovLeads.filter(isFullyPaid).length;

  const goStage = (stage) => { setCrmStageFilter(stage); setTab('crm'); setNavOpen(false); };

  return (
    <div className="portal">
      <aside className={'portal-side' + (navOpen ? ' open' : '')}>
        <div className="portal-brand">
          <img src="/images/logo.png" alt="PIFSA" />
          <div>
            <div className="portal-brand-name">PIFSA</div>
            <div className="portal-brand-sub">Marketing Portal</div>
          </div>
        </div>

        <div className="portal-scroll">
          <nav className="portal-nav">
            {TABS.map((t) => (
              <button key={t.id} className={'portal-nav-item' + (tab === t.id ? ' active' : '')}
                onClick={() => { setTab(t.id); setNavOpen(false); if (t.id === 'crm') setCrmStageFilter(null); }}>
                <span className="portal-nav-icon">{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>

          {/* PIPELINE */}
          <div className="side-section-label">Pipeline</div>
          <div className="pipeline-list">
            {STAGES.map((s) => (
              <button key={s} className={'pipeline-item' + (tab === 'crm' && crmStageFilter === s ? ' active' : '')} onClick={() => goStage(s)}>
                <span className="pipeline-dot" style={{ background: STAGE_COLORS[s] }} />
                <span className="pipeline-name">{s}</span>
                <span className="pipeline-count" style={{ color: STAGE_COLORS[s] }}>{stageCounts[s]}</span>
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          <div className="side-section-label">Overview</div>
          <div className="overview-box">
            <select className="ov-filter" value={ovDur} onChange={(e) => setOvDur(e.target.value)}>
              <option value="all">All durations · {ovYear}</option>
              {TRAINING_DURATIONS.map((d) => <option key={d} value={d}>{d.replace(', 2027', '').replace(' – ', '–')}</option>)}
            </select>
            <div className="ov-row"><span>Total leads</span><strong>{totalLeads}</strong></div>
            <div className="ov-row"><span>Fully paid</span><strong className="ov-paid">{fullyPaid}</strong></div>
            <div className="ov-bar"><div className="ov-bar-fill" style={{ width: `${totalLeads ? (fullyPaid / totalLeads) * 100 : 0}%` }} /></div>
            <div className="ov-foot">{totalLeads ? Math.round((fullyPaid / totalLeads) * 100) : 0}% conversion</div>
          </div>
        </div>

        <div className="portal-user">
          <div className="portal-user-email">{user?.email || 'Preview mode'}</div>
          <button className="portal-signout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-top">
          <button className="portal-hamburger" onClick={() => setNavOpen((v) => !v)} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
          <button className="portal-back" onClick={() => navigate('/workspace')}>‹ Workspace</button>
          <h1>{TABS.find((t) => t.id === tab)?.label}</h1>
        </header>
        <div className="portal-content">
          {tab === 'enrollment' && <EnrollmentDashboard />}
          {tab === 'revenue' && <RevenueDashboard />}
          {tab === 'crm' && <CRMDashboard initialStage={crmStageFilter} onStageConsumed={() => {}} />}
          {tab === 'automation' && <AutomationDashboard />}
        </div>
      </div>
      {navOpen && <div className="portal-backdrop" onClick={() => setNavOpen(false)} />}
    </div>
  );
}

export default function Portal() {
  return (
    <LeadsProvider>
      <PortalInner />
    </LeadsProvider>
  );
}
