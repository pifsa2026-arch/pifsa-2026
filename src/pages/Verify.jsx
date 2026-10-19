import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import '../styles/verify.css';

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
const fmtNow = (d) => d.toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function Verify() {
  const [params, setParams] = useSearchParams();
  const [cert, setCert] = useState(params.get('cert') || '');
  const [status, setStatus] = useState('idle'); // idle | checking | found | missing | error
  const [result, setResult] = useState(null);
  const [checked, setChecked] = useState({ value: '', at: null });
  const [copied, setCopied] = useState(false);

  const verify = useCallback(async (raw) => {
    const value = raw.trim();
    if (!value) return;
    setParams({ cert: value }, { replace: true });
    setChecked({ value, at: new Date() });
    setCopied(false);
    if (!isSupabaseConfigured) { setStatus('error'); return; }
    setStatus('checking');
    const { data, error } = await supabase.rpc('verify_certificate', { cert: value });
    if (error) { setStatus('error'); return; }
    if (data?.length) { setResult(data[0]); setStatus('found'); } else { setResult(null); setStatus('missing'); }
  }, [setParams]);

  // A shared link like /verify?cert=ABC checks immediately
  useEffect(() => {
    const initial = params.get('cert');
    if (initial) verify(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  };

  return (
    <div className="vp">
      <header className="vp-top">
        <Link to="/" className="vp-brand">
          <img src="/images/logo.png" alt="" />
          <span>Philippine Investigation and Forensic Science Academy</span>
        </Link>
        <Link to="/" className="vp-home">← Back to site</Link>
      </header>

      <div className="vp-hero">
        <div className="vp-hero-inner">
          <div className="vp-eyebrow">Certificate Verification</div>
          <h1>Confirm a PIFSA training certificate</h1>
          <p>Employers, agencies and schools can check that a certificate was issued by PIFSA. Enter the training certificate number exactly as printed on the certificate.</p>
          <form className="vp-form" onSubmit={(e) => { e.preventDefault(); verify(cert); }}>
            <input
              className="vp-input" value={cert} onChange={(e) => setCert(e.target.value)}
              placeholder="Training certificate number" aria-label="Training certificate number" autoFocus={!params.get('cert')}
            />
            <button className="vp-btn" type="submit" disabled={!cert.trim() || status === 'checking'}>
              {status === 'checking' ? 'Checking…' : 'Verify'}
            </button>
          </form>
        </div>
      </div>

      <main className="vp-main">
        {status === 'found' && result && (
          <article className="vp-result ok">
            <div className="vp-result-head">
              <div className="vp-seal" aria-hidden="true">✓</div>
              <div>
                <div className="vp-result-kicker">Verified</div>
                <h2>This certificate is valid</h2>
                <p>Issued by the Philippine Investigation and Forensic Science Academy.</p>
              </div>
            </div>
            <dl className="vp-fields">
              <div><dt>Full name</dt><dd>{result.full_name}</dd></div>
              <div><dt>Program taken</dt><dd>{result.program}</dd></div>
              <div><dt>Date of completion</dt><dd>{fmtDate(result.completed_on)}</dd></div>
              <div><dt>Certificate number</dt><dd className="vp-mono">{checked.value}</dd></div>
            </dl>
            <div className="vp-result-foot">
              <span>Checked on {fmtNow(checked.at)}</span>
              <div className="vp-actions">
                <button onClick={copyLink}>{copied ? 'Link copied' : 'Copy verification link'}</button>
                <button onClick={() => window.print()}>Print or save as PDF</button>
              </div>
            </div>
          </article>
        )}

        {status === 'missing' && (
          <article className="vp-result bad">
            <div className="vp-result-head">
              <div className="vp-seal" aria-hidden="true">!</div>
              <div>
                <div className="vp-result-kicker">No match</div>
                <h2>No record found for “{checked.value}”</h2>
                <p>Check the number for typing errors, including dashes and letters. If it still does not match, contact PIFSA so we can confirm the certificate directly.</p>
              </div>
            </div>
            <div className="vp-contact">
              <a href="mailto:pifsa2017@gmail.com">pifsa2017@gmail.com</a>
              <a href="tel:+639772778345">0977 277 8345</a>
            </div>
          </article>
        )}

        {status === 'error' && (
          <article className="vp-result bad">
            <div className="vp-result-head">
              <div className="vp-seal" aria-hidden="true">!</div>
              <div>
                <div className="vp-result-kicker">Unavailable</div>
                <h2>Verification is unavailable right now</h2>
                <p>Please try again in a few minutes or contact PIFSA directly.</p>
              </div>
            </div>
          </article>
        )}

        {status === 'idle' && (
          <div className="vp-how">
            {[
              ['1', 'Find the number', 'The training certificate number is printed on every PIFSA certificate.'],
              ['2', 'Enter it above', 'Letter case does not matter. Include any dashes.'],
              ['3', 'See the record', 'A valid certificate shows the holder’s name, program and completion date.'],
            ].map(([n, t, d]) => (
              <div className="vp-how-step" key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        )}

        <p className="vp-privacy">For privacy, verification only shows the holder’s name, program and date of completion.</p>
      </main>
    </div>
  );
}
