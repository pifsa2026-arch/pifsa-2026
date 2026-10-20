import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { newId } from '../../lib/examParser.js';
import {
  QTYPES, OPTION_TYPES, LEAD_FIELDS, THEME_COLORS, PRESET_OPTIONS,
  question, slugify, blankForm, formatAnswer, resizeImage, isFileAnswer, programCode, detailBlock,
} from '../../lib/forms.js';
import { durationsForProgram, durationNote } from '../../lib/config.js';
import '../../styles/forms-admin.css';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const linkFor = (slug) => `${window.location.origin}/f/${slug}`;
const pathOf = (f) => (f.is_primary ? '/apply' : `/f/${f.slug}`);

export default function FormsAdmin() {
  const [forms, setForms] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState({ mode: 'list' }); // list | edit | responses
  const [copied, setCopied] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const [{ data, error: err }, { data: rs }] = await Promise.all([
      supabase.from('forms').select('*').order('updated_at', { ascending: false }),
      supabase.from('form_responses').select('form_id'),
    ]);
    if (err) setError('Could not load forms (' + err.message + '). Run supabase/forms_and_batch.sql first.');
    else setError('');
    setForms(data || []);
    const c = {};
    (rs || []).forEach((r) => { c[r.form_id] = (c[r.form_id] || 0) + 1; });
    setCounts(c);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const copy = async (f) => {
    await navigator.clipboard.writeText(window.location.origin + pathOf(f));
    setCopied(f.slug);
    setTimeout(() => setCopied(''), 2000);
  };
  // Only one form can be the main /apply form, so clear the current one first
  const makePrimary = async (f) => {
    const off = await supabase.from('forms').update({ is_primary: false }).eq('is_primary', true);
    const on = off.error ? off : await supabase.from('forms').update({ is_primary: true, is_open: true, updated_at: new Date().toISOString() }).eq('id', f.id);
    if (on.error) setError(on.error.message); else load();
  };
  const toggleOpen = async (f) => {
    const { error: err } = await supabase.from('forms').update({ is_open: !f.is_open, updated_at: new Date().toISOString() }).eq('id', f.id);
    if (err) setError(err.message); else load();
  };
  const duplicate = (f) => {
    const taken = new Set(forms.map((x) => x.slug));
    let slug = `${f.slug}-copy`.slice(0, 56), n = 2;
    while (taken.has(slug)) slug = `${f.slug.slice(0, 52)}-copy-${n++}`;
    setView({ mode: 'edit', form: { ...f, id: undefined, slug, title: `${f.title} (copy)`, is_open: false, is_primary: false, questions: f.questions.map((q) => ({ ...q, id: newId() })) } });
  };
  const remove = async (f) => {
    if (!window.confirm(`Delete "${f.title}" and all ${counts[f.id] || 0} responses? This cannot be undone.`)) return;
    const { error: err } = await supabase.from('forms').delete().eq('id', f.id);
    if (err) setError(err.message); else load();
  };

  if (view.mode === 'edit') return <FormEditor initial={view.form} existingSlugs={forms.filter((x) => x.id !== view.form.id).map((x) => x.slug)} onClose={() => setView({ mode: 'list' })} onSaved={() => { setView({ mode: 'list' }); load(); }} />;
  if (view.mode === 'responses') return <Responses form={view.form} onClose={() => { setView({ mode: 'list' }); load(); }} />;

  return (
    <div className="fa">
      <div className="admin-section-head fa-head">
        <div>
          <h2>Online Forms</h2>
          <p className="fa-sub">Share one permanent link, <code>{window.location.host}/apply</code>. It always opens the form marked <b>Main</b>. For a new training duration, duplicate the form, update it, then click <b>Set as main</b>. The link you already shared keeps working. Each form also has its own <code>/f/…</code> link. Forms are not linked from the website.</p>
        </div>
        <div className="fa-head-actions">
          <button className="portal-btn-ghost" onClick={() => setImportOpen(true)}>Import Google Form</button>
          <button className="portal-btn sm" onClick={() => setView({ mode: 'edit', form: blankForm() })}>＋ New form</button>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onImported={(form) => { setImportOpen(false); setView({ mode: 'edit', form }); }} />}
      {loading ? <div className="panel-loading">Loading…</div> : forms.length === 0 ? (
        <div className="admin-empty">No forms yet. Create one to replace your Google Form. It starts with name, email, contact number, program and duration questions you can change.</div>
      ) : (
        <div className="fa-list">
          {forms.map((f) => (
            <article className="fa-card" key={f.id} style={{ '--fc': f.theme_color }}>
              <div className="fa-card-top">
                <span className="fa-pills">
                  {f.is_primary && <span className="fa-pill main">Main · /apply</span>}
                  <span className={'fa-pill ' + (f.is_open ? 'open' : 'closed')}>{f.is_open ? 'Accepting responses' : 'Closed'}</span>
                </span>
                <label className="switch" title={f.is_open ? 'Close this form' : 'Open this form'}>
                  <input type="checkbox" checked={f.is_open} onChange={() => toggleOpen(f)} /><span className="switch-slider" />
                </label>
              </div>
              <h3>{f.title}</h3>
              <a className="fa-link" href={pathOf(f)} target="_blank" rel="noreferrer">{pathOf(f)} ↗</a>
              <div className="fa-stats">
                <span><b>{counts[f.id] || 0}</b> responses</span>
                <span><b>{f.questions.filter((q) => q.type !== 'section').length}</b> questions</span>
                <span className="fa-crm">Linked to CRM</span>
              </div>
              <div className="fa-meta">Updated {fmt(f.updated_at)}</div>
              <div className="fa-actions">
                <button onClick={() => setView({ mode: 'responses', form: f })}>Responses</button>
                <button onClick={() => setView({ mode: 'edit', form: f })}>Edit</button>
                <button onClick={() => copy(f)}>{copied === f.slug ? 'Copied' : 'Copy link'}</button>
                {!f.is_primary && <button onClick={() => makePrimary(f)} title="Make this the form people see at /apply">Set as main</button>}
                <button onClick={() => duplicate(f)}>Duplicate</button>
                <button className="del" onClick={() => remove(f)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const CRM_LISTS = { program: PRESET_OPTIONS.programs, training_duration: PRESET_OPTIONS.durations };

// Mapping a question to program or duration switches it to the CRM list so leads fill in exactly
function leadPatch(q, field) {
  if (!CRM_LISTS[field]) return { lead_field: field };
  const allowed = field === 'program' ? OPTION_TYPES : ['dropdown', 'mc'];
  return { lead_field: field, type: allowed.includes(q.type) ? q.type : 'dropdown', options: [...CRM_LISTS[field]] };
}

// Guesses which imported questions should fill CRM lead details
const LEAD_GUESS = [
  ['full_name', (q) => /\bname\b/i.test(q.label) && !/(company|school|agency|employer|office|org|first|last|middle|nick)/i.test(q.label) && ['short'].includes(q.type)],
  ['email', (q) => q.type === 'email'],
  ['contact_number', (q) => q.type === 'phone'],
  ['program', (q) => /(program|course)/i.test(q.label) && OPTION_TYPES.includes(q.type)],
  ['training_duration', (q) => /(duration|schedule|training date|batch date)/i.test(q.label) && OPTION_TYPES.includes(q.type)],
];

function toEditorForm(g) {
  const used = new Set();
  const questions = g.questions.map((q) => {
    let next = { ...question(q.type), ...q, options: q.options || [] };
    if (q.type !== 'section') {
      const hit = LEAD_GUESS.find(([field, test]) => !used.has(field) && test(next));
      if (hit) { used.add(hit[0]); next = { ...next, ...leadPatch(next, hit[0]) }; }
    }
    if (OPTION_TYPES.includes(next.type) && !next.options.length) next.options = ['Option 1'];
    return next;
  });
  return { ...blankForm(), title: g.title || 'Imported form', description: g.description || '', slug: '', is_open: false, details: { class_code: '', program: '', training_duration: '', blocks: [] }, questions };
}

function ImportDialog({ onClose, onImported }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const run = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/import-form?url=' + encodeURIComponent(url.trim()));
      if (!(res.headers.get('content-type') || '').includes('json')) {
        throw new Error(/localhost|127\.0\.0\.1/.test(window.location.hostname)
          ? 'The importer only runs on the live site (pifsatraining.com). Try it there.'
          : `The importer did not respond properly (error ${res.status}). Please try again in a minute.`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');
      if (!data.questions.length) throw new Error('No questions were found in that form.');
      setResult(data);
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>Import a Google Form</h2><button className="modal-close" onClick={onClose}>×</button></div>
        <form className="modal-body" onSubmit={run}>
          <p className="fa-sub" style={{ marginTop: 0 }}>Paste the link people use to fill out your Google Form. The title, description, sections and questions (with their choices and required settings) are copied into a new form you can edit before saving.</p>
          <input className="portal-field" placeholder="https://docs.google.com/forms/d/e/…/viewform  or  https://forms.gle/…" value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
          {error && <div className="completer-error">{error}</div>}
          {result && (
            <div className="csv-ok">
              Found <b>{result.title || 'your form'}</b> with {result.questions.filter((q) => q.type !== 'section').length} questions.
              {result.skipped.length > 0 && <> Skipped (not supported): {result.skipped.join(', ')}.</>}
            </div>
          )}
          <div className="modal-foot-right" style={{ marginTop: 6 }}>
            <button type="button" className="portal-btn-ghost" onClick={onClose}>Cancel</button>
            {result
              ? <button type="button" className="portal-btn" onClick={() => onImported(toEditorForm(result))}>Open in the editor</button>
              : <button className="portal-btn" disabled={busy || !url.trim()}>{busy ? 'Reading the form…' : 'Import'}</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

// Training details at the top of a registration form. Program and duration also fill every lead.
function DetailsEditor({ details, title, onChange }) {
  const d = { class_code: '', program: '', training_duration: '', blocks: [], ...details };
  const blocks = d.blocks || [];
  const durations = durationsForProgram(d.program);
  const update = (patch, nextTitle) => onChange({ ...d, ...patch }, nextTitle);
  const setBlocks = (next) => update({ blocks: next });
  const moveBlock = (i, dir) => {
    const next = [...blocks]; const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };

  // Switching program swaps the code at the start of the class code (and the title if it matched)
  const changeProgram = (program) => {
    const oldCode = programCode(d.program), newCode = programCode(program);
    let classCode = d.class_code;
    if (oldCode && newCode && classCode.startsWith(oldCode)) classCode = newCode + classCode.slice(oldCode.length);
    else if (!classCode && newCode) classCode = `${newCode} Class `;
    const duration = durationsForProgram(program).includes(d.training_duration) ? d.training_duration : '';
    update({ program, class_code: classCode, training_duration: duration }, title === d.class_code ? classCode : undefined);
  };

  return (
    <div className="fe2-card fe2-details">
      <div className="fe2-details-head">
        <h3>Training details</h3>
        <small>Shown at the top of the form. The program and duration are also saved on every lead from this form.</small>
      </div>
      <div className="fe2-details-grid">
        <label>Training program
          <select className="portal-field sm" value={d.program} onChange={(e) => changeProgram(e.target.value)}>
            <option value="">No program</option>
            {PRESET_OPTIONS.programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>Class code
          <input className="portal-field sm" value={d.class_code} placeholder="e.g. PCFPsy Class 2027-13"
            onChange={(e) => update({ class_code: e.target.value }, title === d.class_code ? e.target.value : undefined)} />
        </label>
        <label>Training duration
          <select className="portal-field sm" value={d.training_duration} onChange={(e) => update({ training_duration: e.target.value })}>
            <option value="">No duration</option>
            {durations.map((x) => <option key={x} value={x}>{x}{durationNote(x)}</option>)}
          </select>
        </label>
      </div>

      <div className="fe2-blocks">
        {blocks.map((b, i) => (
          <div className="fe2-block" key={b.id}>
            <div className="fe2-block-head">
              <input className="fe2-block-label" value={b.label} placeholder="Section title, e.g. Training Modality"
                onChange={(e) => setBlocks(blocks.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x)))} />
              <div className="fe2-tools">
                <button onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} aria-label="Move down">↓</button>
                <button className="del" onClick={() => setBlocks(blocks.filter((x) => x.id !== b.id))} aria-label="Delete section" title="Delete">🗑</button>
              </div>
            </div>
            <textarea className="portal-field fe2-block-text" rows={Math.min(8, Math.max(2, b.text.split('\n').length + 1))} value={b.text}
              onChange={(e) => setBlocks(blocks.map((x) => (x.id === b.id ? { ...x, text: e.target.value } : x)))} />
          </div>
        ))}
      </div>
      <div className="fe2-blocks-foot">
        <button onClick={() => setBlocks([...blocks, detailBlock('', '')])}>+ Add detail section</button>
        <span>Start a line with * to make a bullet point.</span>
      </div>
    </div>
  );
}

// Uploaded files are private, so staff open them through a short-lived signed link
function FileLink({ value }) {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    const { data, error } = await supabase.storage.from('form-uploads').createSignedUrl(value.path, 600);
    setBusy(false);
    if (error) { alert('Could not open the file: ' + error.message); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  };
  return <button className="fa-file" onClick={open} disabled={busy} title={value.name}>{busy ? 'Opening…' : '📎 View file'}</button>;
}

function problemsOf(q) {
  const p = [];
  if (!q.label.trim()) p.push(q.type === 'section' ? 'Give the section a title.' : 'Write the question.');
  if (OPTION_TYPES.includes(q.type) && !CRM_LISTS[q.lead_field]) {
    const opts = q.options.map((o) => o.trim());
    if (!opts.length || opts.some((o) => !o)) p.push('Fill in or remove the empty options.');
    if (new Set(opts).size !== opts.length) p.push('Two options are the same.');
  }
  return p;
}

function FormEditor({ initial, existingSlugs, onClose, onSaved }) {
  const [f, setF] = useState({ ...blankForm(), ...initial, questions: initial.questions || [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(false);
  const bannerRef = useRef(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setQ = (id, patch) => setF((x) => ({ ...x, questions: x.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) }));
  const move = (i, d) => setF((x) => {
    const qs = [...x.questions]; const j = i + d;
    if (j < 0 || j >= qs.length) return x;
    [qs[i], qs[j]] = [qs[j], qs[i]];
    return { ...x, questions: qs };
  });
  const addQ = (type, at = f.questions.length) => setF((x) => {
    const qs = [...x.questions];
    qs.splice(at, 0, question(type));
    return { ...x, questions: qs };
  });

  const slug = f.slug ? f.slug.replace(/^-+|-+$/g, '') : slugify(f.title);
  const slugBad = !/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug) ? 'Use 2–61 lowercase letters, numbers or dashes.' : existingSlugs.includes(slug) ? 'Another form already uses this link.' : '';
  const problems = f.questions.map(problemsOf);
  const badCount = problems.filter((p) => p.length).length;
  const usedLead = (field, id) => f.questions.some((q) => q.id !== id && q.lead_field === field);

  const uploadBanner = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { set('banner_url', await resizeImage(file)); } catch { setError('That image could not be read. Try a JPG or PNG.'); }
  };

  const save = async () => {
    setChecked(true);
    if (!f.title.trim()) { setError('Give the form a title.'); return; }
    if (slugBad) { setError('Fix the form link: ' + slugBad); return; }
    if (!f.questions.some((q) => q.type !== 'section')) { setError('Add at least one question.'); return; }
    if (badCount) { setError(`${badCount} question${badCount > 1 ? 's need' : ' needs'} fixing (highlighted below).`); return; }
    const missingMap = ['full_name', 'email'].filter((k) => !f.questions.some((q) => q.lead_field === k));
    if (missingMap.length) { setError('Every response goes to the CRM, so set one question to ' + missingMap.map((k) => '"CRM lead: ' + LEAD_FIELDS[k] + '"').join(' and ') + ' (bottom-left of the question).'); return; }
    setSaving(true); setError('');
    const row = {
      slug, title: f.title.trim(), description: f.description?.trim() || null, banner_url: f.banner_url || null,
      theme_color: f.theme_color, is_open: f.is_open, closed_message: f.closed_message?.trim() || null,
      success_message: f.success_message?.trim() || null, create_lead: true, updated_at: new Date().toISOString(),
      details: {
        class_code: f.details?.class_code?.trim() || '', program: f.details?.program || '', training_duration: f.details?.training_duration || '',
        blocks: (f.details?.blocks || []).map((b) => ({ id: b.id, label: b.label.trim(), text: b.text.trim() })).filter((b) => b.label || b.text),
      },
      questions: f.questions.map((q) => ({
        id: q.id, type: q.type, label: q.label.trim(), help: q.help?.trim() || '', required: q.type === 'section' ? false : Boolean(q.required),
        options: OPTION_TYPES.includes(q.type) ? q.options.map((o) => o.trim()) : [], lead_field: q.type === 'section' ? '' : (q.lead_field || ''),
      })),
    };
    const { error: err } = f.id ? await supabase.from('forms').update(row).eq('id', f.id) : await supabase.from('forms').insert([row]);
    setSaving(false);
    if (err) { setError('Could not save: ' + (err.code === '23505' ? 'another form already uses this link.' : err.message)); return; }
    onSaved();
  };

  return (
    <div className="fe2" style={{ '--fc': f.theme_color }}>
      <div className="fe2-bar">
        <button className="fe2-back" onClick={onClose}>‹ All forms</button>
        <span className="fe2-link">{window.location.host}/f/{slug || '…'}</span>
        <div className="fe2-bar-actions">
          {f.id && <a className="portal-btn-ghost" href={`/f/${f.slug}`} target="_blank" rel="noreferrer">Preview ↗</a>}
          <button className="portal-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="portal-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save form'}</button>
        </div>
      </div>
      {error && <div className="completer-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="fe2-grid">
        <div className="fe2-main">
          {f.banner_url && <div className="fe2-banner"><img src={f.banner_url} alt="" /><button onClick={() => set('banner_url', '')}>Remove banner</button></div>}
          <div className="fe2-card fe2-headcard">
            <input className="fe2-title" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Form title" />
            <textarea className="fe2-desc" rows={2} value={f.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Short note under the title (optional)" />
          </div>

          <DetailsEditor details={f.details || {}} title={f.title}
            onChange={(details, title) => setF((x) => ({ ...x, details, ...(title !== undefined ? { title } : {}) }))} />

          {f.questions.map((q, i) => {
            const p = checked ? problems[i] : [];
            return (
              <div key={q.id} className={'fe2-card fe2-q' + (q.type === 'section' ? ' section' : '') + (p.length ? ' bad' : '')}>
                <div className="fe2-q-row">
                  <input className="fe2-q-label" value={q.label} onChange={(e) => setQ(q.id, { label: e.target.value })} placeholder={q.type === 'section' ? 'Section title' : 'Question'} />
                  <select className="portal-field sm fe2-type" value={q.type} onChange={(e) => {
                    const type = e.target.value;
                    setQ(q.id, { type, options: OPTION_TYPES.includes(type) ? (q.options.length ? q.options : ['Option 1']) : [], ...(type === 'section' ? { required: false, lead_field: '' } : {}) });
                  }}>
                    {Object.entries(QTYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <input className="fe2-help" value={q.help || ''} onChange={(e) => setQ(q.id, { help: e.target.value })} placeholder={q.type === 'section' ? 'Description (optional)' : 'Help text (optional)'} />

                {CRM_LISTS[q.lead_field] && OPTION_TYPES.includes(q.type) && (
                  <div className="fe2-crm-list">
                    <b>Choices come from the CRM</b>
                    <span>{CRM_LISTS[q.lead_field].length} {q.lead_field === 'program' ? 'training programs' : 'training durations'}, always up to date. {q.lead_field === 'program' ? 'The chosen program appears on the lead.' : 'The chosen duration appears on the lead.'}</span>
                    <small>{CRM_LISTS[q.lead_field].slice(0, 3).join(' · ')}{CRM_LISTS[q.lead_field].length > 3 ? ' · …' : ''}</small>
                  </div>
                )}
                {!CRM_LISTS[q.lead_field] && OPTION_TYPES.includes(q.type) && (
                  <div className="fe2-opts">
                    {q.options.map((o, oi) => (
                      <div className="fe2-opt" key={oi}>
                        <span className={'fe2-opt-mark ' + q.type} aria-hidden="true">{q.type === 'dropdown' ? `${oi + 1}.` : ''}</span>
                        <input value={o} onChange={(e) => setQ(q.id, { options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)) })} placeholder={`Option ${oi + 1}`} />
                        <button aria-label="Remove option" disabled={q.options.length === 1} onClick={() => setQ(q.id, { options: q.options.filter((_, xi) => xi !== oi) })}>×</button>
                      </div>
                    ))}
                    <div className="fe2-opt-add">
                      <button onClick={() => setQ(q.id, { options: [...q.options, `Option ${q.options.length + 1}`] })}>+ Add option</button>
                      <span>or fill with</span>
                      <button onClick={() => setQ(q.id, { options: [...PRESET_OPTIONS.programs] })}>Training programs</button>
                      <button onClick={() => setQ(q.id, { options: [...PRESET_OPTIONS.durations] })}>Training durations</button>
                    </div>
                  </div>
                )}
                {!OPTION_TYPES.includes(q.type) && q.type !== 'section' && <div className="fe2-sample">{QTYPES[q.type]} field</div>}

                {p.length > 0 && <ul className="fe2-problems">{p.map((x) => <li key={x}>{x}</li>)}</ul>}

                <div className="fe2-q-foot">
                  {q.type !== 'section' && (
                    <select className="portal-field sm fe2-lead" value={q.lead_field || ''} onChange={(e) => setQ(q.id, leadPatch(q, e.target.value))} title="Which lead detail this answer fills in the CRM">
                      <option value="">Not sent to the CRM</option>
                      {Object.entries(LEAD_FIELDS).map(([k, v]) => <option key={k} value={k} disabled={usedLead(k, q.id)}>CRM lead: {v}</option>)}
                    </select>
                  )}
                  <div className="fe2-tools">
                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === f.questions.length - 1} aria-label="Move down">↓</button>
                    <button onClick={() => setF((x) => { const qs = [...x.questions]; qs.splice(i + 1, 0, { ...q, id: newId(), label: q.label ? `${q.label} (copy)` : '', lead_field: '' }); return { ...x, questions: qs }; })} aria-label="Duplicate question" title="Duplicate">⧉</button>
                    <button className="del" onClick={() => setF((x) => ({ ...x, questions: x.questions.filter((y) => y.id !== q.id) }))} aria-label="Delete question" title="Delete">🗑</button>
                    {q.type !== 'section' && (
                      <label className="fe2-req">Required
                        <span className="switch sm"><input type="checkbox" checked={Boolean(q.required)} onChange={(e) => setQ(q.id, { required: e.target.checked })} /><span className="switch-slider" /></span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="fe2-add">
            <span>Add:</span>
            {['short', 'paragraph', 'mc', 'checkbox', 'dropdown', 'email', 'phone', 'date', 'number', 'section'].map((t) => (
              <button key={t} onClick={() => addQ(t)}>+ {QTYPES[t]}</button>
            ))}
          </div>
        </div>

        <aside className="fe2-side">
          <div className="fe2-panel">
            <h3>Settings</h3>
            <label className="fe2-switch-row">
              <span><b>Accepting responses</b><small>Turn off when the training duration is full or over.</small></span>
              <span className="switch"><input type="checkbox" checked={f.is_open} onChange={(e) => set('is_open', e.target.checked)} /><span className="switch-slider" /></span>
            </label>
            <div className="fe2-crm-note">
              <b>Connected to the CRM</b>
              <small>Every response creates an Applicant with source <em>Exclusive Form</em>. If the same email applies again for the same training duration, that lead is updated instead.</small>
            </div>
            <label className="fe2-field">Form link
              <div className="fe2-slug"><span>/f/</span><input value={f.slug} placeholder={slugify(f.title) || 'application-form'} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').slice(0, 61))} /></div>
              {slugBad && <small className="fe2-bad">{slugBad}</small>}
            </label>
            <div className="fe2-field">Theme color
              <div className="fe2-colors">
                {THEME_COLORS.map((c) => <button key={c} className={f.theme_color === c ? 'on' : ''} style={{ background: c }} onClick={() => set('theme_color', c)} aria-label={`Use color ${c}`} />)}
                <input type="color" value={f.theme_color} onChange={(e) => set('theme_color', e.target.value)} aria-label="Custom color" />
              </div>
            </div>
            <div className="fe2-field">Header image
              <button className="portal-btn-ghost" onClick={() => bannerRef.current?.click()}>{f.banner_url ? 'Change image' : 'Upload image'}</button>
              <input ref={bannerRef} type="file" accept="image/*" hidden onChange={uploadBanner} />
            </div>
            <label className="fe2-field">Message after submitting
              <textarea className="portal-field" rows={3} value={f.success_message || ''} onChange={(e) => set('success_message', e.target.value)} />
            </label>
            <label className="fe2-field">Message when closed
              <textarea className="portal-field" rows={3} value={f.closed_message || ''} onChange={(e) => set('closed_message', e.target.value)} />
            </label>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Responses({ form, onClose }) {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const cols = form.questions.filter((q) => q.type !== 'section');

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('form_responses').select('*').eq('form_id', form.id).order('created_at', { ascending: false });
    if (err) setError(err.message);
    setRows(data || []);
  }, [form.id]);
  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const shown = (rows || []).filter((r) => !q || cols.some((c) => String(formatAnswer(r.answers[c.id])).toLowerCase().includes(q)));

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Submitted', ...cols.map((c) => c.label), 'CRM lead'].map(esc).join(',')];
    shown.forEach((r) => lines.push([fmt(r.created_at), ...cols.map((c) => formatAnswer(r.answers[c.id])), r.lead_id ? 'Yes' : ''].map(esc).join(',')));
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${form.slug}-responses.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const remove = async (r) => {
    if (!window.confirm('Delete this response? Any CRM lead it created stays in the CRM.')) return;
    const { error: err } = await supabase.from('form_responses').delete().eq('id', r.id);
    if (err) setError(err.message); else load();
  };

  return (
    <div className="fa">
      <div className="fe2-bar">
        <button className="fe2-back" onClick={onClose}>‹ All forms</button>
        <span className="fe2-link">{form.title} · {rows ? `${rows.length} response${rows.length === 1 ? '' : 's'}` : '…'}</span>
        <div className="fe2-bar-actions">
          <input className="portal-field sm" placeholder="Search responses" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="portal-btn-ghost" onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
        </div>
      </div>
      {error && <div className="completer-error">{error}</div>}
      {rows === null ? <div className="panel-loading">Loading…</div> : rows.length === 0 ? (
        <div className="admin-empty">No responses yet. Share the link: <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer">{linkFor(form.slug)}</a></div>
      ) : (
        <div className="fa-table-wrap">
          <table className="fa-table">
            <thead><tr><th>Submitted</th>{cols.map((c) => <th key={c.id}>{c.label}</th>)}<th></th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="fa-nowrap">{fmt(r.created_at)}{r.lead_id && <span className="fa-crm sm">CRM</span>}</td>
                  {cols.map((c) => <td key={c.id}>{isFileAnswer(r.answers[c.id]) ? <FileLink value={r.answers[c.id]} /> : formatAnswer(r.answers[c.id]) || <span className="fa-muted">—</span>}</td>)}
                  <td><button className="fa-del" onClick={() => remove(r)} aria-label="Delete response">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
