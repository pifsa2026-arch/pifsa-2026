import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { useIsAdmin } from '../lib/useIsAdmin.js';
import { EventsProvider, useEvents } from '../lib/EventsContext.jsx';
import '../styles/portal.css';
import '../styles/admin.css';

export default function AdminConsole() {
  return (
    <EventsProvider>
      <AdminInner />
    </EventsProvider>
  );
}

function AdminInner() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, checked } = useIsAdmin();
  const { events, loading, connected, addEvent, updateEvent, deleteEvent } = useEvents();
  const [editing, setEditing] = useState(null);

  if (checked && !isAdmin) {
    return (
      <div className="admin-denied">
        <div className="admin-denied-card">
          <div className="admin-denied-icon">🔒</div>
          <h2>Admin access required</h2>
          <p>Your account isn't on the admin list. Ask an administrator to add your email to the <code>admins</code> table in Supabase.</p>
          <button className="portal-btn" onClick={() => navigate('/workspace')}>Back to workspace</button>
        </div>
      </div>
    );
  }

  const durations = events.filter((e) => e.kind === 'duration');
  const featured = events.filter((e) => e.kind === 'featured');

  const newDuration = () => setEditing({ kind: 'duration', title: '', date_range: '', featured: false, details: {}, sort_order: durations.length });
  const newFeatured = () => setEditing({ kind: 'featured', title: '', date_range: '', featured: true, details: {}, sort_order: featured.length });

  const saveEvent = async (ev) => {
    if (ev.id) await updateEvent(ev.id, { title: ev.title, date_range: ev.date_range, kind: ev.kind, featured: ev.featured, details: ev.details, sort_order: ev.sort_order });
    else await addEvent({ title: ev.title, date_range: ev.date_range, kind: ev.kind, featured: ev.featured, details: ev.details, sort_order: ev.sort_order });
    setEditing(null);
  };

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="admin-top-left">
          <img src="/images/logo.png" alt="PIFSA" />
          <div>
            <div className="admin-top-title">Admin Console</div>
            <div className="admin-top-sub">Landing page content</div>
          </div>
        </div>
        <div className="admin-top-right">
          <button className="admin-switch" onClick={() => navigate('/portal')}>CRM System</button>
          <button className="admin-switch" onClick={() => navigate('/workspace')}>Workspace</button>
          <button className="portal-signout" onClick={async () => { await signOut(); navigate('/'); }}>Sign out</button>
        </div>
      </header>

      <div className="admin-body">
        {!connected && <div className="notice">Not connected to Supabase, or the <code>events</code> table is missing. Run the schema SQL, then reload. Changes here won't persist until connected.</div>}

        <div className="admin-intro">
          <h1>Calendar &amp; Events</h1>
          <p>Edit what appears in the landing page's 2027 Calendar and featured program. Changes go live immediately for visitors.</p>
        </div>

        {loading ? <div className="panel-loading">Loading…</div> : (
          <>
            {/* Featured events */}
            <div className="admin-section">
              <div className="admin-section-head">
                <h2>Featured / Upcoming Programs</h2>
                <button className="portal-btn sm" onClick={newFeatured}>＋ Add Featured Event</button>
              </div>
              {featured.length === 0 && <div className="admin-empty">No featured events yet. The landing page shows the built-in default until you add one.</div>}
              <div className="admin-cards">
                {featured.map((ev) => (
                  <div className="admin-event-card featured" key={ev.id}>
                    {ev.details?.image_url && (
                      <div className="admin-event-img">
                        <img src={ev.details.image_url} alt={ev.title} />
                      </div>
                    )}
                    <div className="admin-event-badge">Featured</div>
                    <h3>{ev.title || '(untitled)'}</h3>
                    <div className="admin-event-class">{ev.details?.class}</div>
                    <div className="admin-event-dates">{ev.date_range}</div>
                    <div className="admin-event-actions">
                      <button onClick={() => setEditing(ev)}>Edit</button>
                      <button className="del" onClick={() => deleteEvent(ev.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Training durations */}
            <div className="admin-section">
              <div className="admin-section-head">
                <h2>Training Durations</h2>
                <button className="portal-btn sm" onClick={newDuration}>＋ Add Duration</button>
              </div>
              {durations.length === 0 && <div className="admin-empty">No durations added. The landing page shows the built-in 2027 schedule until you add your own.</div>}
              <div className="admin-duration-list">
                {durations.map((ev) => (
                  <div className="admin-duration-row" key={ev.id}>
                    <span className="admin-dur-text">{ev.date_range || ev.title}</span>
                    <div className="admin-event-actions">
                      <button onClick={() => setEditing(ev)}>Edit</button>
                      <button className="del" onClick={() => deleteEvent(ev.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {editing && <EventEditor ev={editing} onCancel={() => setEditing(null)} onSave={saveEvent} />}
    </div>
  );
}

function EventEditor({ ev, onCancel, onSave }) {
  const [form, setForm] = useState({ ...ev, details: ev.details || {} });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setD = (k, v) => setForm((f) => ({ ...f, details: { ...f.details, [k]: v } }));
  const isFeatured = form.kind === 'featured';
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setD('image_url', ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{form.id ? 'Edit' : 'Add'} {isFeatured ? 'Featured Event' : 'Training Duration'}</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          {isFeatured ? (
            <>
              <div className="field-row"><label>Program Title</label><input className="portal-field" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Professional Certificate in Forensic Accounting and Investigation" /></div>
              <div className="field-2col">
                <div className="field-row"><label>Class Code</label><input className="portal-field" value={form.details.class || ''} onChange={(e) => setD('class', e.target.value)} placeholder="e.g. PCFAI Class 2026-01" /></div>
                <div className="field-row"><label>Date Range</label><input className="portal-field" value={form.date_range || ''} onChange={(e) => set('date_range', e.target.value)} placeholder="e.g. Aug 29 – Oct 17, 2026" /></div>
              </div>
              <div className="field-row"><label>Description</label><textarea className="portal-field" rows={3} value={form.details.description || ''} onChange={(e) => setD('description', e.target.value)} /></div>

              {/* Event banner image */}
              <div className="field-row">
                <label>Event Banner / Flyer</label>
                <div className="img-upload-area" onClick={() => fileRef.current?.click()}>
                  {form.details.image_url ? (
                    <img src={form.details.image_url} alt="banner preview" className="img-upload-preview" />
                  ) : (
                    <div className="img-upload-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                      <span>Click to upload photo</span>
                      <span className="img-upload-hint">PNG, JPG, WEBP · landscape orientation recommended</span>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                </div>
                {form.details.image_url && (
                  <button className="img-remove-btn" onClick={() => setD('image_url', '')}>✕ Remove photo</button>
                )}
              </div>

              <div className="field-2col">
                <div className="field-row"><label>Modality</label><input className="portal-field" value={form.details.modality || ''} onChange={(e) => setD('modality', e.target.value)} placeholder="Hybrid / Blended" /></div>
                <div className="field-row"><label>Saturdays</label><input className="portal-field" value={form.details.saturdays || ''} onChange={(e) => setD('saturdays', e.target.value)} placeholder="8:30 AM – 5:00 PM" /></div>
              </div>
              <div className="field-2col">
                <div className="field-row"><label>Face-to-face</label><input className="portal-field" value={form.details.facetoface || ''} onChange={(e) => setD('facetoface', e.target.value)} placeholder="Oct 15 – 17, 2026 · Manila" /></div>
                <div className="field-row"><label>Registration Deadline</label><input className="portal-field" value={form.details.deadline || ''} onChange={(e) => setD('deadline', e.target.value)} placeholder="7:00 PM · Aug 28, 2026" /></div>
              </div>
              <div className="field-row"><label>Who May Join</label><textarea className="portal-field" rows={2} value={form.details.who || ''} onChange={(e) => setD('who', e.target.value)} /></div>
              <div className="field-3col">
                <div className="field-row"><label>Fee (₱)</label><input className="portal-field" value={form.details.fee || ''} onChange={(e) => setD('fee', e.target.value)} placeholder="25,000" /></div>
                <div className="field-row"><label>Down payment</label><input className="portal-field" value={form.details.deposit || ''} onChange={(e) => setD('deposit', e.target.value)} placeholder="5,000" /></div>
                <div className="field-row"><label>Balance</label><input className="portal-field" value={form.details.balance || ''} onChange={(e) => setD('balance', e.target.value)} placeholder="20,000" /></div>
              </div>
            </>
          ) : (
            <div className="field-row"><label>Duration (date range)</label><input className="portal-field" value={form.date_range || ''} onChange={(e) => { set('date_range', e.target.value); set('title', e.target.value); }} placeholder="e.g. January 30 – March 20, 2027" /></div>
          )}
        </div>
        <div className="modal-foot">
          <div className="modal-foot-right">
            <button className="portal-btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="portal-btn" onClick={() => onSave(form)} disabled={isFeatured ? !form.title.trim() : !form.date_range?.trim()}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
