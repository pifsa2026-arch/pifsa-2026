import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { AUTOMATION_TRIGGERS, AUTOMATION_ACTIONS, STAGES } from '../../lib/config.js';

// ─── Sample data for preview mode ────────────────────────────────────────────
const SAMPLE_AUTOMATIONS = [
  {
    id: 1, name: 'Welcome new leads', enabled: true, run_count: 128,
    trigger: { type: 'lead_created' },
    steps: [
      { type: 'send_email', subject: 'Welcome to PIFSA, {{name}}!', body: 'Hi {{name}},\n\nThank you for your interest in PIFSA! Here are your next steps to enroll in {{programs}}.\n\nBest regards,\nPIFSA Team' },
      { type: 'delay', hours: 48 },
      { type: 'send_email', subject: 'Your requirements — {{name}}', body: 'Hi {{name}},\n\nA quick reminder on the documents needed to complete your enrollment.' },
    ],
  },
  {
    id: 2, name: 'Admitted → payment reminder', enabled: true, run_count: 41,
    trigger: { type: 'stage_changed', stage: 'Admitted' },
    steps: [
      { type: 'send_email', subject: 'You\'re admitted — secure your slot!', body: 'Hi {{name}},\n\nCongratulations! Please settle your down payment at your earliest convenience to confirm your slot.' },
    ],
  },
  {
    id: 3, name: 'No-reply follow-up', enabled: false, run_count: 12,
    trigger: { type: 'no_reply', hours: 72 },
    steps: [{ type: 'send_email', subject: 'Still interested, {{name}}?', body: 'Hi {{name}},\n\nJust checking in on your application. Let us know if you have any questions.' }],
  },
];

const APPS_SCRIPT_CODE = `// ─── PIFSA Email Automation — Google Apps Script ───────────────────────────
// 1. Go to script.google.com → New project → paste this code
// 2. Fill in SUPABASE_URL and SUPABASE_ANON_KEY below
// 3. Run setupTrigger() ONCE to start the 5-minute email sender
// 4. Deploy as Web App (Execute as: Me, Access: Anyone) → copy the URL
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL    = 'YOUR_SUPABASE_URL';          // e.g. https://xxxx.supabase.co
const SUPABASE_KEY    = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'; // Project Settings → API → service_role (secret)
const FROM_NAME       = 'PIFSA';
const REPLY_TO        = 'pifsa2026@gmail.com';

// ── Core: fetch pending jobs and send them ────────────────────────────────────
function processPendingJobs() {
  const res = fetch_('/rest/v1/automation_jobs?status=eq.pending&order=created_at.asc&limit=50', 'GET');
  if (!res) return;

  const jobs = JSON.parse(res);
  Logger.log('Pending jobs: ' + jobs.length);

  for (const job of jobs) {
    try {
      GmailApp.sendEmail(
        job.to_email,
        job.subject,
        job.body_text,
        {
          name: FROM_NAME,
          replyTo: REPLY_TO,
          htmlBody: (job.body_text || '').replace(/\\n/g, '<br>'),
        }
      );
      patch_(job.id, { status: 'sent', sent_at: new Date().toISOString() });
      Logger.log('✓ Sent to ' + job.to_email + ' — ' + job.subject);
    } catch (err) {
      patch_(job.id, { status: 'failed', error_message: err.message });
      Logger.log('✗ Failed ' + job.id + ': ' + err.message);
    }
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function fetch_(path, method, body) {
  const opts = {
    method: method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    muteHttpExceptions: true,
  };
  if (body) opts.payload = JSON.stringify(body);
  const res = UrlFetchApp.fetch(SUPABASE_URL + path, opts);
  const code = res.getResponseCode();
  if (code >= 400) { Logger.log('HTTP ' + code + ': ' + res.getContentText()); return null; }
  return res.getContentText();
}

function patch_(id, data) {
  fetch_('/rest/v1/automation_jobs?id=eq.' + id, 'PATCH', data);
}

// ── Trigger setup — run this function ONCE ────────────────────────────────────
function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'processPendingJobs') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processPendingJobs').timeBased().everyMinutes(5).create();
  Logger.log('✓ Trigger set: processPendingJobs runs every 5 minutes');
}

// ── Optional: Web App endpoint (Deploy → Web App to enable) ──────────────────
function doPost(e) {
  processPendingJobs();
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

const SQL_SCHEMA = `-- Run this in your Supabase SQL Editor
create table if not exists automation_jobs (
  id            uuid primary key default gen_random_uuid(),
  automation_id text,
  automation_name text,
  lead_id       text,
  to_email      text not null,
  to_name       text,
  subject       text not null,
  body_text     text not null,
  status        text not null default 'pending',
  error_message text,
  created_at    timestamptz default now(),
  sent_at       timestamptz
);

create index if not exists auto_jobs_status_idx
  on automation_jobs (status, created_at);

alter table automation_jobs enable row level security;

create policy "anon can insert and read"
  on automation_jobs for all
  using (true) with check (true);`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const triggerLabel = (t) => {
  const def = AUTOMATION_TRIGGERS.find((x) => x.id === t.type);
  let s = def?.label || t.type;
  if (t.stage) s += ` · ${t.stage}`;
  if (t.hours) s += ` · ${t.hours}h`;
  return s;
};
const actionLabel = (a) => AUTOMATION_ACTIONS.find((x) => x.id === a.type)?.label || a.type;
const actionIcon  = (a) => AUTOMATION_ACTIONS.find((x) => x.id === a.type)?.icon || '•';

// ─── Main component ───────────────────────────────────────────────────────────
export default function AutomationDashboard() {
  const [view, setView]         = useState('workflows');
  const [items, setItems]       = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);
  const [jobs, setJobs]         = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [copied, setCopied]     = useState('');

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) { setItems(SAMPLE_AUTOMATIONS); setLoading(false); return; }
      const { data, error } = await supabase.from('automations').select('*').order('created_at', { ascending: false });
      if (error || !data) { setItems(SAMPLE_AUTOMATIONS); } else { setItems(data); setConnected(true); }
      setLoading(false);
    };
    load();
  }, []);

  const loadJobs = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setJobsLoading(true);
    const { data } = await supabase.from('automation_jobs').select('*').order('created_at', { ascending: false }).limit(50);
    setJobs(data || []);
    setJobsLoading(false);
  }, []);

  useEffect(() => { if (view === 'history') loadJobs(); }, [view, loadJobs]);

  const toggle = async (a) => {
    setItems((its) => its.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)));
    if (isSupabaseConfigured && connected) await supabase.from('automations').update({ enabled: !a.enabled }).eq('id', a.id);
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this automation?')) return;
    setItems((its) => its.filter((x) => x.id !== id));
    if (isSupabaseConfigured && connected) await supabase.from('automations').delete().eq('id', id);
  };
  const save = async (auto) => {
    if (auto.id && items.find((x) => x.id === auto.id)) {
      setItems((its) => its.map((x) => (x.id === auto.id ? auto : x)));
      if (isSupabaseConfigured && connected) await supabase.from('automations').update({ name: auto.name, trigger: auto.trigger, steps: auto.steps, enabled: auto.enabled }).eq('id', auto.id);
    } else {
      const row = { name: auto.name, trigger: auto.trigger, steps: auto.steps, enabled: true };
      if (isSupabaseConfigured && connected) {
        const { data } = await supabase.from('automations').insert([row]).select();
        if (data) setItems((its) => [data[0], ...its]);
      } else {
        setItems((its) => [{ id: Date.now(), run_count: 0, ...row }, ...its]);
      }
    }
    setEditing(null);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 2000); });
  };

  if (loading) return <div className="panel-loading">Loading…</div>;
  if (editing) return <AutomationBuilder initial={editing} onCancel={() => setEditing(null)} onSave={save} />;

  const activeCount = items.filter((x) => x.enabled).length;
  const totalRuns   = items.reduce((s, x) => s + (x.run_count || 0), 0);

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="view-toggle">
          {[['workflows', '⚡ Workflows'], ['setup', '🔧 Setup'], ['history', '📋 History']].map(([id, label]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        {view === 'workflows' && (
          <button className="portal-btn" onClick={() => setEditing({ name: '', trigger: { type: 'lead_created' }, steps: [] })}>
            ＋ New Automation
          </button>
        )}
        {view === 'history' && (
          <button className="portal-btn-ghost" onClick={loadJobs}>↺ Refresh</button>
        )}
      </div>

      {/* ── WORKFLOWS ── */}
      {view === 'workflows' && (
        <div>
          {!connected && (
            <div className="notice">
              Preview mode — showing sample automations. Connect Supabase to persist. Go to <strong>Setup</strong> to configure Gmail sending via Apps Script.
            </div>
          )}

          <div className="kpi-grid kpi-sm" style={{ marginBottom: 24 }}>
            <div className="kpi-card"><div className="kpi-value">{items.length}</div><div className="kpi-label">Total Workflows</div></div>
            <div className="kpi-card"><div className="kpi-value">{activeCount}</div><div className="kpi-label">Active</div></div>
            <div className="kpi-card"><div className="kpi-value">{totalRuns.toLocaleString()}</div><div className="kpi-label">Total Runs</div></div>
          </div>

          <div className="auto-list">
            {items.map((a) => (
              <div className={'auto-card' + (a.enabled ? '' : ' disabled')} key={a.id}>
                <div className="auto-card-main" onClick={() => setEditing(a)}>
                  <div className="auto-card-head">
                    <span className={'auto-status' + (a.enabled ? ' on' : '')}>{a.enabled ? 'Active' : 'Paused'}</span>
                    <h3>{a.name}</h3>
                  </div>
                  <div className="auto-flow">
                    <div className="auto-node trigger"><span className="auto-node-kind">When</span>{triggerLabel(a.trigger)}</div>
                    {a.steps.map((s, i) => (
                      <div className="auto-node-wrap" key={i}>
                        <span className="auto-arrow">→</span>
                        <div className={'auto-node ' + (s.type === 'delay' ? 'delay' : 'action')}>
                          <span className="auto-node-icon">{actionIcon(s)}</span>
                          {s.type === 'delay' ? `Wait ${s.hours}h` : actionLabel(s)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="auto-meta">{a.run_count || 0} runs · click to edit</div>
                </div>
                <div className="auto-card-side">
                  <label className="switch"><input type="checkbox" checked={a.enabled} onChange={() => toggle(a)} /><span className="switch-slider" /></label>
                  <button className="auto-del" onClick={() => remove(a.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SETUP ── */}
      {view === 'setup' && <SetupPanel copy={copy} copied={copied} />}

      {/* ── HISTORY ── */}
      {view === 'history' && (
        <div>
          {!isSupabaseConfigured && (
            <div className="notice">Connect Supabase to see real email job history.</div>
          )}
          {jobsLoading
            ? <div className="panel-loading">Loading…</div>
            : jobs.length === 0
              ? <div className="admin-empty">No email jobs yet. Create an automation and trigger an event in the CRM.</div>
              : (
                <div className="table-wrap">
                  <table className="crm-table sm">
                    <thead>
                      <tr>
                        <th>Recipient</th>
                        <th>Subject</th>
                        <th>Automation</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((j) => (
                        <tr key={j.id}>
                          <td><div style={{ fontWeight: 600 }}>{j.to_name}</div><div className="cell-sub">{j.to_email}</div></td>
                          <td>{j.subject}</td>
                          <td><span className="source-tag">{j.automation_name || '—'}</span></td>
                          <td><JobStatusBadge status={j.status} /></td>
                          <td className="cell-sub">{j.created_at ? new Date(j.created_at).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          }
        </div>
      )}
    </div>
  );
}

// ─── Job status badge ─────────────────────────────────────────────────────────
function JobStatusBadge({ status }) {
  const styles = {
    sent:    { background: '#d4f0e3', color: '#1a7048' },
    pending: { background: '#fef3d6', color: '#956a00' },
    failed:  { background: '#fde8e8', color: '#9e2828' },
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
      {status || 'pending'}
    </span>
  );
}

// ─── Setup panel ──────────────────────────────────────────────────────────────
function SetupPanel({ copy, copied }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 820 }}>

      {/* Step 1 */}
      <SetupCard step={1} title="Create the Supabase table" desc="Run this SQL in your Supabase project (SQL Editor tab). This creates the queue that holds pending emails.">
        <CodeBlock code={SQL_SCHEMA} copyKey="sql" copy={copy} copied={copied} lang="sql" />
      </SetupCard>

      {/* Step 2 */}
      <SetupCard step={2} title="Create the Google Apps Script" desc={<>Go to <a href="https://script.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>script.google.com</a> → New project → paste the code below. Fill in your Supabase URL and <strong>service role key</strong> (Supabase → Project Settings → API → <code style={{background:'#eef1f6',padding:'1px 5px',borderRadius:4}}>service_role</code>). Keep this key private — never put it in your frontend code.</>}>
        <CodeBlock code={APPS_SCRIPT_CODE} copyKey="gas" copy={copy} copied={copied} lang="javascript" />
      </SetupCard>

      {/* Step 3 */}
      <SetupCard step={3} title="Set up the email trigger" desc="In the Apps Script editor, run the setupTrigger() function once. This makes Apps Script check for pending emails every 5 minutes and send them from pifsa2026@gmail.com.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['1', 'In the Apps Script editor, select setupTrigger from the function dropdown at the top'],
            ['2', 'Click ▶ Run — it will ask for Gmail permission. Click Review permissions → Allow'],
            ['3', 'That\'s it! Apps Script will now send queued emails every 5 minutes automatically'],
          ].map(([n, text]) => (
            <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 13.5, color: '#1e2d40' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flex: '0 0 auto' }}>{n}</div>
              <div style={{ lineHeight: 1.6, paddingTop: 3 }}>{text}</div>
            </div>
          ))}
        </div>
      </SetupCard>

      {/* Step 4 */}
      <SetupCard step={4} title="Use template variables in your email body" desc="When writing email subjects and bodies in the automation builder, you can use these placeholders:">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['{{name}}', 'Lead\'s full name'],
            ['{{first_name}}', 'First name only'],
            ['{{email}}', 'Lead\'s email address'],
            ['{{phone}}', 'Contact number'],
            ['{{programs}}', 'Enrolled programs'],
            ['{{duration}}', 'Training duration'],
            ['{{stage}}', 'Current CRM stage'],
          ].map(([v, desc]) => (
            <div key={v} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f7f9fc', border: '1px solid #e4eaf2', borderRadius: 9, padding: '9px 12px' }}>
              <code style={{ background: '#e8edf5', color: 'var(--navy)', padding: '2px 8px', borderRadius: 5, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{v}</code>
              <span style={{ fontSize: 12.5, color: '#5a6a7e' }}>{desc}</span>
            </div>
          ))}
        </div>
      </SetupCard>

      {/* How it works */}
      <div style={{ background: 'linear-gradient(135deg, #001530, #002050)', borderRadius: 18, padding: '24px 28px', color: '#fff' }}>
        <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gold-2)', marginBottom: 14 }}>How it works</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['CRM event fires', 'A lead is created, changes stage, or makes a payment'],
            ['Job queued', 'The app writes a row to automation_jobs in Supabase'],
            ['Apps Script picks it up', 'Every 5 minutes, Apps Script reads pending jobs and sends the email via pifsa2026@gmail.com'],
            ['Job marked sent', 'The row is updated to status = sent. You can see the history in the History tab'],
          ].map(([title, desc], i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(184,134,11,0.25)', border: '1px solid rgba(184,134,11,0.5)', color: 'var(--gold-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flex: '0 0 auto' }}>{i + 1}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetupCard({ step, title, desc, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4eaf2', borderRadius: 18, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,32,80,0.04), 0 8px 24px rgba(0,32,80,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flex: '0 0 auto' }}>
          {step}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)', marginBottom: 5 }}>{title}</div>
          <div style={{ fontSize: 13.5, color: '#5a6a7e', lineHeight: 1.6 }}>{desc}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function CodeBlock({ code, copyKey, copy, copied, lang }) {
  return (
    <div style={{ position: 'relative' }}>
      <pre style={{ background: '#0f1927', color: '#c8d8f0', fontSize: 11.5, lineHeight: 1.7, borderRadius: 12, padding: '18px 20px', overflow: 'auto', maxHeight: 320, margin: 0, fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace" }}>
        <code>{code}</code>
      </pre>
      <button
        onClick={() => copy(code, copyKey)}
        style={{ position: 'absolute', top: 10, right: 10, background: copied === copyKey ? '#1a7048' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
      >
        {copied === copyKey ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

// ─── Automation Builder ───────────────────────────────────────────────────────
function AutomationBuilder({ initial, onCancel, onSave }) {
  const [name,    setName]    = useState(initial.name || '');
  const [trigger, setTrigger] = useState(initial.trigger || { type: 'lead_created' });
  const [steps,   setSteps]   = useState(initial.steps || []);

  const triggerDef = AUTOMATION_TRIGGERS.find((t) => t.id === trigger.type);

  const addStep = (type) => {
    const def = AUTOMATION_ACTIONS.find((a) => a.id === type);
    const step = { type };
    def.fields.forEach((f) => (step[f] = f === 'hours' ? 24 : ''));
    if (type === 'move_stage') step.stage = STAGES[0];
    setSteps((s) => [...s, step]);
  };
  const updateStep = (i, patch) => setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  const removeStep = (i) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const moveStep = (i, dir) => setSteps((s) => {
    const n = [...s]; const j = i + dir;
    if (j < 0 || j >= n.length) return n;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  return (
    <div className="builder">
      <div className="builder-head">
        <input className="builder-name" placeholder="Automation name…" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="builder-actions">
          <button className="portal-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="portal-btn" disabled={!name.trim() || steps.length === 0} onClick={() => onSave({ ...initial, name: name.trim(), trigger, steps })}>
            Save Automation
          </button>
        </div>
      </div>

      {/* Trigger */}
      <div className="builder-section">
        <div className="builder-label">When this happens (trigger)</div>
        <div className="trigger-grid">
          {AUTOMATION_TRIGGERS.map((t) => (
            <button key={t.id} className={'trigger-opt' + (trigger.type === t.id ? ' active' : '')}
              onClick={() => setTrigger({ type: t.id, ...(t.needsStage ? { stage: STAGES[3] } : {}), ...(t.needsHours ? { hours: 72 } : {}) })}>
              <div className="trigger-opt-label">{t.label}</div>
              <div className="trigger-opt-desc">{t.desc}</div>
            </button>
          ))}
        </div>
        {triggerDef?.needsStage && (
          <div className="trigger-config">
            <label>Which stage?</label>
            <select className="portal-field sm" value={trigger.stage} onChange={(e) => setTrigger({ ...trigger, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}
        {triggerDef?.needsHours && (
          <div className="trigger-config">
            <label>After how many hours?</label>
            <input className="portal-field sm" type="number" value={trigger.hours} onChange={(e) => setTrigger({ ...trigger, hours: parseInt(e.target.value) || 0 })} />
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="builder-section">
        <div className="builder-label">Then do this (actions)</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          Use <code style={{ background: '#eef1f6', padding: '1px 6px', borderRadius: 4 }}>{'{{name}}'}</code>, <code style={{ background: '#eef1f6', padding: '1px 6px', borderRadius: 4 }}>{'{{email}}'}</code>, <code style={{ background: '#eef1f6', padding: '1px 6px', borderRadius: 4 }}>{'{{programs}}'}</code> etc. in email text.
        </div>
        <div className="step-flow">
          <div className="step-node trigger-node">▶ {triggerLabel(trigger)}</div>
          {steps.map((s, i) => (
            <div className="step-node-block" key={i}>
              <div className="step-connector" />
              <div className="step-node">
                <div className="step-node-top">
                  <span className="step-node-title">{actionIcon(s)} {actionLabel(s)}</span>
                  <div className="step-node-ctrl">
                    <button onClick={() => moveStep(i, -1)} disabled={i === 0}>↑</button>
                    <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>↓</button>
                    <button onClick={() => removeStep(i)} className="step-del">×</button>
                  </div>
                </div>
                <StepFields step={s} onChange={(patch) => updateStep(i, patch)} />
              </div>
            </div>
          ))}
          <div className="step-connector" />
          <div className="add-action-row">
            {AUTOMATION_ACTIONS.map((a) => (
              <button key={a.id} className="add-action-btn" onClick={() => addStep(a.id)}>{a.icon} {a.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepFields({ step, onChange }) {
  if (step.type === 'delay') {
    return <div className="step-fields"><label>Wait</label><input className="portal-field sm" type="number" value={step.hours} onChange={(e) => onChange({ hours: parseInt(e.target.value) || 0 })} /><span className="step-unit">hours</span></div>;
  }
  if (step.type === 'move_stage') {
    return <div className="step-fields"><select className="portal-field sm" value={step.stage} onChange={(e) => onChange({ stage: e.target.value })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></div>;
  }
  if (step.type === 'send_email') {
    return (
      <div className="step-fields col">
        <input className="portal-field sm" placeholder="Subject — e.g. Welcome to PIFSA, {{name}}!" value={step.subject} onChange={(e) => onChange({ subject: e.target.value })} />
        <textarea className="portal-field sm" rows={3} placeholder={'Body — e.g. Hi {{name}},\n\nThank you for enrolling in {{programs}}.'} value={step.body} onChange={(e) => onChange({ body: e.target.value })} />
      </div>
    );
  }
  if (step.type === 'send_sms') {
    return <div className="step-fields"><input className="portal-field sm" placeholder="SMS message — e.g. Hi {{name}}, your slot is confirmed!" value={step.body} onChange={(e) => onChange({ body: e.target.value })} /></div>;
  }
  if (step.type === 'add_note') {
    return <div className="step-fields"><input className="portal-field sm" placeholder="Note text" value={step.body} onChange={(e) => onChange({ body: e.target.value })} /></div>;
  }
  if (step.type === 'add_tag') {
    return <div className="step-fields"><input className="portal-field sm" placeholder="Tag name" value={step.tag} onChange={(e) => onChange({ tag: e.target.value })} /></div>;
  }
  if (step.type === 'assign_staff') {
    return <div className="step-fields"><input className="portal-field sm" placeholder="Staff name or role" value={step.staff} onChange={(e) => onChange({ staff: e.target.value })} /></div>;
  }
  return null;
}
