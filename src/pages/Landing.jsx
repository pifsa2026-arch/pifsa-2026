import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';
import { COURSES, PROCESS_STEPS, GALLERY, HERO_PILLS, ABOUT_STATS } from './landingData.js';
import { TRAINING_DURATIONS, TRAINING_PROGRAMS, ADMISSION_REQUIREMENTS, HOW_TO_JOIN } from '../lib/config.js';
import { EventsProvider, useEvents } from '../lib/EventsContext.jsx';
import StatNumber from '../components/StatNumber.jsx';
import { useCompass } from '../components/useCompass.js';
import EnrollForm from '../components/EnrollForm.jsx';

const NAV = ['about', 'calendar', 'courses', 'gallery', 'process', 'contact'];
const CIRC = 2820;

export default function Landing() {
  return (
    <EventsProvider>
      <LandingInner />
    </EventsProvider>
  );
}

function LandingInner() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { displayDurations, displayFeatured } = useEvents();
  const { wrapRef, active, goToStep } = useCompass(PROCESS_STEPS.length);
  const [slide, setSlide] = useState(0);
  const slideshowRef = useRef(null);

  const FE_THEMES = ['fe-navy', 'fe-teal', 'fe-maroon'];

  // Scroll slideshow to the active slide
  useEffect(() => {
    const el = slideshowRef.current;
    if (!el) return;
    const slideEl = el.children[slide];
    if (!slideEl) return;
    el.scrollTo({ left: slideEl.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  }, [slide]);

  // Auto-advance the featured slideshow (only when more than one)
  useEffect(() => {
    if (displayFeatured.length <= 1) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % displayFeatured.length), 6000);
    return () => clearInterval(t);
  }, [displayFeatured.length]);

  // Keep slide index in range if the list changes
  useEffect(() => {
    if (slide >= displayFeatured.length) setSlide(0);
  }, [displayFeatured.length, slide]);

  const go = (id) => {
    setMenuOpen(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), menuOpen ? 200 : 0);
  };

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const step = PROCESS_STEPS[active];
  const half = Math.ceil(GALLERY.length / 2);
  const row1 = GALLERY.slice(0, half);
  const row2 = GALLERY.slice(half);

  return (
    <>
      {/* Header */}
      <div className="header">
        <a className="logo" href="https://www.facebook.com/PIFSAI/" target="_blank" rel="noopener noreferrer">
          <img src="/images/logo.png" alt="PIFSA seal" style={{ height: 44, width: 'auto', verticalAlign: 'middle', marginRight: 10 }} />
          <span style={{ verticalAlign: 'middle' }}>Philippine Investigation and Forensic Science Academy</span>
        </a>
        <div className="nav">
          {NAV.map((id) => (
            <a key={id} onClick={() => go(id)}>{id[0].toUpperCase() + id.slice(1)}</a>
          ))}
        </div>
        <div className="header-actions">
          <button className="cta-portal" onClick={() => navigate('/login')}>Portal Login</button>
          <button className="cta-header" onClick={() => go('contact')}>Enroll Now</button>
        </div>
        <button
          className={'nav-toggle' + (menuOpen ? ' open' : '')}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span></span><span></span><span></span>
        </button>
      </div>
      <div className={'mobile-nav' + (menuOpen ? ' open' : '')}>
        {NAV.map((id) => (
          <a key={id} onClick={() => go(id)}>{id[0].toUpperCase() + id.slice(1)}</a>
        ))}
        <button className="mobile-nav-cta" onClick={() => go('contact')}>Enroll Now</button>
        <button className="mobile-nav-portal" onClick={() => { setMenuOpen(false); navigate('/login'); }}>Portal Login</button>
      </div>
      {menuOpen && <div className="nav-backdrop open" onClick={() => setMenuOpen(false)} />}

      {/* Hero */}
      <div className="hero">
        <h1>Learn to Probe and Be a Purveyor of <span style={{ color: 'var(--gold)' }}>Truth</span></h1>
        <p>Advanced training in investigation, forensic science, and intelligence analysis. Recognized and accredited by government agencies across the Philippines.</p>
        <div className="hero-marquee">
          {[0, 1, 2].map((rowI) => (
            <div key={rowI} className={`hmarquee ${rowI % 2 === 0 ? 'left' : 'right'}`}>
              <div className="htrack">
                {[...HERO_PILLS, ...HERO_PILLS].map((p, i) => (
                  <span key={i} className="hpill">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="cta-hero" onClick={() => go('contact')}>Start Your Journey</button>
        <div className="scroll-indicator">Scroll to explore</div>
      </div>

      {/* About */}
      <section id="about">
        <img src="/images/logo.png" alt="" className="about-watermark" aria-hidden="true" />
        <div className="section-header">
          <h2 className="section-title">About PIFSA</h2>
          <p className="section-subtitle">The Philippine Investigation and Forensic Science Academy is the leading institution for professional development in investigative sciences.</p>
        </div>
        <div className="about-grid">
          <div>
            <h3>Our Vision</h3>
            <p>PIFSA envisions becoming a leading private training institution in investigation and forensic sciences — producing highly competent, ethical, and professional investigators and forensic specialists who contribute to truth, justice, public safety, and a responsive, resilient society.</p>
            <h3>Our Mission</h3>
            <p>PIFSA is committed to providing specialized, competency-based training and Continuing Professional Development (CPD) programs in investigation, law enforcement, public safety and security, corrections and rehabilitation, legal studies, and forensic sciences — enhancing professional competence, advancing knowledge, and promoting excellence in the criminal justice system.</p>
            <h3>Accreditations</h3>
            <p>SEC-registered (CS201706492), PRC CPD-accredited provider (CRM-2017-007), and PhilHealth-registered (001000054519), recognized across the Philippine criminal justice and law enforcement community.</p>
          </div>
          <div className="about-right">
            <div className="about-photo">
              <img src="/images/gallery-1.jpg" alt="PIFSA training seminar with participants and faculty" loading="lazy" />
            </div>
            <div className="stat-grid">
              {ABOUT_STATS.map((s) => (
                <div className="stat-card" key={s.label}>
                  <StatNumber className="stat-number count-num" target={s.target} suffix={s.suffix} />
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div className="core-values">
          <div className="cv-head">
            <h3>Our Core Values</h3>
            <p>The PIFSA Core Values form the acronym <strong>P.I.F.S.A.</strong> — where every letter represents a pillar of the Academy's training foundation.</p>
          </div>
          <div className="cv-grid">
            {[
              { l: 'P', t: 'Professionalism', d: 'We strive to be above reproach — proficient, conscientious, and business-like in dealing with those we serve.' },
              { l: 'I', t: 'Integrity', d: 'We mold individuals to lead by example: incorruptible, doing what is right regardless of pressure or personal risk.' },
              { l: 'F', t: 'Fairness', d: 'We demonstrate impartiality — free from self-interest, prejudice, or favoritism.' },
              { l: 'S', t: 'Service', d: 'Prompt responses, consistent communication, and a superior client experience. Service to others is our reason for existence.' },
              { l: 'A', t: 'Academic Excellence', d: 'We embrace continuous learning and growth, enabling talented people to realize their full potential.' },
            ].map((v) => (
              <div className="cv-card" key={v.l}>
                <div className="cv-letter">{v.l}</div>
                <div className="cv-body">
                  <h4>{v.t}</h4>
                  <p>{v.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="calendar" className="team-section">
        <div className="team-inner">
          <div className="section-header">
            <div className="team-eyebrow"><span className="team-eyebrow-dot"></span>2027 Calendar</div>
            <h2 className="section-title">Calendar of Professional <span className="accent">Certificate Programs</span></h2>
            <p className="section-subtitle">Six training durations across 2027. Each learner may take one or more programs per duration.</p>
          </div>

          <div className="calendar-grid">
            <div className="cal-col">
              <h3 className="cal-col-title">Training Duration</h3>
              <div className="cal-durations">
                {displayDurations.map((d, i) => (
                  <div className="cal-duration" key={d.id || i}>
                    <div className="cal-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
                    </div>
                    <div className="cal-duration-text">{d.date_range || d.title}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="cal-col">
              <h3 className="cal-col-title">Training Programs</h3>
              <div className="cal-programs">
                {TRAINING_PROGRAMS.map((p) => (
                  <div className="cal-program" key={p}>
                    <span className="cal-dot" />
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Featured event slideshow */}
          <div className="fe-slideshow-outer">
          <div className="fe-slideshow" ref={slideshowRef}>
              {displayFeatured.map((fe, idx) => {
                const d = fe.details || {};
                const theme = FE_THEMES[idx % FE_THEMES.length];
                return (
                  <div className={`fe-slide${idx === slide ? ' active' : ''}`} key={fe.id}>
                    <div className="fe-slide-dim" />
                    <div
                      className={'featured-event ' + theme + (d.image_url ? ' has-image' : '')}
                      style={d.image_url ? { backgroundImage: `url(${d.image_url})` } : {}}
                    >
                      {d.image_url && <div className="fe-img-overlay" />}
                      <div className="fe-badge">Featured · Now Open</div>

                      {/* Right: all details float over the darkened side */}
                      <div className="fe-body">
                        <div className="fe-main">
                          <h3>{fe.title}</h3>
                          {d.class && <div className="fe-class">{d.class}</div>}
                          {d.description && <p className="fe-desc">{d.description}</p>}
                          <div className="fe-meta">
                            {fe.date_range && <div className="fe-meta-item"><span className="fe-meta-label">Duration</span>{fe.date_range}</div>}
                            {d.modality && <div className="fe-meta-item"><span className="fe-meta-label">Modality</span>{d.modality}</div>}
                            {d.saturdays && <div className="fe-meta-item"><span className="fe-meta-label">Saturdays</span>{d.saturdays}</div>}
                            {d.facetoface && <div className="fe-meta-item"><span className="fe-meta-label">Face-to-face</span>{d.facetoface}</div>}
                          </div>
                          {d.who && <p className="fe-who"><strong>Who may join:</strong> {d.who}</p>}
                        </div>
                        <div className="fe-side">
                          {d.no_fee ? (
                            <div className="fe-free-badge">Free to Attend</div>
                          ) : (
                            <>
                              <div className="fe-fee-label">Registration Fee</div>
                              <div className="fe-fee">₱{d.fee || '25,000'}</div>
                              <div className="fe-fee-note">Payable in full or installments</div>
                              {d.deposit && <div className="fe-dp"><span>Down payment</span><strong>₱{d.deposit}</strong></div>}
                              {d.balance && <div className="fe-dp"><span>Balance</span><strong>₱{d.balance}</strong></div>}
                            </>
                          )}
                          <button className="fe-cta" onClick={() => go('contact')}>Register Now</button>
                          {d.deadline && <div className="fe-deadline">Deadline: {d.deadline}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          {displayFeatured.length > 1 && (
            <>
              <button className="fe-arrow fe-arrow-left" onClick={() => setSlide((s) => (s - 1 + displayFeatured.length) % displayFeatured.length)} aria-label="Previous">‹</button>
              <button className="fe-arrow fe-arrow-right" onClick={() => setSlide((s) => (s + 1) % displayFeatured.length)} aria-label="Next">›</button>
              <div className="fe-dots">
                {displayFeatured.map((_, i) => (
                  <button key={i} className={'fe-dot' + (i === slide ? ' active' : '')} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`} />
                ))}
              </div>
            </>
          )}
          </div>

          <p className="cal-foot">Each program is ₱25,000. Ready to enroll? <a onClick={() => go('contact')} className="cal-link">Get started →</a></p>
        </div>
      </section>

      {/* Courses */}
      <section id="courses">
        <div className="section-header">
          <h2 className="section-title">Courses Offered</h2>
          <p className="section-subtitle">Comprehensive programs designed to develop investigative expertise across multiple disciplines.</p>
        </div>
        <div className="courses-container">
          {COURSES.map((c) => (
            <div className="course-service" key={c.title}>
              <div className="course-icon" dangerouslySetInnerHTML={{ __html: c.icon }} />
              <div className="course-main">
                <div className="course-code">{c.code}</div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
              <div className="course-items">
                {c.items.map((it, i) => (
                  <div className="course-item" key={it}><span className="number">{String(i + 1).padStart(2, '0')}</span>{it}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <div className="gallery-section">
        <section id="gallery">
          <div className="gallery-head">
            <div className="team-eyebrow"><span className="team-eyebrow-dot"></span>Gallery</div>
            <h2 className="section-title">Moments from the <span className="accent">field</span></h2>
            <p className="section-subtitle">Training sessions, certification ceremonies, and partnerships from across the country.</p>
          </div>
        </section>
        <div className="gmarquee">
          {[row1, row2].map((row, ri) => (
            <div key={ri} className={`gmarquee-row gmarquee-row-${ri + 1}`}>
              {[...row, ...row].map((g, i) => (
                <div className="gcard" key={i}>
                  <img src={g.src} alt={g.cap} loading="lazy" />
                  <div className="gcard-cap">{g.cap}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Process (compass) */}
      <section id="process" className="process-section">
        <div className="section-header">
          <h2 className="section-title">Delivering results in <span className="accent">four moves</span></h2>
          <p className="section-subtitle">From first contact to certification, our process is built to develop real investigative capability.</p>
        </div>
        <div className="compass-wrap" ref={wrapRef}>
          <div className="compass-sticky">
            <img src="/images/justice.png" alt="" className="process-watermark" aria-hidden="true" />
            <div className="compass-progress">
              <div className="cprog-bar"><div className="cprog-fill" style={{ width: `${(active + 1) / PROCESS_STEPS.length * 100}%` }} /></div>
              <div className="cprog-label"><span>{String(active + 1).padStart(2, '0')}</span> / 04</div>
            </div>
            <div className="compass-stage">
              <div className="compass-dial" style={{ transform: `rotate(${-active * 30}deg)` }}>
                <svg className="compass-arc" viewBox="0 0 900 900">
                  <circle className="carc-track" cx="450" cy="450" r="449" />
                  <circle className="carc-fill" cx="450" cy="450" r="449"
                    style={{ strokeDashoffset: CIRC - (CIRC * (active + 1) / PROCESS_STEPS.length * 0.25) - (CIRC * 0.75) }} />
                </svg>
                {PROCESS_STEPS.map((s, i) => (
                  <div className={'compass-step' + (i === active ? ' active' : '')} style={{ '--i': i }} key={i}>
                    <div className="cstep-dot"><span>{i + 1}</span></div>
                  </div>
                ))}
              </div>
              <div className="compass-center">
                <div className="compass-icon" dangerouslySetInnerHTML={{ __html: step.icon }} />
                <div className="compass-label">Step</div>
                <div className="compass-num">{active + 1}</div>
                <div className="compass-content">
                  <div className="compass-tag">{step.tag}</div>
                  <h3>{step.t}</h3>
                  <p>{step.d}</p>
                </div>
              </div>
            </div>
            <div className="compass-nav">
              {PROCESS_STEPS.map((s, i) => (
                <button key={i} className={'cnav-item' + (i === active ? ' active' : '')} onClick={() => goToStep(i)}>
                  <span className="cnav-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="cnav-t">{s.t}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="process-mobile">
          {PROCESS_STEPS.map((s, i) => (
            <div className="pm-step" key={i}>
              <div className="pm-num">{i + 1}</div>
              <div>
                <div className="pm-tag">{s.tag}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Requirements & How to Join */}
        <div className="req-block">
          <div className="req-grid">
            <div className="req-card">
              <div className="req-head">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <h3>Requirements for Admission</h3>
              </div>
              <ul className="req-list">
                {ADMISSION_REQUIREMENTS.map((r, i) => (
                  <li key={i}><span className="req-num">{i + 1}</span>{r}</li>
                ))}
              </ul>
            </div>
            <div className="req-card req-card-dark">
              <div className="req-head">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                <h3>How to Join</h3>
              </div>
              <ul className="req-list req-list-check">
                {HOW_TO_JOIN.map((r, i) => (
                  <li key={i}><span className="req-check">✓</span>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ padding: 0 }}>
        <div className="contact-wrapper">
          <div className="contact-inner">
            <h2>Get Started</h2>
            <p>Ready to advance your career? Fill out the form below and we will guide you through the next steps.</p>
            <EnrollForm />
            <div className="contact-info">
              <p>Mobile: 0977 277 8345 · 0921 282 5233</p>
              <p>Email: pifsa2017@gmail.com · pifsa2021@gmail.com</p>
              <p>Address: 2nd Floor BS Square Commercial Inc., Doña Soledad Ave. cor. West Service Road, Parañaque City</p>
            </div>
          </div>
          <div className="contact-quote">
            <div className="cq-mark">&ldquo;</div>
            <blockquote className="cq-text">Learn to probe and be a purveyor of truth.</blockquote>
            <p className="cq-sub">The guiding principle behind every PIFSA program — training investigators who pursue facts with integrity, precision, and purpose.</p>
            <div className="cq-divider"></div>
            <div className="cq-points">
              <div className="cq-point"><span className="cq-check">&#10003;</span>Practitioner-led, hands-on training</div>
              <div className="cq-point"><span className="cq-check">&#10003;</span>Government-accredited certifications</div>
              <div className="cq-point"><span className="cq-check">&#10003;</span>A nationwide network of professionals</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="footer">
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
              <li><span>PhilHealth</span>001000054519</li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Explore</h4>
            <ul className="footer-nav">
              <li><a onClick={() => go('about')}>About</a></li>
              <li><a onClick={() => go('calendar')}>2027 Calendar</a></li>
              <li><a onClick={() => go('courses')}>Courses</a></li>
              <li><a onClick={() => go('contact')}>Enroll</a></li>
              <li><a onClick={() => navigate('/login')}>Portal Login</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-text">© {new Date().getFullYear()} Philippine Investigation and Forensic Science Academy, Inc. All rights reserved.</div>
      </div>
    </>
  );
}
