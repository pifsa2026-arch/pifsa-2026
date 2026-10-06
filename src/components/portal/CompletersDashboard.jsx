import { useEffect, useRef, useState } from 'react';
import { CSV_TEMPLATE, readCompletersCsv } from '../../lib/completersCsv.js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { TRAINING_PROGRAMS } from '../../lib/config.js';

const SAMPLE = [
  { id: 1, certificate_no: 'PIFSA-2025-FP-0001', full_name: 'Anna Reyes', program: 'Forensic Psychology', batch: 'Batch 12', completed_on: '2025-11-08' },
  { id: 2, certificate_no: 'PIFSA-2025-FP-0002', full_name: 'Mark Santos', program: 'Forensic Psychology', batch: 'Batch 12', completed_on: '2025-11-08' },
  { id: 3, certificate_no: 'PIFSA-2025-LI-0001', full_name: 'Grace Lim', program: 'Legal Investigation', batch: 'Batch 11', completed_on: '2025-06-21' },
];

const EMPTY = { certificate_no: '', full_name: '', program: '', batch: '', completed_on: '' };
const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

export default function CompletersDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [batchFilter, setBatchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [csv, setCsv] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) { setRows(SAMPLE); setLoading(false); return; }
      const { data, error } = await supabase.from('completers').select('*').order('completed_on', { ascending: false });
      if (error) setLoadError(error.message); else setRows(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const row = {
      certificate_no: form.certificate_no.trim(), full_name: form.full_name.trim(),
      program: form.program.trim(), batch: form.batch.trim(), completed_on: form.completed_on,
    };
    if (Object.values(row).some((v) => !v)) { setFormError('Please fill in all five fields.'); return; }
    const clash = rows.some((r) => r.id !== editingId && r.certificate_no.trim().toUpperCase() === row.certificate_no.toUpperCase());
    if (clash) { setFormError('That certificate number is already assigned to another completer.'); return; }
    setFormError(''); setSaving(true);

    let saved = { id: editingId || Date.now(), ...row };
    if (isSupabaseConfigured) {
      const q = editingId
        ? supabase.from('completers').update(row).eq('id', editingId).select()
        : supabase.from('completers').insert([row]).select();
      const { data, error } = await q;
      if (error || !data?.length) {
        setSaving(false);
        setFormError(error?.code === '23505' ? 'That certificate number is already assigned to another completer.' : 'Could not save: ' + (error?.message || 'no row returned'));
        return;
      }
      saved = data[0];
    }
    setRows((rs) => (editingId ? rs.map((r) => (r.id === editingId ? saved : r)) : [saved, ...rs]));
    setSaving(false);
    setEditingId(null);
    // Keep batch, program and date so the rest of the batch is quick to enter
    setForm(editingId ? EMPTY : { ...row, certificate_no: '', full_name: '' });
  };

  const startEdit = (r) => {
    setEditingId(r.id); setFormError('');
    setForm({ certificate_no: r.certificate_no, full_name: r.full_name, program: r.program, batch: r.batch, completed_on: r.completed_on });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => { setEditingId(null); setForm(EMPTY); setFormError(''); };

  const remove = async (r) => {
    if (!window.confirm(`Remove ${r.full_name} (${r.certificate_no})? This certificate will no longer verify.`)) return;
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('completers').delete().eq('id', r.id);
      if (error) { alert('Could not delete: ' + error.message); return; }
    }
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    if (editingId === r.id) cancelEdit();
  };

  const pickFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const parsed = readCompletersCsv(await file.text(), rows.map((r) => r.certificate_no));
    setCsv({ name: file.name, ...parsed });
  };

  const importCsv = async () => {
    setImporting(true);
    let added = csv.rows.map((r, i) => ({ id: Date.now() + i, ...r }));
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('completers').insert(csv.rows).select();
      if (error || !data) {
        setImporting(false);
        setCsv({ ...csv, error: 'Nothing was imported: ' + (error?.code === '23505' ? 'a certificate number in the file is already in the database.' : error?.message || 'no rows returned') });
        return;
      }
      added = data;
    }
    setRows((rs) => [...added, ...rs]);
    setImporting(false);
    setCsv({ name: csv.name, done: added.length });
  };

  if (loading) return <div className="panel-loading">Loading…</div>;

  const batches = [...new Set(rows.map((r) => r.batch))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const q = search.trim().toLowerCase();
  const shown = rows
    .filter((r) => batchFilter === 'all' || r.batch === batchFilter)
    .filter((r) => !q || [r.full_name, r.certificate_no, r.program, r.batch].some((v) => v.toLowerCase().includes(q)));

  return (
    <div>
      {!isSupabaseConfigured && <div className="notice">Preview mode — showing sample completers. Changes are not saved.</div>}
      {loadError && <div className="notice">Could not load completers ({loadError}). Run <code>supabase/completers.sql</code> in the Supabase SQL Editor first.</div>}

      <div className="kpi-grid kpi-sm" style={{ marginBottom: 24 }}>
        <div className="kpi-card"><div className="kpi-value">{rows.length}</div><div className="kpi-label">Total Completers</div></div>
        <div className="kpi-card"><div className="kpi-value">{batches.length}</div><div className="kpi-label">Batches</div></div>
        <div className="kpi-card"><div className="kpi-value">{new Set(rows.map((r) => r.program)).size}</div><div className="kpi-label">Programs</div></div>
      </div>

      <div className="panel">
        <h3>{editingId ? 'Edit Completer' : 'Add a Completer'}</h3>
        <p className="muted mini" style={{ marginBottom: 16 }}>
          The certificate number is what third parties type on the website to verify. They only see the full name, program and completion date.
        </p>
        <div className="expense-form">
          <div className="expense-form-2col">
            <input className="portal-field sm" placeholder="Batch (e.g. Batch 12)" value={form.batch} onChange={set('batch')} list="completer-batches" />
            <input className="portal-field sm" placeholder="Program taken" value={form.program} onChange={set('program')} list="completer-programs" />
          </div>
          <div className="expense-form-2col">
            <input className="portal-field sm" placeholder="Full name" value={form.full_name} onChange={set('full_name')} />
            <input className="portal-field sm" placeholder="Training certificate number" value={form.certificate_no} onChange={set('certificate_no')} />
          </div>
          <div className="expense-form-2col">
            <label className="completer-date">
              <span>Date of completion</span>
              <input className="portal-field sm" type="date" value={form.completed_on} onChange={set('completed_on')} />
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <button className="portal-btn sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Completer'}</button>
              {editingId && <button className="portal-btn-ghost" onClick={cancelEdit}>Cancel</button>}
            </div>
          </div>
          {formError && <div className="completer-error">{formError}</div>}
          <datalist id="completer-batches">{batches.map((b) => <option key={b} value={b} />)}</datalist>
          <datalist id="completer-programs">{TRAINING_PROGRAMS.map((p) => <option key={p} value={p} />)}</datalist>
        </div>
      </div>

      <div className="panel">
        <h3>Import a Batch from CSV</h3>
        <p className="muted mini" style={{ marginBottom: 16 }}>
          One completer per row with these columns: <code>certificate_no</code>, <code>full_name</code>, <code>program</code>, <code>batch</code>, <code>completed_on</code>.
          Dates work best as YYYY-MM-DD; Excel-style MM/DD/YYYY is also accepted.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="portal-btn sm" onClick={() => fileRef.current?.click()}>Choose CSV file</button>
          <a className="portal-btn-ghost" href={'data:text/csv;charset=utf-8,' + encodeURIComponent(CSV_TEMPLATE)} download="completers-template.csv">Download template</a>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={pickFile} />
        </div>

        {csv?.fatal && <div className="completer-error" style={{ marginTop: 14 }}>{csv.fatal}</div>}
        {csv?.done != null && <div className="csv-ok" style={{ marginTop: 14 }}>Imported {csv.done} completer{csv.done === 1 ? '' : 's'} from {csv.name}.</div>}
        {csv?.rows && (
          <div className="csv-review">
            <div><strong>{csv.name}</strong> — {csv.rows.length} ready to import{csv.problems.length ? `, ${csv.problems.length} skipped` : ''}.</div>
            {csv.problems.length > 0 && (
              <ul className="csv-problems">
                {csv.problems.slice(0, 20).map((p) => <li key={p.line}>Row {p.line}: {p.reason}</li>)}
                {csv.problems.length > 20 && <li>…and {csv.problems.length - 20} more</li>}
              </ul>
            )}
            {csv.error && <div className="completer-error">{csv.error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="portal-btn sm" onClick={importCsv} disabled={!csv.rows.length || importing}>
                {importing ? 'Importing…' : `Import ${csv.rows.length} completer${csv.rows.length === 1 ? '' : 's'}`}
              </button>
              <button className="portal-btn-ghost" onClick={() => setCsv(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Completers</h3>
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <div className="filter-group">
            <label>Batch</label>
            <select className="portal-field sm" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
              <option value="all">All batches</option>
              {batches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="filter-group" style={{ flex: 1 }}>
            <label>Search</label>
            <input className="portal-field sm" placeholder="Name, certificate number or program" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-scope">{shown.length} shown</div>
        </div>
        <div className="table-wrap">
          <table className="crm-table sm">
            <thead><tr><th>Certificate No.</th><th>Full Name</th><th>Program</th><th>Batch</th><th>Completed</th><th></th></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={6} className="empty-row">No completers found.</td></tr>}
              {shown.map((r) => (
                <tr key={r.id}>
                  <td><code className="cert-code">{r.certificate_no}</code></td>
                  <td style={{ fontWeight: 600 }}>{r.full_name}</td>
                  <td>{r.program}</td>
                  <td><span className="dur-tag">{r.batch}</span></td>
                  <td className="muted">{fmtDate(r.completed_on)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="pay-rec-edit" onClick={() => startEdit(r)}>Edit</button>
                    <button className="row-del" onClick={() => remove(r)} aria-label="Delete">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
