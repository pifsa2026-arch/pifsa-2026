import { useState, useEffect } from 'react';
import { STAGES, TRAINING_PROGRAMS, TRAINING_DURATIONS, PROGRAM_PRICE, LEAD_SOURCES, peso } from '../../lib/config.js';
import { useLeads } from '../../lib/LeadsContext.jsx';

const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function LeadModal({ lead, onClose, onSave, onDelete, createMode = false }) {
  const { fetchPayments, addPayment, updatePayment, deletePayment, syncLeadPaidTotal,
    fetchNotes, addNote, updateNote, deleteNote, connected } = useLeads();

  const [form, setForm] = useState({
    full_name: lead.full_name || '', email: lead.email || '', contact_number: lead.contact_number || '',
    current_work: lead.current_work || '', location: lead.location || '', bs_degree: lead.bs_degree || '',
    programs: lead.programs || [], training_duration: lead.training_duration || '',
    stage: lead.stage || 'Leads', source: lead.source || 'manual', notes: lead.notes || '',
  });

  // Payments + notes (only for existing leads with Supabase)
  const [payments, setPayments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newPay, setNewPay] = useState('');
  const [newPayDate, setNewPayDate] = useState('');
  const [newNote, setNewNote] = useState('');
  const [editingPay, setEditingPay] = useState(null);
  const [editingNote, setEditingNote] = useState(null);

  const canHistory = !createMode && connected && lead.id;

  useEffect(() => {
    if (canHistory) {
      fetchPayments(lead.id).then(setPayments);
      fetchNotes(lead.id).then(setNotes);
    }
  }, [canHistory, lead.id, fetchPayments, fetchNotes]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleProgram = (p) => set('programs', form.programs.includes(p) ? form.programs.filter((x) => x !== p) : [...form.programs, p]);

  const due = form.programs.length * PROGRAM_PRICE;
  const paidTotal = payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(0, due - paidTotal);
  const fully = due > 0 && paidTotal >= due;

  // Recompute the lead's amount_paid whenever payments change, and auto-advance stage
  const recalc = async (newPayments) => {
    const total = newPayments.reduce((s, p) => s + Number(p.amount), 0);
    await syncLeadPaidTotal(lead.id, total);
    if (due > 0 && total >= due && form.stage !== 'Paid') set('stage', 'Paid');
  };

  const handleAddPayment = async () => {
    const amt = parseFloat(newPay);
    if (!amt || amt <= 0) return;
    const row = await addPayment(lead.id, amt, newPayDate ? new Date(newPayDate).toISOString() : null);
    if (row) { const next = [row, ...payments]; setPayments(next); recalc(next); setNewPay(''); setNewPayDate(''); }
  };
  const handleEditPayment = async (id, amount) => {
    await updatePayment(id, { amount });
    const next = payments.map((p) => (p.id === id ? { ...p, amount } : p));
    setPayments(next); recalc(next); setEditingPay(null);
  };
  const handleDeletePayment = async (id) => {
    await deletePayment(id);
    const next = payments.filter((p) => p.id !== id);
    setPayments(next); recalc(next);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const row = await addNote(lead.id, newNote.trim());
    if (row) { setNotes([row, ...notes]); setNewNote(''); }
  };
  const handleEditNote = async (id, body) => {
    await updateNote(id, body);
    setNotes(notes.map((n) => (n.id === id ? { ...n, body } : n)));
    setEditingNote(null);
  };
  const handleDeleteNote = async (id) => {
    await deleteNote(id);
    setNotes(notes.filter((n) => n.id !== id));
  };

  const save = () => {
    const patch = {
      full_name: form.full_name.trim(), email: form.email.trim(), contact_number: form.contact_number.trim(),
      current_work: form.current_work.trim(), location: form.location.trim(), bs_degree: form.bs_degree.trim(),
      programs: form.programs, training_duration: form.training_duration, stage: form.stage, source: form.source,
    };
    onSave(patch);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{createMode ? 'Add New Lead' : 'Lead Details'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            <label>Name</label>
            <input className="portal-field" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
          </div>
          <div className="field-2col">
            <div className="field-row"><label>Email</label><input className="portal-field" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="field-row"><label>Contact Number</label><input className="portal-field" value={form.contact_number} onChange={(e) => set('contact_number', e.target.value)} /></div>
          </div>
          <div className="field-2col">
            <div className="field-row"><label>Current Work / Company <span className="opt">optional</span></label><input className="portal-field" value={form.current_work} onChange={(e) => set('current_work', e.target.value)} placeholder="e.g. PNP, ABC Corp" /></div>
            <div className="field-row"><label>Location <span className="opt">optional</span></label><input className="portal-field" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Cavite" /></div>
          </div>
          <div className="field-2col">
            <div className="field-row"><label>BS Degree <span className="opt">optional</span></label><input className="portal-field" value={form.bs_degree} onChange={(e) => set('bs_degree', e.target.value)} placeholder="e.g. BS Criminology" /></div>
            <div className="field-row">
              <label>Lead Source</label>
              <select className="portal-field" value={form.source} onChange={(e) => set('source', e.target.value)}>
                {LEAD_SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="field-row">
            <label>Training Program(s) — {form.programs.length} selected · {peso(due)} due</label>
            <div className="modal-programs">
              {TRAINING_PROGRAMS.map((p) => (
                <label key={p} className={'program-chip' + (form.programs.includes(p) ? ' on' : '')}>
                  <input type="checkbox" checked={form.programs.includes(p)} onChange={() => toggleProgram(p)} />{p}
                </label>
              ))}
            </div>
          </div>

          <div className="field-2col">
            <div className="field-row">
              <label>Training Duration</label>
              <select className="portal-field" value={form.training_duration} onChange={(e) => set('training_duration', e.target.value)}>
                <option value="">— none —</option>
                {TRAINING_DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field-row">
              <label>Stage</label>
              <select className="portal-field" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Payment records */}
          {canHistory ? (
            <div className="pay-panel">
              <div className="pay-panel-head">
                <span>Payment Records</span>
                {fully ? <span className="pay-tag pay-full">Fully Paid</span> : <span className="pay-tag pay-partial">Balance {peso(balance)}</span>}
              </div>
              <div className="pay-bar"><div className="pay-bar-fill" style={{ width: `${due ? Math.min(100, (paidTotal / due) * 100) : 0}%` }} /></div>
              <div className="pay-nums"><span>Paid: <strong>{peso(paidTotal)}</strong></span><span>Due: <strong>{peso(due)}</strong></span></div>

              <div className="pay-records">
                {payments.length === 0 && <div className="pay-empty">No payments recorded yet.</div>}
                {payments.map((p) => (
                  <div className="pay-record" key={p.id}>
                    {editingPay === p.id ? (
                      <>
                        <input className="portal-field sm pay-edit-input" type="number" defaultValue={p.amount}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEditPayment(p.id, parseFloat(e.target.value)); }}
                          id={`pay-${p.id}`} autoFocus />
                        <button className="pay-rec-save" onClick={() => handleEditPayment(p.id, parseFloat(document.getElementById(`pay-${p.id}`).value))}>Save</button>
                        <button className="pay-rec-cancel" onClick={() => setEditingPay(null)}>✕</button>
                      </>
                    ) : (
                      <>
                        <span className="pay-rec-amt">{peso(p.amount)}</span>
                        <span className="pay-rec-date">{fmtDateTime(p.paid_on)}</span>
                        <button className="pay-rec-edit" onClick={() => setEditingPay(p.id)}>Edit</button>
                        <button className="pay-rec-del" onClick={() => handleDeletePayment(p.id)}>Delete</button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="pay-add">
                <input className="portal-field" type="number" placeholder="Amount (₱)" value={newPay} onChange={(e) => setNewPay(e.target.value)} />
                <input className="portal-field" type="date" value={newPayDate} onChange={(e) => setNewPayDate(e.target.value)} />
                <button className="portal-btn" onClick={handleAddPayment}>Record</button>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>Total paid is the sum of records. Lead counts as revenue only when fully paid.</p>
            </div>
          ) : (
            <div className="pay-panel">
              <div className="pay-panel-head"><span>Payment Records</span></div>
              <p className="muted" style={{ fontSize: 12.5 }}>{createMode ? 'Save the lead first, then reopen it to record payments.' : 'Payment records require a live Supabase connection.'}</p>
            </div>
          )}

          {/* Notes history */}
          {canHistory ? (
            <div className="field-row">
              <label>Notes History</label>
              <div className="note-add">
                <textarea className="portal-field" rows={2} placeholder="Write a note…" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                <button className="portal-btn" onClick={handleAddNote} disabled={!newNote.trim()}>Save Note</button>
              </div>
              <div className="note-list">
                {notes.length === 0 && <div className="note-empty">No notes yet.</div>}
                {notes.map((n) => (
                  <div className="note-item" key={n.id}>
                    {editingNote === n.id ? (
                      <>
                        <textarea className="portal-field sm" rows={2} defaultValue={n.body} id={`note-${n.id}`} autoFocus />
                        <div className="note-item-actions">
                          <button className="pay-rec-save" onClick={() => handleEditNote(n.id, document.getElementById(`note-${n.id}`).value)}>Save</button>
                          <button className="pay-rec-cancel" onClick={() => setEditingNote(null)}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="note-body">{n.body}</div>
                        <div className="note-foot">
                          <span className="note-time">{fmtDateTime(n.created_at)}</span>
                          <button className="note-edit" onClick={() => setEditingNote(n.id)}>Edit</button>
                          <button className="note-del" onClick={() => handleDeleteNote(n.id)}>Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="field-row">
              <label>Notes</label>
              <p className="muted" style={{ fontSize: 12.5 }}>{createMode ? 'Save the lead first, then reopen it to add notes.' : 'Notes require a live Supabase connection.'}</p>
            </div>
          )}
        </div>

        <div className="modal-foot">
          {!createMode && onDelete && <button className="portal-btn-danger modal-delete" onClick={onDelete}>Delete Lead</button>}
          <div className="modal-foot-right">
            <button className="portal-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="portal-btn" onClick={save}>{createMode ? 'Create Lead' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
