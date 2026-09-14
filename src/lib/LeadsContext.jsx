import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { TRAINING_PROGRAMS, TRAINING_DURATIONS } from './config.js';
import { fireAutomationEvent } from './automationEngine.js';
import { leadTotalDue } from './config.js';

const LeadsContext = createContext(null);

// Sample data for preview / dev mode (no Supabase needed).
const SAMPLE_LEADS = [
  { id: 1, full_name: 'Anna Reyes', email: 'anna@example.com', contact_number: '0917 000 0001', programs: ['Forensic Psychology'], training_duration: TRAINING_DURATIONS[0], stage: 'Leads', source: 'landing_page', amount_paid: 0, notes: '' },
  { id: 2, full_name: 'Mark Santos', email: 'mark@example.com', contact_number: '0917 000 0002', programs: ['Cyber Security and Investigation', 'Fraud Detection and Investigation'], training_duration: TRAINING_DURATIONS[0], stage: 'Applicants', source: 'landing_page', amount_paid: 5000, notes: 'Paid ₱5k downpayment' },
  { id: 3, full_name: 'Grace Lim', email: 'grace@example.com', contact_number: '0917 000 0003', programs: ['Legal Investigation'], training_duration: TRAINING_DURATIONS[1], stage: 'Applicants', source: 'referral', amount_paid: 0, notes: '' },
  { id: 4, full_name: 'Paolo Cruz', email: 'paolo@example.com', contact_number: '0917 000 0004', programs: ['Forensic Accounting and Investigation'], training_duration: TRAINING_DURATIONS[1], stage: 'For Requirements', source: 'landing_page', amount_paid: 10000, notes: 'Submitting TOR' },
  { id: 5, full_name: 'Divine Aquino', email: 'divine@example.com', contact_number: '0917 000 0005', programs: ['Strategic Intelligence'], training_duration: TRAINING_DURATIONS[2], stage: 'Admitted', source: 'walk_in', amount_paid: 15000, notes: 'Staggered plan' },
  { id: 6, full_name: 'Jerome Tan', email: 'jerome@example.com', contact_number: '0917 000 0006', programs: ['Corporate Security and Investigation', 'Legal Investigation'], training_duration: TRAINING_DURATIONS[0], stage: 'Paid', source: 'landing_page', amount_paid: 50000, notes: 'Fully paid — 2 programs' },
  { id: 7, full_name: 'Bea Flores', email: 'bea@example.com', contact_number: '0917 000 0007', programs: ['Forensic Document Examination'], training_duration: TRAINING_DURATIONS[2], stage: 'Paid', source: 'referral', amount_paid: 25000, notes: 'Fully paid' },
  { id: 8, full_name: 'Ryan Uy', email: 'ryan@example.com', contact_number: '0917 000 0008', programs: ['Forensic Ballistics and Firearms Identification'], training_duration: TRAINING_DURATIONS[3], stage: 'Leads', source: 'landing_page', amount_paid: 0, notes: '' },
];

export function LeadsProvider({ children }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLeads(SAMPLE_LEADS);
      setConnected(false);
      setLoading(false);
      return;
    }
    const { data, error: readErr } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (readErr) {
      // Surface the real reason instead of silently showing sample data.
      setError(readErr.message || JSON.stringify(readErr));
      setLeads([]);
      setConnected(true); // we ARE configured; the read just failed
    } else {
      setError(null);
      setLeads(data || []);
      setConnected(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateLead = useCallback(async (id, patch) => {
    setLeads((ls) => {
      const prev = ls.find((l) => l.id === id);
      const next = prev ? { ...prev, ...patch } : null;
      // Fire stage_changed automation if stage was updated
      if (next && patch.stage && prev?.stage !== patch.stage) {
        fireAutomationEvent('stage_changed', next, { stage: patch.stage });
      }
      return ls.map((l) => (l.id === id ? { ...l, ...patch } : l));
    });
    if (isSupabaseConfigured && connected) {
      const { error } = await supabase.from('leads').update(patch).eq('id', id);
      if (error) { alert('Could not save changes: ' + error.message); return false; }
    }
    return true;
  }, [connected]);

  const addLead = useCallback(async (lead) => {
    const row = { stage: 'Applicants', source: 'manual', amount_paid: 0, programs: [], ...lead };
    if (isSupabaseConfigured && connected) {
      const { data, error } = await supabase.from('leads').insert([row]).select();
      if (error) { alert('Could not add lead: ' + error.message); return null; }
      if (data) {
        setLeads((ls) => [data[0], ...ls]);
        fireAutomationEvent('lead_created', data[0]);
        return data[0];
      }
    }
    const local = { id: Date.now(), created_at: new Date().toISOString(), ...row };
    setLeads((ls) => [local, ...ls]);
    fireAutomationEvent('lead_created', local);
    return local;
  }, [connected]);

  const deleteLeads = useCallback(async (ids) => {
    setLeads((ls) => ls.filter((l) => !ids.includes(l.id)));
    if (isSupabaseConfigured && connected) {
      await supabase.from('leads').delete().in('id', ids);
    }
  }, [connected]);

  // ---- Payments (per lead) ----
  const fetchPayments = useCallback(async (leadId) => {
    if (!isSupabaseConfigured || !connected) return [];
    const { data } = await supabase.from('payments').select('*').eq('lead_id', leadId).order('paid_on', { ascending: false });
    return data || [];
  }, [connected]);

  const syncLeadPaidTotal = useCallback(async (leadId, total) => {
    setLeads((ls) => {
      const prev = ls.find((l) => l.id === leadId);
      const updated = prev ? { ...prev, amount_paid: total } : null;
      if (updated) {
        fireAutomationEvent('payment_received', updated);
        if (leadTotalDue(updated) > 0 && total >= leadTotalDue(updated)) {
          fireAutomationEvent('fully_paid', updated);
        }
      }
      return ls.map((l) => (l.id === leadId ? { ...l, amount_paid: total } : l));
    });
    if (isSupabaseConfigured && connected) await supabase.from('leads').update({ amount_paid: total }).eq('id', leadId);
  }, [connected]);

  const addPayment = useCallback(async (leadId, amount, paidOn) => {
    if (!isSupabaseConfigured || !connected) return null;
    const { data, error } = await supabase.from('payments').insert([{ lead_id: leadId, amount, paid_on: paidOn || new Date().toISOString() }]).select();
    if (error) { alert('Could not add payment: ' + error.message); return null; }
    return data ? data[0] : null;
  }, [connected]);

  const updatePayment = useCallback(async (paymentId, patch) => {
    if (!isSupabaseConfigured || !connected) return;
    await supabase.from('payments').update(patch).eq('id', paymentId);
  }, [connected]);

  const deletePayment = useCallback(async (paymentId) => {
    if (!isSupabaseConfigured || !connected) return;
    await supabase.from('payments').delete().eq('id', paymentId);
  }, [connected]);

  // ---- Notes (per lead) ----
  const fetchNotes = useCallback(async (leadId) => {
    if (!isSupabaseConfigured || !connected) return [];
    const { data } = await supabase.from('lead_notes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
    return data || [];
  }, [connected]);

  const addNote = useCallback(async (leadId, body) => {
    if (!isSupabaseConfigured || !connected) return null;
    const { data, error } = await supabase.from('lead_notes').insert([{ lead_id: leadId, body }]).select();
    if (error) { alert('Could not save note: ' + error.message); return null; }
    return data ? data[0] : null;
  }, [connected]);

  const updateNote = useCallback(async (noteId, body) => {
    if (!isSupabaseConfigured || !connected) return;
    await supabase.from('lead_notes').update({ body }).eq('id', noteId);
  }, [connected]);

  const deleteNote = useCallback(async (noteId) => {
    if (!isSupabaseConfigured || !connected) return;
    await supabase.from('lead_notes').delete().eq('id', noteId);
  }, [connected]);

  return (
    <LeadsContext.Provider value={{ leads, loading, connected, error, updateLead, addLead, deleteLeads,
      fetchPayments, addPayment, updatePayment, deletePayment, syncLeadPaidTotal,
      fetchNotes, addNote, updateNote, deleteNote, reload: load }}>
      {children}
    </LeadsContext.Provider>
  );
}

export const useLeads = () => useContext(LeadsContext);
