import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { TRAINING_PROGRAMS, TRAINING_DURATIONS } from '../lib/config.js';

const EMPTY = { full_name: '', email: '', contact_number: '', programs: [], training_duration: '' };

export default function EnrollForm() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [progOpen, setProgOpen] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleProgram = (p) =>
    setForm((f) => ({
      ...f,
      programs: f.programs.includes(p) ? f.programs.filter((x) => x !== p) : [...f.programs, p],
    }));

  const submit = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      setStatus('error'); setMessage('Please enter your name and email.'); return;
    }
    if (form.programs.length === 0) {
      setStatus('error'); setMessage('Please select at least one training program.'); return;
    }
    setStatus('submitting'); setMessage('');

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      contact_number: form.contact_number.trim(),
      programs: form.programs,
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

      <div className="ms-dropdown">
        <button type="button" className="ms-trigger" onClick={() => setProgOpen((v) => !v)}>
          <span className={form.programs.length ? '' : 'ms-placeholder'}>
            {form.programs.length === 0 ? 'Select training program(s)' : `${form.programs.length} program${form.programs.length > 1 ? 's' : ''} selected`}
          </span>
          <span className={'ms-caret' + (progOpen ? ' open' : '')}>▾</span>
        </button>
        {progOpen && (
          <div className="ms-menu">
            {TRAINING_PROGRAMS.map((p) => (
              <label key={p} className={'ms-option' + (form.programs.includes(p) ? ' checked' : '')}>
                <input type="checkbox" checked={form.programs.includes(p)} onChange={() => toggleProgram(p)} />
                <span>{p}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <select className="form-field" value={form.training_duration} onChange={set('training_duration')}>
        <option value="">Preferred training duration</option>
        {TRAINING_DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>

      {status === 'error' && <div className="form-error">{message}</div>}
      <button className="submit-btn" onClick={submit} disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting…' : 'Submit Application'}
      </button>
    </div>
  );
}
