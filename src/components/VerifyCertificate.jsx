import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

export default function VerifyCertificate({ onClose }) {
  const [cert, setCert] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | found | missing | error
  const [result, setResult] = useState(null);
  const [checked, setChecked] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const verify = async () => {
    const value = cert.trim();
    if (!value || status === 'checking') return;
    setChecked(value);
    if (!isSupabaseConfigured) { setStatus('error'); return; }
    setStatus('checking');
    const { data, error } = await supabase.rpc('verify_certificate', { cert: value });
    if (error) { setStatus('error'); return; }
    if (data?.length) { setResult(data[0]); setStatus('found'); } else { setResult(null); setStatus('missing'); }
  };

  return (
    <div className="verify-backdrop" onClick={onClose}>
      <div className="verify-modal" role="dialog" aria-modal="true" aria-label="Verify a training certificate" onClick={(e) => e.stopPropagation()}>
        <button className="verify-close" onClick={onClose} aria-label="Close">×</button>
        <h2>Verify a Training Certificate</h2>
        <p className="verify-sub">Enter the training certificate number printed on the certificate to confirm that it was issued by PIFSA.</p>

        <div className="verify-row">
          <input
            className="verify-input" autoFocus placeholder="Training certificate number"
            value={cert} onChange={(e) => setCert(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verify()}
          />
          <button className="verify-btn" onClick={verify} disabled={!cert.trim() || status === 'checking'}>
            {status === 'checking' ? 'Checking…' : 'Verify'}
          </button>
        </div>

        {status === 'found' && result && (
          <div className="verify-result ok">
            <div className="verify-badge">✓ Verified completer</div>
            <dl>
              <div><dt>Full name</dt><dd>{result.full_name}</dd></div>
              <div><dt>Program taken</dt><dd>{result.program}</dd></div>
              <div><dt>Date of completion</dt><dd>{fmtDate(result.completed_on)}</dd></div>
            </dl>
          </div>
        )}
        {status === 'missing' && (
          <div className="verify-result bad">
            <strong>No record found for “{checked}”.</strong>
            <span>Check the number for typing errors. If it still does not match, contact PIFSA to confirm the certificate.</span>
          </div>
        )}
        {status === 'error' && (
          <div className="verify-result bad">
            <strong>Verification is unavailable right now.</strong>
            <span>Please try again in a few minutes or contact PIFSA directly.</span>
          </div>
        )}
      </div>
    </div>
  );
}
