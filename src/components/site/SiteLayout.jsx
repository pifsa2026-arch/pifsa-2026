import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TRAINING_PROGRAMS } from '../../lib/config.js';
import { EventsProvider } from '../../lib/EventsContext.jsx';
import ChatWidget from '../ChatWidget.jsx';
import { ApplySection } from './sections.jsx';
import { SiteContext } from './siteContext.js';
import '../../styles/landing.css';
import '../../styles/site.css';

const NAV = [
  ['/about', 'About'],
  ['/calendar', 'Calendar'],
  ['/courses', 'Courses'],
  ['/gallery', 'Gallery'],
  ['/process', 'Process'],
];
const TITLES = { '/': '', '/about': 'About', '/calendar': '2027 Calendar', '/courses': 'Courses', '/gallery': 'Gallery', '/process': 'How to Enroll' };

// Fades in any .reveal element as it scrolls into view, including ones added after navigation
function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!('IntersectionObserver' in window)) { root.querySelectorAll('.reveal').forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    const scan = () => root.querySelectorAll('.reveal:not(.in):not([data-watched])').forEach((el) => { el.dataset.watched = '1'; io.observe(el); });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [rootRef]);
}

export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef(null);
  useReveal(mainRef);

  // New page: start at the top (or at the form when the link asks for it)
  useEffect(() => {
    setMenuOpen(false);
    if (location.hash === '#apply') setTimeout(() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' }), 60);
    else window.scrollTo({ top: 0, behavior: 'instant' });
    const t = TITLES[location.pathname];
    document.title = t ? `${t} · PIFSA` : 'PIFSA — Philippine Investigation and Forensic Science Academy';
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goApply = useCallback(() => {
    setMenuOpen(false);
    setTimeout(() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' }), 120);
  }, []);
  const enrollIn = useCallback((code) => {
    const program = TRAINING_PROGRAMS.find((p) => p.includes('(' + code + ')'));
    if (program) setPicked({ program, at: Date.now() });
    goApply();
  }, [goApply]);
  const site = useMemo(() => ({ goApply, enrollIn, picked }), [goApply, enrollIn, picked]);

  return (
    <SiteContext.Provider value={site}>
      <EventsProvider>
        <header className={'header' + (scrolled || location.pathname !== '/' ? ' solid' : '')}>
          <Link className="logo" to="/" aria-label="PIFSA home">
            <img src="/images/logo.png" alt="PIFSA seal" />
            <span>Philippine Investigation and Forensic Science Academy</span>
          </Link>
          <nav className="nav" aria-label="Main">
            {NAV.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>{label}</NavLink>)}
            <NavLink to="/verify" title="Verify a training certificate">Verify</NavLink>
          </nav>
          <div className="header-actions">
            <button className="cta-portal" onClick={() => navigate('/login')}>Portal Login</button>
            <button className="cta-header" onClick={goApply}>Enroll Now</button>
          </div>
          <button className={'nav-toggle' + (menuOpen ? ' open' : '')} aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            <span></span><span></span><span></span>
          </button>
        </header>

        <div className={'mobile-nav' + (menuOpen ? ' open' : '')}>
          <NavLink to="/" end>Home</NavLink>
          {NAV.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          <NavLink to="/verify">Verify Certificate</NavLink>
          <NavLink to="/exam-portal">Exam Portal</NavLink>
          <button className="mobile-nav-cta" onClick={goApply}>Enroll Now</button>
          <button className="mobile-nav-portal" onClick={() => navigate('/login')}>Portal Login</button>
        </div>
        {menuOpen && <div className="nav-backdrop open" onClick={() => setMenuOpen(false)} />}

        <main ref={mainRef} className="site-main">
          <Outlet />
          <ApplySection />
        </main>

        <footer className="footer">
          <div className="footer-grid">
            <div className="footer-col footer-brand-col">
              <div className="footer-brand">
                <img src="/images/logo.png" alt="PIFSA seal" />
                <div>
                  <div className="footer-brand-name">PIFSA</div>
                  <div className="footer-brand-full">Philippine Investigation and Forensic Science Academy, Inc.</div>
                </div>
              </div>
              <p className="footer-tagline">Learn to Probe and Be a Purveyor of Truth.</p>
              <a className="footer-fb" href="https://www.facebook.com/PIFSAI/" target="_blank" rel="noopener noreferrer">Follow us on Facebook →</a>
            </div>
            <div className="footer-col">
              <h4>Contact</h4>
              <ul className="footer-list">
                <li><span>Office</span>2nd Floor BS Square Commercial Inc., Doña Soledad Ave. cor. West Service Road, Parañaque City</li>
                <li><span>Mobile</span>0977 277 8345 · 0921 282 5233</li>
                <li><span>Email</span>pifsa2017@gmail.com · pifsa2021@gmail.com</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Accreditation</h4>
              <ul className="footer-list">
                <li><span>Business</span>Specialty Training Institution</li>
                <li><span>SEC Reg.</span>CS201706492</li>
                <li><span>PRC CPD</span>CRM-2017-007</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Explore</h4>
              <ul className="footer-nav">
                {NAV.map(([to, label]) => <li key={to}><Link to={to}>{label}</Link></li>)}
                <li><Link to="/verify">Verify a Certificate</Link></li>
                <li><Link to="/exam-portal">Exam Portal</Link></li>
                <li><Link to="/login">Staff Login</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-text">© {new Date().getFullYear()} Philippine Investigation and Forensic Science Academy, Inc. All rights reserved.</div>
        </footer>
        <ChatWidget />
      </EventsProvider>
    </SiteContext.Provider>
  );
}
