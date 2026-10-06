import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { TRAINING_PROGRAMS, TRAINING_DURATIONS } from '../lib/config.js';
import { CSV_TEMPLATE, readCompletersCsv } from '../lib/completersCsv.js';
import '../styles/portal.css';
import '../styles/admin.css';
import '../styles/completers.css';

const SAMPLE = [
  { id: 1, certificate_no: 'PIFSA-2025-FP-0001', full_name: 'Anna Reyes', program: 'Forensic Psychology', batch: 'Batch 12', training_duration: TRAINING_DURATIONS[0], completed_on: '2025-11-08', lead_id: '1' },
  { id: 2, certificate_no: 'PIFSA-2025-FP-0002', full_name: 'Mark Santos', program: 'Forensic Psychology', batch: 'Batch 12', training_duration: TRAINING_DURATIONS[0], completed_on: '2025-11-08', lead_id: null },
  { id: 3, certificate_no: 'PIFSA-2025-LI-0001', full_name: 'Grace Lim', program: 'Legal Investigation', batch: 'Batch 11', training_duration: null, completed_on: '2025-06-21', lead_id: null },
];

const PAGE_SIZE = 25;
const NONE = '__none__';
const EMPTY = { certificate_no: '', full_name: '', program: '', batch: '', training_duration: '', completed_on: '' };
const DUPLICATE = 'That certificate number is already assigned to another completer.';
const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const uniq = (list) => [...new Set(list.filter(Boolean))].sort(natural);

export default function Completers() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ duration: 'all', program: 'all', batch: 'all' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) { setRows(SAMPLE); setLoading(false); return; }
      const { data, error } = await supabase.from('completers').select('*').order('completed_on', { ascending: false });
      if (error) setLoadError(error.message); else setRows(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const options = useMemo(() => ({
    duration: uniq(rows.map((r) => r.training_duration)),
    program: uniq(rows.map((r) => r.program)),
    batch: uniq(rows.map((r) => r.batch)),
    hasUnset: rows.some((r) => !r.training_duration),
  }), [rows]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.duration === NONE ? r.training_duration : filters.duration !== 'all' && r.training_duration !== filters.duration) return false;
      if (filters.program !== 'all' && r.program !== filters.program) return false;
      if (filters.batch !== 'all' && r.batch !== filters.batch) return false;
      return !q || [r.full_name, r.certificate_no, r.program, r.batch].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, search, filters]);

  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const filtering = search.trim() || Object.values(filters).some((v) => v !== 'all');
  const clearFilters = () => { setSearch(''); setFilters({ duration: 'all', program: 'all', batch: 'all' }); setPage(1); };

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const saveRow = async (form, id) => {
    const row = {
      certificate_no: form.certificate_no.trim(), full_name: form.full_name.trim(), program: form.program.trim(),
      batch: form.batch.trim(), completed_on: form.completed_on, training_duration: form.training_duration || null,
    };
    if (!row.certificate_no || !row.full_name || !row.program || !row.batch || !row.completed_on) return 'Please fill in every field except training duration, which is optional.';
    if (rows.some((r) => r.id !== id && r.certificate_no.trim().toUpperCase() === row.certificate_no.toUpperCase())) return DUPLICATE;

    let saved = { id: id || Date.now(), lead_id: null, ...row };
    if (isSupabaseConfigured) {
      const q = id ? supabase.from('completers').update(row).eq('id', id).select() : supabase.from('completers').insert([row]).select();
      const { data, error } = await q;
      if (error || !data?.length) return error?.code === '23505' ? DUPLICATE : 'Could not save: ' + (error?.message || 'no row returned');
      saved = data[0];
    }
    setRows((rs) => (id ? rs.map((r) => (r.id === id ? saved : r)) : [saved, ...rs]));
    return null;
  };

  const remove = async (r) => {
    if (!window.confirm(`Remove ${r.full_name} (${r.certificate_no})? This certificate will no longer verify.`)) return;
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('completers').delete().eq('id', r.id);
      if (error) { alert('Could not delete: ' + error.message); return; }
      // Drop the CRM tag once the lead has no certificates left
      if (r.lead_id && !rows.some((x) => x.id !== r.id && x.lead_id === r.lead_id)) {
        await supabase.from('leads').update({ is_completer: false }).eq('id', r.lead_id);
      }
    }
    setRows((rs) => rs.filter((x) => x.id !== r.id));
  };

  const importRows = async (csvRows) => {
    let added = csvRows.map((r, i) => ({ id: Date.now() + i, lead_id: null, ...r }));
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('completers').insert(csvRows).select();
      if (error || !data) return { error: 'Nothing was imported: ' + (error?.code === '23505' ? 'a certificate number in the file is already in the database.' : error?.message || 'no rows returned') };
      added = data;
    }
    setRows((rs) => [...added, ...rs]);
    return { count: added.length };
  };

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="admin-top-left">
          <img src="/images/logo.png" alt="PIFSA" />
          <div>
            <div className="admin-top-title">Completers Database</div>
            <div className="admin-top-sub">Certificates and public verification</div>
          </div>
        </div>
        <div className="admin-top-right">
          <button className="admin-switch" onClick={() => navigate('/portal')}>CRM System</button>
          <button className="admin-switch" onClick={() => navigate('/workspace')}>Workspace</button>
          <button className="portal-signout" onClick={async () => { await signOut(); navigate('/'); }}>Sign out</button>
        </div>
      </header>

      <div className="admin-body cdb">
        {!isSupabaseConfigured && <div className="notice">Preview mode — showing sample completers. Changes are not saved.</div>}
        {loadError && <div className="notice">Could not load completers ({loadError}). Run <code>supabase/completers.sql</code> in the Supabase SQL Editor first.</div>}

        <div className="cdb-head">
          <div className="admin-intro">
            <h1>Completers</h1>
            <p>Everyone who finished a PIFSA program. Third parties verify a certificate number on the website and see only the name, program and completion date.</p>
          </div>
          <div className="cdb-actions">
            <button className="portal-btn-ghost" onClick={() => setImportOpen(true)}>Import CSV</button>
            <button className="portal-btn" onClick={() => setEditing(EMPTY)}>＋ Add Completer</button>
          </div>
        </div>

        {loading ? <div className="panel-loading">Loading…</div> : (
          <>
            <div className="cdb-stats">
              <Stat value={rows.length} label="Completers" />
              <Stat value={options.batch.length} label="Batches" />
              <Stat value={options.program.length} label="Programs" />
              <Stat value={rows.filter((r) => r.lead_id).length} label="Tagged from CRM" />
            </div>

            <div className="cdb-card">
              <div className="cdb-toolbar">
                <div className="cdb-search">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input placeholder="Search name or certificate number" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <FilterSelect label="Training duration" value={filters.duration} onChange={(v) => setFilter('duration', v)} all="All durations" options={options.duration}>
                  {options.hasUnset && <option value={NONE}>Not set</option>}
                </FilterSelect>
                <FilterSelect label="Program" value={filters.program} onChange={(v) => setFilter('program', v)} all="All programs" options={options.program} />
                <FilterSelect label="Batch" value={filters.batch} onChange={(v) => setFilter('batch', v)} all="All batches" options={options.batch} />
              </div>

              <div className="cdb-meta">
                <span><strong>{shown.length}</strong> {shown.length === 1 ? 'completer' : 'completers'}{filtering ? ` of ${rows.length}` : ''}</span>
                {filtering && <button className="cdb-clear" onClick={clearFilters}>Clear filters</button>}
              </div>

              <div className="cdb-table-wrap">
                <table className="cdb-table">
                  <thead>
                    <tr><th>Completer</th><th>Certificate no.</th><th>Program</th><th>Batch</th><th>Training duration</th><th>Completed</th><th aria-label="Actions"></th></tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 && (
                      <tr><td colSpan={7} className="cdb-empty">
                        {rows.length === 0 ? 'No completers yet. Add one, import a CSV, or tag a lead as a completer in the CRM.' : 'No completers match these filters.'}
                      </td></tr>
                    )}
                    {pageRows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="cdb-name">{r.full_name}</div>
                          <span className={'cdb-source' + (r.lead_id ? ' crm' : '')}>{r.lead_id ? 'From CRM' : 'Added manually'}</span>
                        </td>
                        <td><code className="cert-code">{r.certificate_no}</code></td>
                        <td>{r.program}</td>
                        <td><span className="cdb-chip">{r.batch}</span></td>
                        <td className="cdb-muted">{r.training_duration || '—'}</td>
                        <td className="cdb-muted cdb-nowrap">{fmtDate(r.completed_on)}</td>
                        <td className="cdb-nowrap cdb-row-actions">
                          <button onClick={() => setEditing(r)}>Edit</button>
                          <button className="del" onClick={() => remove(r)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="cdb-pager">
                  <button disabled={current === 1} onClick={() => setPage(current - 1)}>‹ Previous</button>
                  <span>Page {current} of {totalPages}</span>
                  <button disabled={current === totalPages} onClick={() => setPage(current + 1)}>Next ›</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {editing && <CompleterEditor initial={editing} batches={options.batch} onClose={() => setEditing(null)} onSave={saveRow} />}
      {importOpen && <CsvImport existing={rows} onClose={() => setImportOpen(false)} onImport={importRows} />}
    </div>
  );
}

function Stat({ value, label }) {
  return <div className="cdb-stat"><div className="cdb-stat-value">{value.toLocaleString()}</div><div className="cdb-stat-label">{label}</div></div>;
}

function FilterSelect({ label, value, onChange, all, options, children }) {
  return (
    <label className={'cdb-filter' + (value !== 'all' ? ' on' : '')}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">{all}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        {children}
      </select>
    </label>
  );
}

function CompleterEditor({ initial, batches, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial, training_duration: initial.training_duration || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const isEdit = Boolean(initial.id);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const durations = uniq([...TRAINING_DURATIONS, form.training_duration]);

  const submit = async (keepOpen) => {
    setSaving(true);
    const problem = await onSave(form, initial.id);
    setSaving(false);
    if (problem) { setError(problem); return; }
    if (!keepOpen) { onClose(); return; }
    setError(''); setAddedCount((n) => n + 1);
    setForm((f) => ({ ...f, certificate_no: '', full_name: '' }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{isEdit ? 'Edit Completer' : 'Add Completer'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="field-row"><label>Full name</label><input className="portal-field" value={form.full_name} onChange={set('full_name')} autoFocus /></div>
          <div className="field-row"><label>Training certificate number</label><input className="portal-field" value={form.certificate_no} onChange={set('certificate_no')} placeholder="e.g. PIFSA-2026-FP-0001" /></div>
          <div className="field-row"><label>Program taken</label><input className="portal-field" value={form.program} onChange={set('program')} list="cdb-programs" /></div>
          <div className="field-2col">
            <div className="field-row"><label>Batch number</label><input className="portal-field" value={form.batch} onChange={set('batch')} list="cdb-batches" placeholder="e.g. Batch 12" /></div>
            <div className="field-row"><label>Date of completion</label><input className="portal-field" type="date" value={form.completed_on} onChange={set('completed_on')} /></div>
          </div>
          <div className="field-row">
            <label>Training duration <span className="opt">optional</span></label>
            <select className="portal-field" value={form.training_duration} onChange={set('training_duration')}>
              <option value="">— not set —</option>
              {durations.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <datalist id="cdb-programs">{TRAINING_PROGRAMS.map((p) => <option key={p} value={p} />)}</datalist>
          <datalist id="cdb-batches">{batches.map((b) => <option key={b} value={b} />)}</datalist>
          {error && <div className="completer-error">{error}</div>}
          {addedCount > 0 && !error && <div className="csv-ok">Added {addedCount} so far. Batch, program and dates are kept for the next one.</div>}
        </div>
        <div className="modal-foot">
          <div className="modal-foot-right">
            <button className="portal-btn-ghost" onClick={onClose}>{addedCount ? 'Done' : 'Cancel'}</button>
            {!isEdit && <button className="portal-btn-ghost" onClick={() => submit(true)} disabled={saving}>Save and add another</button>}
            <button className="portal-btn" onClick={() => submit(false)} disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CsvImport({ existing, onClose, onImport }) {
  const [csv, setCsv] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const pickFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setCsv({ name: file.name, ...readCompletersCsv(await file.text(), existing.map((r) => r.certificate_no)) });
  };

  const run = async () => {
    setBusy(true);
    const result = await onImport(csv.rows);
    setBusy(false);
    setCsv(result.error ? { ...csv, error: result.error } : { name: csv.name, done: result.count });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Import Completers from CSV</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="cdb-help">
            One completer per row. Required columns: <code>certificate_no</code>, <code>full_name</code>, <code>program</code>, <code>batch</code>, <code>completed_on</code>.
            Optional: <code>training_duration</code>. Dates work best as YYYY-MM-DD; Excel-style MM/DD/YYYY is also accepted.
          </p>
          <div className="cdb-drop" onClick={() => fileRef.current?.click()}>
            <strong>{csv?.name || 'Choose a CSV file'}</strong>
            <span>{csv?.name ? 'Click to choose a different file' : 'Nothing is saved until you confirm the import'}</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={pickFile} />
          </div>
          <a className="cdb-template" href={'data:text/csv;charset=utf-8,' + encodeURIComponent(CSV_TEMPLATE)} download="completers-template.csv">Download the CSV template</a>

          {csv?.fatal && <div className="completer-error">{csv.fatal}</div>}
          {csv?.done != null && <div className="csv-ok">Imported {csv.done} completer{csv.done === 1 ? '' : 's'} from {csv.name}.</div>}
          {csv?.rows && (
            <div className="csv-review">
              <div><strong>{csv.rows.length}</strong> ready to import{csv.problems.length ? `, ${csv.problems.length} skipped` : ''}.</div>
              {csv.problems.length > 0 && (
                <ul className="csv-problems">
                  {csv.problems.slice(0, 20).map((p) => <li key={p.line}>Row {p.line}: {p.reason}</li>)}
                  {csv.problems.length > 20 && <li>…and {csv.problems.length - 20} more</li>}
                </ul>
              )}
              {csv.error && <div className="completer-error">{csv.error}</div>}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <div className="modal-foot-right">
            <button className="portal-btn-ghost" onClick={onClose}>{csv?.done != null ? 'Done' : 'Cancel'}</button>
            {csv?.rows && (
              <button className="portal-btn" onClick={run} disabled={!csv.rows.length || busy}>
                {busy ? 'Importing…' : `Import ${csv.rows.length} completer${csv.rows.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
