import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { TRAINING_PROGRAMS, programsForDuration, durationsForProgram, durationNote } from '../lib/config.js';

const EMPTY = { full_name: '', email: '', contact_number: '', program: '', training_duration: '' };

export default function EnrollForm({ picked }) {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  // A course card's "Enroll" link pre-selects its program
  useEffect(() => {
    if (!picked) return;
    setForm((f) => ({ ...f, program: picked.program, training_duration: programsForDuration(f.training_duration).includes(picked.program) ? f.training_duration : '' }));
    setStatus((st) => (st === 'success' ? 'idle' : st));
  }, [picked]);

  // Some durations are open to certain programs only, so each list narrows to match the other
  const programOptions = form.training_duration ? programsForDuration(form.training_duration) : TRAINING_PROGRAMS;
  const durationOptions = durationsForProgram(form.program);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      setStatus('error'); setMessage('Please enter your name and email.'); return;
    }
    if (!form.program) {
      setStatus('error'); setMessage('Please select a training program.'); return;
    }
    if (!form.training_duration) {
      setStatus('error'); setMessage('Please select a training duration.'); return;
    }
    setStatus('submitting'); setMessage('');

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      contact_number: form.contact_number.trim(),
      programs: [form.program],
      training_duration: form.training_duration,
      stage: 'Applicants',
      source: 'landing_page',
    };

    if (!isSupabaseConfigured) {
      setStatus('success');
      setMessage('Thanks! Your inquiry has been received. We will be in touch shortly.');
      setForm(EMPTY);
      return;
    }

    const { error } = await supabase.from('leads').insert([payload]);
    if (error) {
      setStatus('error');
      setMessage('Something went wrong submitting your inquiry. Please try again or email us directly.');
      return;
    }
    setStatus('success');
    setMessage('Thanks! Your inquiry has been received. We will be in touch shortly.');
    setForm(EMPTY);
  };

  if (status === 'success') {
    return (
      <div className="form-success">
        <div className="form-success-icon">&#10003;</div>
        <p>{message}</p>
        <button className="submit-btn" onClick={() => setStatus('idle')}>Submit another</button>
      </div>
    );
  }

  return (
    <div className="enroll-form">
      <input className="form-field" placeholder="Full name" value={form.full_name} onChange={set('full_name')} />
      <input className="form-field" type="email" placeholder="Email address" value={form.email} onChange={set('email')} />
      <input className="form-field" placeholder="Contact number" value={form.contact_number} onChange={set('contact_number')} />

      <select className="form-field" value={form.program} onChange={set('program')}>
        <option value="">Select a training program</option>
        {programOptions.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      <select className="form-field" value={form.training_duration} onChange={set('training_duration')}>
        <option value="">Select a training duration</option>
        {durationOptions.map((d) => <option key={d} value={d}>{d}{durationNote(d)}</option>)}
      </select>

      <p className="form-hint">One program per application. To enroll in another program, submit a separate application after this one.</p>

      {status === 'error' && <div className="form-error">{message}</div>}
      <button className="submit-btn" onClick={submit} disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting…' : 'Submit Application'}
      </button>
    </div>
  );
}
