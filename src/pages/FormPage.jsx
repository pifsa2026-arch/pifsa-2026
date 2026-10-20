import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { isEmpty, isFileAnswer, programName } from '../lib/forms.js';
import { newId } from '../lib/examParser.js';
import { TRAINING_PROGRAMS, TRAINING_DURATIONS, programsForDuration, durationNote } from '../lib/config.js';
import '../styles/form-page.css';

const draftKey = (slug) => `pifsa_form_${slug}`;
const readDraft = (slug) => { try { return JSON.parse(localStorage.getItem(draftKey(slug))) || {}; } catch { return {}; } };
const saveDraft = (slug, v) => { try { localStorage.setItem(draftKey(slug), JSON.stringify(v)); } catch { /* storage blocked */ } };
const clearDraft = (slug) => { try { localStorage.removeItem(draftKey(slug)); } catch { /* ignore */ } };

// Program and duration questions use the CRM lists so leads fill in exactly; each narrows the other
function optionsFor(q, answers, questions) {
  if (q.lead_field === 'program') {
    const dq = questions.find((x) => x.lead_field === 'training_duration');
    const d = dq ? answers[dq.id] : '';
    return typeof d === 'string' && d ? programsForDuration(d) : TRAINING_PROGRAMS;
  }
  if (q.lead_field === 'training_duration') {
    const pq = questions.find((x) => x.lead_field === 'program');
    const p = pq ? answers[pq.id] : null;
    const picked = Array.isArray(p) ? p : p ? [p] : [];
    return TRAINING_DURATIONS.filter((d) => picked.every((x) => programsForDuration(d).includes(x)));
  }
  return q.options;
}
const optionLabel = (q, o) => (q.lead_field === 'training_duration' ? o + durationNote(o) : o);

// Lines starting with "* " or "- " become bullet points
function RichText({ text }) {
  const out = [];
  let list = null;
  String(text || '').split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { list = null; return; }
    const bullet = line.match(/^[*•-]\s+(.*)$/);
    if (bullet) {
      if (!list) { list = []; out.push(<ul key={`u${i}`}>{list}</ul>); }
      list.push(<li key={i}>{bullet[1]}</li>);
    } else {
      list = null;
      out.push(<p key={i}>{line}</p>);
    }
  });
  return <div className="gf-rich">{out}</div>;
}

function TrainingDetails({ d }) {
  if (!d || !(d.program || d.training_duration || d.blocks?.length)) return null;
  return (
    <div className="gf-details">
      <div className="gf-details-title">Training Details and Registration Form</div>
      {d.program && (
        <div className="gf-detail"><b>Training Program</b><p>{programName(d.program)}{d.class_code ? ` (${d.class_code})` : ''}</p></div>
      )}
      {d.training_duration && <div className="gf-detail"><b>Training Duration</b><p>{d.training_duration}</p></div>}
      {(d.blocks || []).filter((b) => b.label || b.text).map((b) => (
        <div className="gf-detail" key={b.id}>{b.label && <b>{b.label}</b>}<RichText text={b.text} /></div>
      ))}
    </div>
  );
}

const MAX_UPLOAD = 10 * 1024 * 1024;

// Uploads straight to private storage; the answer keeps the stored file's path for staff to open
function FileField({ q, value, slug, onChange, onBusy }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState('');

  const pick = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_UPLOAD) { setErr('That file is larger than 10 MB.'); return; }
    if (!/^image\//.test(file.type) && file.type !== 'application/pdf') { setErr('Upload an image (JPG, PNG) or a PDF.'); return; }
    setErr(''); setBusy(true); onBusy(1);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80);
    const path = `${slug}/${newId()}-${safe}`;
    const { error } = await supabase.storage.from('form-uploads').upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false); onBusy(-1);
    if (error) { setErr('Upload failed: ' + error.message); return; }
    setPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
    onChange({ path, name: file.name, size: file.size, type: file.type });
  };

  return (
    <div className="gf-file">
      {isFileAnswer(value) ? (
        <div className="gf-file-done">
          {preview ? <img src={preview} alt="" /> : <span className="gf-file-icon">📄</span>}
          <div><b>{value.name}</b><small>{Math.max(1, Math.round(value.size / 1024))} KB · uploaded</small></div>
          <button type="button" onClick={() => { onChange(null); setPreview(''); }}>Remove</button>
        </div>
      ) : (
        <label className={'gf-file-pick' + (busy ? ' busy' : '')}>
          <input type="file" accept="image/*,application/pdf" onChange={pick} disabled={busy} aria-label={q.label} />
          <span>{busy ? 'Uploading…' : '⬆ Add file'}</span>
        </label>
      )}
      {err && <div className="gf-err" role="alert">⚠ {err}</div>}
    </div>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+()\d\s-]{7,20}$/;

function problemFor(q, v) {
  if (q.required && isEmpty(v)) return 'This is a required question.';
  if (isEmpty(v)) return '';
  if (q.type === 'email' && !EMAIL.test(String(v).trim())) return 'Enter a valid email address.';
  if (q.type === 'phone' && !PHONE.test(String(v).trim())) return 'Enter a valid phone number.';
  if (q.type === 'number' && Number.isNaN(Number(v))) return 'Enter a number.';
  return '';
}

// The permanent /apply link shows the form marked as main, or else the newest open form
async function loadForm(slug) {
  if (slug) return (await supabase.from('forms').select('*').eq('slug', slug).maybeSingle()).data;
  const primary = (await supabase.from('forms').select('*').eq('is_primary', true).maybeSingle()).data;
  if (primary) return primary;
  return (await supabase.from('forms').select('*').eq('is_open', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()).data;
}

export default function FormPage() {
  const params = useParams();
  const [resolvedSlug, setResolvedSlug] = useState(params.slug || null);
  const slug = resolvedSlug || params.slug || 'apply';
  const [form, setForm] = useState(undefined); // undefined = loading, null = not found
  const [answers, setAnswers] = useState(() => readDraft(slug));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | done
  const [serverError, setServerError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) { setForm(null); return; }
    loadForm(params.slug).then((data) => {
      setForm(data || null);
      if (data) {
        document.title = `${data.title} · PIFSA`;
        setResolvedSlug(data.slug);
        setAnswers((a) => (Object.keys(a).length ? a : readDraft(data.slug)));
      }
    });
  }, [params.slug]);

  useEffect(() => { if (form && status !== 'done') saveDraft(slug, answers); }, [answers, form, slug, status]);

  const set = (q, v) => {
    setAnswers((a) => ({ ...a, [q.id]: v }));
    if (errors[q.id]) setErrors((e) => ({ ...e, [q.id]: problemFor(q, v) }));
  };
  const toggle = (q, opt) => {
    const cur = Array.isArray(answers[q.id]) ? answers[q.id] : [];
    set(q, cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const next = {};
    form.questions.filter((q) => q.type !== 'section').forEach((q) => { const p = problemFor(q, answers[q.id]); if (p) next[q.id] = p; });
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) { document.getElementById(`fq-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    setStatus('sending');
    const payload = Object.fromEntries(Object.entries(answers).filter(([k]) => form.questions.some((q) => q.id === k)));
    const { data, error } = await supabase.rpc('submit_form', { p_slug: slug, p_answers: payload });
    if (error) { setStatus('idle'); setServerError(error.message); return; }
    clearDraft(slug);
    setMessage(data?.message || 'Thank you! Your response has been recorded.');
    setStatus('done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (form === undefined) return <div className="gf-loading">Loading form…</div>;

  const color = form?.theme_color || '#00264d';
  const shell = (children) => (
    <div className="gf" style={{ '--fc': color }}>
      <div className="gf-wrap">
        {form?.banner_url && <div className="gf-banner"><img src={form.banner_url} alt="" /></div>}
        {children}
        <footer className="gf-foot">
          <img src="/images/logo.png" alt="" />
          <span>Philippine Investigation and Forensic Science Academy</span>
          <small>Never submit passwords through this form.</small>
        </footer>
      </div>
    </div>
  );

  if (!form) return shell(<div className="gf-card gf-head"><h1>Form not found</h1><p>This link may be wrong or the form was removed. Please contact PIFSA.</p></div>);
  if (!form.is_open) return shell(<div className="gf-card gf-head"><h1>{form.title}</h1><p className="gf-desc">{form.closed_message || 'This form is no longer accepting responses.'}</p></div>);
  if (status === 'done') {
    return shell(
      <div className="gf-card gf-head">
        <h1>{form.title}</h1>
        <p className="gf-desc">{message}</p>
        <button className="gf-link" onClick={() => { setAnswers({}); setErrors({}); setStatus('idle'); }}>Submit another response</button>
      </div>
    );
  }

  const hasRequired = form.questions.some((q) => q.required && q.type !== 'section');
  return shell(
    <form onSubmit={submit} noValidate>
      <div className="gf-card gf-head">
        <h1>{form.title}</h1>
        <TrainingDetails d={form.details} />
        {form.description && <p className="gf-desc">{form.description}</p>}
        {hasRequired && <div className="gf-req-note"><span>*</span> Indicates required question</div>}
      </div>

      {form.questions.map((q) => {
        if (q.type === 'section') {
          return (
            <div key={q.id} className="gf-card gf-section">
              <h2>{q.label}</h2>
              {q.help && <p>{q.help}</p>}
            </div>
          );
        }
        const v = answers[q.id];
        const opts = optionsFor(q, answers, form.questions);
        const err = errors[q.id];
        const inputId = `fi-${q.id}`;
        return (
          <div key={q.id} id={`fq-${q.id}`} className={'gf-card gf-q' + (err ? ' err' : '')}>
            <label className="gf-label" htmlFor={['mc', 'checkbox'].includes(q.type) ? undefined : inputId}>
              {q.label}{q.required && <span className="gf-star" aria-label="required"> *</span>}
            </label>
            {q.help && <div className="gf-help">{q.help}</div>}

            {q.type === 'short' && <input id={inputId} className="gf-input" value={v || ''} onChange={(e) => set(q, e.target.value)} placeholder="Your answer" maxLength={500} />}
            {q.type === 'email' && <input id={inputId} type="email" autoComplete="email" className="gf-input" value={v || ''} onChange={(e) => set(q, e.target.value)} placeholder="name@example.com" maxLength={200} />}
            {q.type === 'phone' && <input id={inputId} type="tel" autoComplete="tel" className="gf-input" value={v || ''} onChange={(e) => set(q, e.target.value)} placeholder="09XX XXX XXXX" maxLength={30} />}
            {q.type === 'number' && <input id={inputId} inputMode="decimal" className="gf-input" value={v || ''} onChange={(e) => set(q, e.target.value)} placeholder="Your answer" maxLength={30} />}
            {q.type === 'date' && <input id={inputId} type="date" className="gf-input gf-date" value={v || ''} onChange={(e) => set(q, e.target.value)} />}
            {q.type === 'file' && <FileField q={q} value={v} slug={slug} onChange={(val) => set(q, val)} onBusy={(d) => setUploading((n) => n + d)} />}
            {q.type === 'paragraph' && <textarea id={inputId} className="gf-input gf-area" rows={3} value={v || ''} onChange={(e) => set(q, e.target.value)} placeholder="Your answer" maxLength={5000} />}
            {q.type === 'dropdown' && (
              <select id={inputId} className="gf-select" value={v || ''} onChange={(e) => set(q, e.target.value)}>
                <option value="">Choose</option>
                {opts.map((o) => <option key={o} value={o}>{optionLabel(q, o)}</option>)}
              </select>
            )}
            {q.type === 'mc' && (
              <div className="gf-options" role="radiogroup" aria-label={q.label}>
                {opts.map((o) => (
                  <label key={o} className="gf-option"><input type="radio" name={q.id} checked={v === o} onChange={() => set(q, o)} /><span>{optionLabel(q, o)}</span></label>
                ))}
                {v && !q.required && <button type="button" className="gf-clear" onClick={() => set(q, '')}>Clear selection</button>}
              </div>
            )}
            {q.type === 'checkbox' && (
              <div className="gf-options">
                {opts.map((o) => (
                  <label key={o} className="gf-option"><input type="checkbox" checked={Array.isArray(v) && v.includes(o)} onChange={() => toggle(q, o)} /><span>{o}</span></label>
                ))}
              </div>
            )}
            {err && <div className="gf-err" role="alert">⚠ {err}</div>}
          </div>
        );
      })}

      {serverError && <div className="gf-card gf-server-err" role="alert">{serverError}</div>}
      <div className="gf-actions">
        <button className="gf-submit" disabled={status === 'sending' || uploading > 0}>{uploading > 0 ? 'Uploading…' : status === 'sending' ? 'Submitting…' : 'Submit'}</button>
        <button type="button" className="gf-link" onClick={() => { if (window.confirm('Clear all your answers?')) { setAnswers({}); setErrors({}); } }}>Clear form</button>
      </div>
    </form>
  );
}
