import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { COURSES, PROCESS_STEPS, GALLERY, HERO_PILLS, ABOUT_STATS } from '../../pages/landingData.js';
import { TRAINING_PROGRAMS, ADMISSION_REQUIREMENTS, HOW_TO_JOIN } from '../../lib/config.js';
import { useEvents } from '../../lib/EventsContext.jsx';
import StatNumber from '../StatNumber.jsx';
import EnrollForm from '../EnrollForm.jsx';
import { useSite } from './siteContext.js';

export const CORE_VALUES = [
  { l: 'P', t: 'Professionalism', d: 'We strive to be above reproach — proficient, conscientious, and business-like in dealing with those we serve.' },
  { l: 'I', t: 'Integrity', d: 'We mold individuals to lead by example: incorruptible, doing what is right regardless of pressure or personal risk.' },
  { l: 'F', t: 'Fairness', d: 'We demonstrate impartiality — free from self-interest, prejudice, or favoritism.' },
  { l: 'S', t: 'Service', d: 'Prompt responses, consistent communication, and a superior client experience. Service to others is our reason for existence.' },
  { l: 'A', t: 'Academic Excellence', d: 'We embrace continuous learning and growth, enabling talented people to realize their full potential.' },
];

const Eyebrow = ({ children, light }) => <div className={'eyebrow reveal' + (light ? ' light' : '')}><span className="eyebrow-dot"></span>{children}</div>;

/* ───────── Page banner for inner pages ───────── */
export function PageHero({ eyebrow, title, accent, subtitle, image = '/images/gallery-6.jpg' }) {
  return (
    <div className="ph" style={{ '--ph-img': `url(${image})` }}>
      <div className="ph-inner">
        <nav className="ph-crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><span>{eyebrow}</span></nav>
        <h1>{title} {accent && <span className="accent">{accent}</span>}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}

/* ───────── Home hero ───────── */
export function Hero() {
  const { goApply } = useSite();
  return (
    <div className="hero">
      <h1>Learn to Probe and Be a Purveyor of <span style={{ color: 'var(--gold)' }}>Truth</span></h1>
      <p>Advanced training in investigation, forensic science, and intelligence analysis. Recognized and accredited by government agencies across the Philippines.</p>
      <div className="hero-marquee">
        {[0, 1, 2].map((rowI) => (
          <div key={rowI} className={`hmarquee ${rowI % 2 === 0 ? 'left' : 'right'}`}>
            <div className="htrack">
              {[...HERO_PILLS, ...HERO_PILLS].map((p, i) => <span key={i} className="hpill">{p}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="hero-actions">
        <button className="cta-hero" onClick={goApply}>Start Your Journey</button>
        <Link className="cta-hero ghost" to="/calendar">View the Calendar</Link>
      </div>
      <div className="scroll-indicator">Scroll to explore</div>
    </div>
  );
}

export function StatsBand() {
  return (
    <div className="stats-band">
      <div className="stats-band-inner">
        {ABOUT_STATS.map((s) => (
          <div className="sband-item reveal" key={s.label}>
            <StatNumber className="sband-num" target={s.target} suffix={s.suffix} />
            <div className="sband-label">{s.label}</div>
            <p className="sband-note">{s.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── About ───────── */
function AboutMedia() {
  return (
    <div className="about-media reveal">
      <div className="about-photo main"><img src="/images/gallery-1.jpg" alt="PIFSA training seminar with participants and faculty" loading="lazy" /></div>
      <div className="about-photo inset"><img src="/images/gallery-2.jpg" alt="Forensic Psychology graduates at a PIFSA closing ceremony" loading="lazy" /></div>
      <div className="about-seal">
        <img src="/images/logo.png" alt="" aria-hidden="true" />
        <div><strong>PRC CPD</strong><span>Accredited Provider</span></div>
      </div>
    </div>
  );
}

const Accreditations = () => (
  <div className="accred-row reveal">
    <div className="accred"><span>SEC Registered</span><strong>CS201706492</strong></div>
    <div className="accred"><span>PRC CPD Accredited Provider</span><strong>CRM-2017-007</strong></div>
  </div>
);

export function AboutBlock() {
  return (
    <div className="site-section" id="about">
      <img src="/images/logo.png" alt="" className="about-watermark" aria-hidden="true" />
      <div className="about-grid">
        <AboutMedia />
        <div className="about-copy">
          <Eyebrow>Who we are</Eyebrow>
          <h2 className="section-title reveal">The academy for investigators and <span className="accent">forensic specialists</span></h2>
          <p className="section-subtitle reveal">The Philippine Investigation and Forensic Science Academy is the leading institution for professional development in investigative sciences.</p>
          <div className="vm-cards">
            <div className="vm-card reveal">
              <div className="vm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></div>
              <div>
                <h3>Our Vision</h3>
                <p>PIFSA envisions becoming a leading private training institution in investigation and forensic sciences — producing highly competent, ethical, and professional investigators and forensic specialists who contribute to truth, justice, public safety, and a responsive, resilient society.</p>
              </div>
            </div>
            <div className="vm-card reveal">
              <div className="vm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg></div>
              <div>
                <h3>Our Mission</h3>
                <p>PIFSA is committed to providing specialized, competency-based training and Continuing Professional Development (CPD) programs in investigation, law enforcement, public safety and security, corrections and rehabilitation, legal studies, and forensic sciences — enhancing professional competence, advancing knowledge, and promoting excellence in the criminal justice system.</p>
              </div>
            </div>
          </div>
          <Accreditations />
        </div>
      </div>
    </div>
  );
}

export function AboutTeaser() {
  return (
    <div className="site-section" id="about">
      <div className="about-grid">
        <AboutMedia />
        <div className="about-copy">
          <Eyebrow>About PIFSA</Eyebrow>
          <h2 className="section-title reveal">The academy for investigators and <span className="accent">forensic specialists</span></h2>
          <p className="section-subtitle reveal">Since 2017, PIFSA has trained law enforcers, lawyers, investigators and forensic practitioners through competency-based programs led by experienced professionals.</p>
          <ul className="teaser-points reveal">
            <li>Practitioner-led, hands-on training</li>
            <li>PRC CPD-accredited programs</li>
            <li>Online sessions with face-to-face practicals</li>
          </ul>
          <Accreditations />
          <Link className="text-link reveal" to="/about">More about PIFSA <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </div>
  );
}

export function ValuesBand() {
  return (
    <div className="values-band">
      <div className="values-inner">
        <div className="cv-head">
          <Eyebrow light>Our Core Values</Eyebrow>
          <h2 className="reveal">Five letters. <span className="accent">One standard.</span></h2>
          <p className="reveal">The PIFSA Core Values form the acronym <strong>P.I.F.S.A.</strong> — where every letter represents a pillar of the Academy’s training foundation.</p>
        </div>
        <div className="cv-grid">
          {CORE_VALUES.map((v, i) => (
            <div className="cv-card reveal" style={{ '--d': i }} key={v.l}>
              <div className="cv-letter">{v.l}</div>
              <h4>{v.t}</h4>
              <p>{v.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Calendar ───────── */
export function CalendarBlock() {
  const { displayDurations } = useEvents();
  const { goApply } = useSite();
  return (
    <div className="team-section" id="calendar">
      <div className="team-inner">
        <div className="section-header">
          <Eyebrow>2027 Calendar</Eyebrow>
          <h2 className="section-title reveal">Calendar of Professional <span className="accent">Certificate Programs</span></h2>
          <p className="section-subtitle reveal">{displayDurations.length} training durations. Pick a schedule and a program, then apply below.</p>
        </div>
        <div className="calendar-grid">
          <div className="cal-col">
            <h3 className="cal-col-title">Training Durations <span>{displayDurations.length}</span></h3>
            <div className="cal-durations">
              {displayDurations.map((d, i) => (
                <div className="cal-duration reveal" key={d.id || i}>
                  <div className="cal-badge">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <div className="cal-duration-kicker">Duration {i + 1}</div>
                    <div className="cal-duration-text">{d.date_range || d.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="cal-col">
            <h3 className="cal-col-title">Professional Certificate Programs <span>{TRAINING_PROGRAMS.length}</span></h3>
            <div className="cal-programs">
              {TRAINING_PROGRAMS.map((p) => {
                const m = p.match(/^(?:Professional Certificate in )?(.*?)\s*\(([^)]+)\)$/);
                return (
                  <div className="cal-program reveal" key={p}>
                    <span className="cal-code">{m ? m[2] : '•'}</span>
                    <span>{m ? m[1] : p}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="cal-foot">Each program is ₱25,000. Ready to enroll? <a onClick={goApply} className="cal-link">Get started →</a></p>
      </div>
    </div>
  );
}

const FE_THEMES = ['fe-navy', 'fe-teal', 'fe-maroon'];

export function FeaturedEvents({ title = 'Upcoming programs and events', subtitle = 'Registration is open. Hover a card to see the full details.' }) {
  const { displayFeatured } = useEvents();
  const { goApply } = useSite();
  const [slide, setSlide] = useState(0);
  const ref = useRef(null);
  const count = displayFeatured.length;
  const current = count ? slide % count : 0;

  useEffect(() => {
    const el = ref.current;
    const slideEl = el?.children[current];
    if (slideEl) el.scrollTo({ left: slideEl.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  }, [current]);

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  if (!count) return null;
  return (
    <div className="events-section">
      <div className="events-head">
        <Eyebrow>Featured</Eyebrow>
        <h2 className="section-title reveal">{title}</h2>
        <p className="section-subtitle reveal">{subtitle}</p>
      </div>
      <div className="fe-slideshow-outer">
        <div className="fe-slideshow" ref={ref}>
          {displayFeatured.map((fe, idx) => {
            const d = fe.details || {};
            return (
              <div className={`fe-slide${idx === current ? ' active' : ''}`} key={fe.id}>
                <div className="fe-slide-dim" />
                <div className={'featured-event ' + FE_THEMES[idx % FE_THEMES.length] + (d.image_url ? ' has-image' : '')}
                  style={d.image_url ? { backgroundImage: `url(${d.image_url})` } : {}}>
                  {d.image_url && <div className="fe-img-overlay" />}
                  <div className="fe-badge">Featured · Now Open</div>
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
                      {d.no_fee ? <div className="fe-free-badge">Free to Attend</div> : (
                        <>
                          <div className="fe-fee-label">Registration Fee</div>
                          <div className="fe-fee">₱{d.fee || '25,000'}</div>
                          <div className="fe-fee-note">Payable in full or installments</div>
                          {d.deposit && <div className="fe-dp"><span>Down payment</span><strong>₱{d.deposit}</strong></div>}
                          {d.balance && <div className="fe-dp"><span>Balance</span><strong>₱{d.balance}</strong></div>}
                        </>
                      )}
                      <button className="fe-cta" onClick={goApply}>Register Now</button>
                      {d.deadline && <div className="fe-deadline">Deadline: {d.deadline}</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {count > 1 && (
          <>
            <button className="fe-arrow fe-arrow-left" onClick={() => setSlide((current - 1 + count) % count)} aria-label="Previous">‹</button>
            <button className="fe-arrow fe-arrow-right" onClick={() => setSlide((current + 1) % count)} aria-label="Next">›</button>
            <div className="fe-dots">
              {displayFeatured.map((_, i) => <button key={i} className={'fe-dot' + (i === current ? ' active' : '')} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────── Courses ───────── */
const spotlight = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  e.currentTarget.style.setProperty('--my', (e.clientY - r.top) + 'px');
};

export function CourseGrid({ limit }) {
  const { enrollIn } = useSite();
  const list = limit ? COURSES.slice(0, limit) : COURSES;
  return (
    <div className="course-grid">
      {list.map((c, ci) => (
        <article className="course-card reveal" key={c.title} onMouseMove={spotlight}>
          <div className="course-card-top">
            <div className="course-icon" dangerouslySetInnerHTML={{ __html: c.icon }} />
            <span className="course-num" aria-hidden="true">{String(ci + 1).padStart(2, '0')}</span>
          </div>
          <div className="course-meta">
            <span className="course-code">{c.code}</span>
            <span className="course-kicker">Professional Certificate in</span>
          </div>
          <h3>{c.title.replace('Professional Certificate in ', '')}</h3>
          <p>{c.desc}</p>
          <div className="course-chips">{c.items.map((it) => <span key={it}>{it}</span>)}</div>
          <button className="course-enroll" onClick={() => enrollIn(c.code)}>Enroll in this program <span aria-hidden="true">→</span></button>
        </article>
      ))}
    </div>
  );
}

export function CoursesBlock({ teaser }) {
  return (
    <div className="site-section" id="courses">
      <div className="section-header split">
        <div>
          <Eyebrow>Courses Offered</Eyebrow>
          <h2 className="section-title reveal">{COURSES.length} programs, one <span className="accent">pursuit of truth</span></h2>
        </div>
        <p className="section-subtitle reveal">Comprehensive programs designed to develop investigative expertise across multiple disciplines.</p>
      </div>
      <CourseGrid limit={teaser ? 4 : undefined} />
      {teaser && <div className="section-more"><Link className="btn-outline" to="/courses">See all {COURSES.length} programs <span aria-hidden="true">→</span></Link></div>}
    </div>
  );
}

/* ───────── Gallery ───────── */
export function GalleryStrip() {
  const half = Math.ceil(GALLERY.length / 2);
  const rows = [GALLERY.slice(0, half), GALLERY.slice(half)];
  return (
    <div className="gallery-section">
      <div className="gallery-head">
        <Eyebrow>Gallery</Eyebrow>
        <h2 className="section-title reveal">Moments from the <span className="accent">field</span></h2>
        <p className="section-subtitle reveal">Training sessions, certification ceremonies, and partnerships from across the country.</p>
      </div>
      <div className="gmarquee">
        {rows.map((row, ri) => (
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
      <div className="section-more"><Link className="btn-outline" to="/gallery">Open the full gallery <span aria-hidden="true">→</span></Link></div>
    </div>
  );
}

export function GalleryGrid() {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % GALLERY.length);
      if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + GALLERY.length) % GALLERY.length);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="site-section">
      <div className="gal-grid">
        {GALLERY.map((g, i) => (
          <button className={'gal-item reveal' + (i % 5 === 0 ? ' wide' : '')} style={{ '--d': i % 4 }} key={g.src} onClick={() => setOpen(i)}>
            <img src={g.src} alt={g.cap} loading="lazy" />
            <span className="gal-cap">{g.cap}</span>
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={GALLERY[open].cap} onClick={() => setOpen(null)}>
          <button className="lb-close" aria-label="Close">×</button>
          <button className="lb-nav prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + GALLERY.length) % GALLERY.length); }}>‹</button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={GALLERY[open].src} alt={GALLERY[open].cap} />
            <figcaption>{GALLERY[open].cap}<span>{open + 1} / {GALLERY.length}</span></figcaption>
          </figure>
          <button className="lb-nav next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % GALLERY.length); }}>›</button>
        </div>
      )}
    </div>
  );
}

/* ───────── Process ───────── */
export function ProcessStepper() {
  const [active, setActive] = useState(0);
  const step = PROCESS_STEPS[active];
  const n = PROCESS_STEPS.length;
  return (
    <div className="steps reveal">
      <div className="steps-list" role="tablist" aria-label="Our process">
        {PROCESS_STEPS.map((s, i) => (
          <button key={s.t} role="tab" aria-selected={i === active}
            className={'steps-tab' + (i === active ? ' active' : '') + (i < active ? ' done' : '')} onClick={() => setActive(i)}>
            <span className="steps-tab-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="steps-tab-text"><small>{s.tag}</small>{s.t}</span>
            <span className="steps-tab-bar"><i onAnimationEnd={() => setActive((a) => (a + 1) % n)} /></span>
          </button>
        ))}
      </div>
      <div className="steps-panel" key={active} role="tabpanel">
        <div className="steps-panel-num" aria-hidden="true">{String(active + 1).padStart(2, '0')}</div>
        <div className="steps-panel-icon" dangerouslySetInnerHTML={{ __html: step.icon }} />
        <div className="steps-panel-tag">Step {active + 1} of {n} · {step.tag}</div>
        <h3>{step.t}</h3>
        <p>{step.d}</p>
        <div className="steps-panel-nav">
          <button onClick={() => setActive((active - 1 + n) % n)} aria-label="Previous step">←</button>
          <button onClick={() => setActive((active + 1) % n)} aria-label="Next step">→</button>
        </div>
      </div>
    </div>
  );
}

export function ProcessTeaser() {
  return (
    <div className="process-section">
      <div className="process-inner">
        <div className="section-header split">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="section-title reveal">Delivering results in <span className="accent">four moves</span></h2>
          </div>
          <p className="section-subtitle reveal">From first contact to certification, our process is built to develop real investigative capability.</p>
        </div>
        <div className="mini-steps">
          {PROCESS_STEPS.map((s, i) => (
            <div className="mini-step reveal" style={{ '--d': i }} key={s.t}>
              <span className="mini-step-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="mini-step-icon" dangerouslySetInnerHTML={{ __html: s.icon }} />
              <small>{s.tag}</small>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
        <div className="section-more"><Link className="btn-outline" to="/process">See requirements and how to join <span aria-hidden="true">→</span></Link></div>
      </div>
    </div>
  );
}

export function Requirements() {
  const { goApply } = useSite();
  return (
    <>
      <div className="req-intro reveal">
        <div className="eyebrow"><span className="eyebrow-dot"></span>Admission</div>
        <h3>What you need, and what happens next</h3>
      </div>
      <div className="req-grid">
        <div className="req-card reveal">
          <div className="req-head">
            <div className="req-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
            <div><span>Before you apply</span><h3>Requirements for Admission</h3></div>
          </div>
          <ul className="req-list">
            {ADMISSION_REQUIREMENTS.map((r, i) => <li key={i}><span className="req-num">{i + 1}</span>{r}</li>)}
          </ul>
        </div>
        <div className="req-card req-card-dark reveal">
          <div className="req-head">
            <div className="req-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg></div>
            <div><span>After you enroll</span><h3>How to Join</h3></div>
          </div>
          <ol className="join-steps">
            {HOW_TO_JOIN.map((r, i) => <li key={i}><span className="join-dot">{i + 1}</span><p>{r}</p></li>)}
          </ol>
          <button className="req-cta" onClick={goApply}>Start your application →</button>
        </div>
      </div>
    </>
  );
}

/* ───────── Application form (shown at the bottom of every page) ───────── */
export function ApplySection() {
  const { picked } = useSite();
  return (
    <div id="apply" className="contact-section">
      <div className="contact-glow" aria-hidden="true" />
      <div className="contact-wrap">
        <div className="contact-copy">
          <Eyebrow light>Apply Now</Eyebrow>
          <h2 className="reveal">Ready to advance <span className="accent">your career?</span></h2>
          <p className="contact-lead reveal">Fill out the form and we will guide you through the next steps.</p>
          <div className="contact-methods">
            <a className="contact-method reveal" href="tel:+639772778345">
              <span className="cm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg></span>
              <span><small>Call or text</small>0977 277 8345 · 0921 282 5233</span>
            </a>
            <a className="contact-method reveal" href="mailto:pifsa2017@gmail.com">
              <span className="cm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg></span>
              <span><small>Email</small>pifsa2017@gmail.com · pifsa2021@gmail.com</span>
            </a>
            <div className="contact-method reveal">
              <span className="cm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
              <span><small>Visit</small>2nd Floor BS Square Commercial Inc., Doña Soledad Ave. cor. West Service Road, Parañaque City</span>
            </div>
          </div>
          <blockquote className="contact-motto reveal">Learn to probe and be a purveyor of truth.</blockquote>
        </div>
        <div className="contact-card reveal">
          <div className="contact-card-head">
            <h3>Application form</h3>
            <p>Tell us which program and schedule you want.</p>
          </div>
          <EnrollForm picked={picked} />
          <div className="contact-points">
            <span>Practitioner-led, hands-on training</span>
            <span>Government-accredited certifications</span>
            <span>A nationwide network of professionals</span>
          </div>
        </div>
      </div>
    </div>
  );
}
