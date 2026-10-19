import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { LETTERS } from '../../lib/examParser.js';
import { TYPE_LABEL } from './ExamEditor.jsx';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const chk = (r) => { if (r.error) throw new Error(r.error.message); return r; };
const pct = (a) => (a.max_score ? Math.round((Number(a.score) / Number(a.max_score)) * 1000) / 10 : 0);
const toLocalInput = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

function useAction(reload) {
  const [error, setError] = useState('');
  const run = async (fn) => {
    setError('');
    try { await fn(); await reload(); } catch (e) { setError(e.message); }
  };
  return [run, error];
}

/* ───────────── Examinees & groups ───────────── */
export function ExamineesTab({ data, reload }) {
  const { examinees, groups, members } = data;
  const [run, error] = useAction(reload);
  const [newGroup, setNewGroup] = useState('');
  const [picks, setPicks] = useState({}); // examinee id -> Set of group ids chosen while approving
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('approved');
  const [editing, setEditing] = useState(null);

  const groupsOf = (id) => members.filter((m) => m.examinee_id === id).map((m) => m.group_id);
  const pending = examinees.filter((e) => e.status === 'pending');
  const q = search.trim().toLowerCase();
  const listed = examinees.filter((e) => e.status === status && (!q || [e.full_name, e.email, e.contact_number].some((v) => (v || '').toLowerCase().includes(q))));

  const togglePick = (eid, gid) => setPicks((p) => {
    const s = new Set(p[eid] || []);
    if (s.has(gid)) s.delete(gid); else s.add(gid);
    return { ...p, [eid]: s };
  });

  const decide = (e, approve) => run(async () => {
    chk(await supabase.from('examinees').update({ status: approve ? 'approved' : 'rejected', decided_at: new Date().toISOString() }).eq('id', e.id));
    const chosen = [...(picks[e.id] || [])];
    if (approve && chosen.length) chk(await supabase.from('examinee_group_members').upsert(chosen.map((g) => ({ group_id: g, examinee_id: e.id }))));
  });

  const saveGroups = (e, chosen) => run(async () => {
    const current = groupsOf(e.id);
    const add = chosen.filter((g) => !current.includes(g));
    const drop = current.filter((g) => !chosen.includes(g));
    if (add.length) chk(await supabase.from('examinee_group_members').insert(add.map((g) => ({ group_id: g, examinee_id: e.id }))));
    if (drop.length) chk(await supabase.from('examinee_group_members').delete().eq('examinee_id', e.id).in('group_id', drop));
    setEditing(null);
  });

  return (
    <div className="xt">
      {error && <div className="completer-error">{error}</div>}

      <div className="xt-card">
        <div className="xt-card-head">
          <div><h3>Groups</h3><p>Put examinees in groups (for example a program and batch) so you can assign an exam to the whole group at once.</p></div>
        </div>
        <form className="xt-inline" onSubmit={(e) => { e.preventDefault(); if (newGroup.trim()) run(async () => { chk(await supabase.from('examinee_groups').insert([{ name: newGroup.trim() }])); setNewGroup(''); }); }}>
          <input className="portal-field sm" placeholder="New group name, e.g. Forensic Psychology – Batch 12" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} />
          <button className="portal-btn sm" disabled={!newGroup.trim()}>Create group</button>
        </form>
        <div className="xt-chips">
          {groups.length === 0 && <span className="xt-muted">No groups yet.</span>}
          {groups.map((g) => (
            <span className="xt-chip" key={g.id}>
              {g.name} <b>{members.filter((m) => m.group_id === g.id).length}</b>
              <button aria-label={`Delete ${g.name}`} onClick={() => window.confirm(`Delete the group "${g.name}"? Exams assigned to this group will be unassigned.`) && run(async () => chk(await supabase.from('examinee_groups').delete().eq('id', g.id)))}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="xt-card">
        <div className="xt-card-head"><div><h3>Waiting for approval <span className="xt-count">{pending.length}</span></h3><p>People who registered on the Exam Portal. Choose their groups, then approve.</p></div></div>
        {pending.length === 0 ? <div className="xt-empty">No pending registrations.</div> : (
          <div className="xt-pending">
            {pending.map((e) => (
              <div className="xt-pending-row" key={e.id}>
                <div className="xt-person">
                  <strong>{e.full_name}</strong>
                  <span>{e.email}{e.contact_number ? ` · ${e.contact_number}` : ''} · registered {fmt(e.created_at)}</span>
                </div>
                <div className="xt-pick">
                  {groups.length === 0 && <span className="xt-muted">Create a group first to assign them.</span>}
                  {groups.map((g) => (
                    <label key={g.id} className={(picks[e.id]?.has(g.id) ? 'on' : '')}>
                      <input type="checkbox" checked={Boolean(picks[e.id]?.has(g.id))} onChange={() => togglePick(e.id, g.id)} />{g.name}
                    </label>
                  ))}
                </div>
                <div className="xt-actions">
                  <button className="portal-btn sm" onClick={() => decide(e, true)}>Approve</button>
                  <button className="portal-btn-ghost" onClick={() => decide(e, false)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="xt-card">
        <div className="xt-card-head">
          <div><h3>Examinees</h3></div>
          <div className="xt-seg">
            {['approved', 'rejected'].map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s === 'approved' ? 'Approved' : 'Rejected'} ({examinees.filter((e) => e.status === s).length})</button>)}
          </div>
        </div>
        <input className="portal-field sm xt-search" placeholder="Search name, email or number" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="table-wrap">
          <table className="crm-table sm">
            <thead><tr><th>Name</th><th>Email</th><th>Groups</th><th></th></tr></thead>
            <tbody>
              {listed.length === 0 && <tr><td colSpan={4} className="empty-row">No examinees.</td></tr>}
              {listed.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.full_name}</td>
                  <td>{e.email}</td>
                  <td>
                    {editing === e.id ? (
                      <GroupPicker groups={groups} initial={groupsOf(e.id)} onSave={(chosen) => saveGroups(e, chosen)} onCancel={() => setEditing(null)} />
                    ) : (
                      <div className="xt-chips tight">
                        {groupsOf(e.id).map((gid) => <span className="xt-chip sm" key={gid}>{groups.find((g) => g.id === gid)?.name}</span>)}
                        {groupsOf(e.id).length === 0 && <span className="xt-muted">None</span>}
                      </div>
                    )}
                  </td>
                  <td className="xt-row-actions">
                    {editing !== e.id && status === 'approved' && <button onClick={() => setEditing(e.id)}>Groups</button>}
                    {status === 'approved'
                      ? <button className="del" onClick={() => window.confirm(`Revoke ${e.full_name}'s access? They will no longer see their exams.`) && run(async () => chk(await supabase.from('examinees').update({ status: 'rejected', decided_at: new Date().toISOString() }).eq('id', e.id)))}>Revoke</button>
                      : <button onClick={() => run(async () => chk(await supabase.from('examinees').update({ status: 'approved', decided_at: new Date().toISOString() }).eq('id', e.id)))}>Approve</button>}
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

function GroupPicker({ groups, initial, onSave, onCancel }) {
  const [chosen, setChosen] = useState(initial);
  return (
    <div className="xt-picker">
      {groups.map((g) => (
        <label key={g.id}><input type="checkbox" checked={chosen.includes(g.id)} onChange={() => setChosen((c) => (c.includes(g.id) ? c.filter((x) => x !== g.id) : [...c, g.id]))} />{g.name}</label>
      ))}
      <div><button className="portal-btn sm" onClick={() => onSave(chosen)}>Save</button> <button className="portal-btn-ghost" onClick={onCancel}>Cancel</button></div>
    </div>
  );
}

/* ───────────── Assignments ───────────── */
export function AssignmentsTab({ data, reload }) {
  const { exams, groups, examinees, members, assignments, attempts } = data;
  const [run, error] = useAction(reload);
  const approved = examinees.filter((e) => e.status === 'approved');
  const [form, setForm] = useState({ exam_id: '', target: '', opens_at: '', closes_at: '' });

  const targetName = (a) => (a.group_id ? groups.find((g) => g.id === a.group_id)?.name : examinees.find((e) => e.id === a.examinee_id)?.full_name) || '—';
  const headcount = (a) => (a.group_id ? members.filter((m) => m.group_id === a.group_id).length : 1);
  const finished = (a) => new Set(attempts.filter((x) => x.assignment_id === a.id && x.status !== 'in_progress').map((x) => x.examinee_id)).size;
  const state = (a) => {
    const now = Date.now();
    if (a.opens_at && new Date(a.opens_at) > now) return ['Scheduled', 'sched'];
    if (a.closes_at && new Date(a.closes_at) <= now) return ['Closed', 'closed'];
    return ['Open', 'open'];
  };

  const create = (e) => {
    e.preventDefault();
    const [kind, id] = form.target.split(':');
    run(async () => {
      if (!form.exam_id || !id) throw new Error('Choose an exam and who should take it.');
      if (form.opens_at && form.closes_at && new Date(form.closes_at) <= new Date(form.opens_at)) throw new Error('The closing time must be after the opening time.');
      chk(await supabase.from('exam_assignments').insert([{
        exam_id: form.exam_id, group_id: kind === 'g' ? id : null, examinee_id: kind === 'e' ? id : null,
        opens_at: form.opens_at ? new Date(form.opens_at).toISOString() : null,
        closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
      }]));
      setForm({ exam_id: '', target: '', opens_at: '', closes_at: '' });
    });
  };

  return (
    <div className="xt">
      {error && <div className="completer-error">{error}</div>}
      <div className="xt-card">
        <div className="xt-card-head"><div><h3>Assign an exam</h3><p>Give an exam template to a whole group or to one person. Leave the dates empty to open it right away with no deadline.</p></div></div>
        <form className="xt-assign" onSubmit={create}>
          <label>Exam
            <select className="portal-field sm" value={form.exam_id} onChange={(e) => setForm({ ...form, exam_id: e.target.value })}>
              <option value="">Choose an exam…</option>
              {exams.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          </label>
          <label>Assign to
            <select className="portal-field sm" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
              <option value="">Choose a group or examinee…</option>
              <optgroup label="Groups">{groups.map((g) => <option key={g.id} value={`g:${g.id}`}>{g.name} ({members.filter((m) => m.group_id === g.id).length})</option>)}</optgroup>
              <optgroup label="Individual examinees">{approved.map((x) => <option key={x.id} value={`e:${x.id}`}>{x.full_name}</option>)}</optgroup>
            </select>
          </label>
          <label>Opens <span className="opt">optional</span><input className="portal-field sm" type="datetime-local" value={form.opens_at} onChange={(e) => setForm({ ...form, opens_at: e.target.value })} /></label>
          <label>Closes <span className="opt">optional</span><input className="portal-field sm" type="datetime-local" value={form.closes_at} onChange={(e) => setForm({ ...form, closes_at: e.target.value })} /></label>
          <button className="portal-btn sm">Assign</button>
        </form>
      </div>

      <div className="xt-card">
        <div className="xt-card-head"><div><h3>Current assignments <span className="xt-count">{assignments.length}</span></h3></div></div>
        <div className="table-wrap">
          <table className="crm-table sm">
            <thead><tr><th>Exam</th><th>Assigned to</th><th>Window</th><th>Status</th><th>Finished</th><th></th></tr></thead>
            <tbody>
              {assignments.length === 0 && <tr><td colSpan={6} className="empty-row">Nothing assigned yet.</td></tr>}
              {assignments.map((a) => {
                const [label, cls] = state(a);
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{exams.find((x) => x.id === a.exam_id)?.title}</td>
                    <td>{a.group_id ? <span className="xt-chip sm">{targetName(a)}</span> : targetName(a)}</td>
                    <td className="xt-muted">{a.opens_at || a.closes_at ? `${a.opens_at ? fmt(a.opens_at) : 'Now'} → ${a.closes_at ? fmt(a.closes_at) : 'no deadline'}` : 'Always open'}</td>
                    <td><span className={'xt-state ' + cls}>{label}</span></td>
                    <td>{finished(a)} / {headcount(a)}</td>
                    <td className="xt-row-actions">
                      <EditWindow a={a} onSave={(opens, closes) => run(async () => chk(await supabase.from('exam_assignments').update({ opens_at: opens, closes_at: closes }).eq('id', a.id)))} />
                      <button className="del" onClick={() => window.confirm('Remove this assignment? Its attempts and results will be deleted too.') && run(async () => chk(await supabase.from('exam_assignments').delete().eq('id', a.id)))}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EditWindow({ a, onSave }) {
  const [open, setOpen] = useState(false);
  const [opens, setOpens] = useState(toLocalInput(a.opens_at));
  const [closes, setCloses] = useState(toLocalInput(a.closes_at));
  if (!open) return <button onClick={() => setOpen(true)}>Dates</button>;
  return (
    <div className="xt-window">
      <input className="portal-field sm" type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} aria-label="Opens" />
      <input className="portal-field sm" type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} aria-label="Closes" />
      <button onClick={() => { onSave(opens ? new Date(opens).toISOString() : null, closes ? new Date(closes).toISOString() : null); setOpen(false); }}>Save</button>
      <button onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}

/* ───────────── Results ───────────── */
export function ResultsTab({ data, reload }) {
  const { exams, groups, examinees, assignments, attempts } = data;
  const [run, error] = useAction(reload);
  const [filter, setFilter] = useState('all');
  const [onlyToGrade, setOnlyToGrade] = useState(false);
  const [open, setOpen] = useState(null);

  const examOf = (a) => exams.find((x) => x.id === a.exam_id);
  const person = (id) => examinees.find((e) => e.id === id);
  const asg = (id) => assignments.find((x) => x.id === id);
  const label = (a) => {
    const x = asg(a.assignment_id);
    return x?.group_id ? groups.find((g) => g.id === x.group_id)?.name : 'Individual';
  };

  const rows = useMemo(() => attempts
    .filter((a) => a.status !== 'in_progress')
    .filter((a) => filter === 'all' || a.assignment_id === filter)
    .filter((a) => !onlyToGrade || a.status === 'submitted')
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)), [attempts, filter, onlyToGrade]);

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Examinee', 'Email', 'Exam', 'Group', 'Attempt', 'Submitted', 'Score', 'Max', 'Percent', 'Result'].join(',')];
    rows.forEach((a) => {
      const e = person(a.examinee_id), x = examOf(a);
      const graded = a.status === 'graded';
      lines.push([e?.full_name, e?.email, x?.title, label(a), a.attempt_no, fmt(a.submitted_at), graded ? a.score : '', a.max_score,
        graded ? pct(a) : '', graded ? (pct(a) >= Number(x?.passing_score) ? 'Passed' : 'Failed') : 'Needs grading'].map(esc).join(','));
    });
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'exam-results.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  const toGrade = attempts.filter((a) => a.status === 'submitted').length;

  return (
    <div className="xt">
      {error && <div className="completer-error">{error}</div>}
      <div className="xt-card">
        <div className="xt-card-head">
          <div><h3>Results</h3><p>{toGrade ? `${toGrade} submission${toGrade > 1 ? 's have' : ' has'} essay answers waiting for grading.` : 'All submissions are graded.'}</p></div>
          <button className="portal-btn-ghost" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
        </div>
        <div className="xt-inline">
          <select className="portal-field sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All assignments</option>
            {assignments.map((a) => <option key={a.id} value={a.id}>{exams.find((x) => x.id === a.exam_id)?.title} · {a.group_id ? groups.find((g) => g.id === a.group_id)?.name : examinees.find((e) => e.id === a.examinee_id)?.full_name}</option>)}
          </select>
          <label className="xt-check"><input type="checkbox" checked={onlyToGrade} onChange={(e) => setOnlyToGrade(e.target.checked)} /> Needs grading only</label>
        </div>
        <div className="table-wrap">
          <table className="crm-table sm">
            <thead><tr><th>Examinee</th><th>Exam</th><th>Attempt</th><th>Submitted</th><th>Score</th><th>Result</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="empty-row">No submissions yet.</td></tr>}
              {rows.map((a) => {
                const x = examOf(a);
                const graded = a.status === 'graded';
                const passed = graded && pct(a) >= Number(x?.passing_score);
                return (
                  <tr key={a.id}>
                    <td><div style={{ fontWeight: 600 }}>{person(a.examinee_id)?.full_name}</div><div className="cell-sub">{label(a)}</div></td>
                    <td>{x?.title}</td>
                    <td>#{a.attempt_no}</td>
                    <td className="xt-muted">{fmt(a.submitted_at)}</td>
                    <td>{graded ? `${a.score} / ${a.max_score} (${pct(a)}%)` : `${a.auto_score ?? 0} / ${a.max_score} so far`}</td>
                    <td>{graded ? <span className={'xt-state ' + (passed ? 'open' : 'failed')}>{passed ? 'Passed' : 'Failed'}</span> : <span className="xt-state sched">Needs grading</span>}</td>
                    <td className="xt-row-actions"><button onClick={() => setOpen(a)}>{graded ? 'Review' : 'Grade'}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {open && <AttemptReview attempt={open} exam={examOf(open)} examinee={person(open.examinee_id)} onClose={() => setOpen(null)} run={run} />}
    </div>
  );
}

function AttemptReview({ attempt, exam, examinee, onClose, run }) {
  const [questions, setQuestions] = useState(null);
  const [essay, setEssay] = useState(attempt.essay_scores || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('exam_questions').select('*, exam_answer_keys(answer)').eq('exam_id', attempt.exam_id).order('position')
      .then(({ data }) => setQuestions((data || []).map((q) => ({ ...q, key: (Array.isArray(q.exam_answer_keys) ? q.exam_answer_keys[0]?.answer : q.exam_answer_keys?.answer) || '' }))));
  }, [attempt.exam_id]);

  const given = (q) => (attempt.answers || {})[q.id] ?? '';
  const correct = (q) => {
    const g = String(given(q)).trim().toLowerCase().replace(/\s+/g, ' ');
    if (!g) return false;
    if (q.type === 'tf') return g.startsWith(q.key.trim().toLowerCase().slice(0, 1));
    if (q.type === 'identification') return q.key.split('|').some((k) => k.trim().toLowerCase().replace(/\s+/g, ' ') === g);
    return g === q.key.trim().toLowerCase();
  };
  const show = (q, v) => {
    if (!v) return <em className="xt-muted">No answer</em>;
    if (q.type === 'mc') { const i = LETTERS.indexOf(String(v).toUpperCase()); return `${v}. ${q.choices[i] ?? ''}`; }
    return v;
  };
  const essays = (questions || []).filter((q) => q.type === 'essay');
  const essayTotal = essays.reduce((s, q) => s + (Number(essay[q.id]) || 0), 0);
  const total = Number(attempt.auto_score || 0) + essayTotal;

  const save = () => {
    const bad = essays.find((q) => essay[q.id] === undefined || essay[q.id] === '' || Number(essay[q.id]) < 0 || Number(essay[q.id]) > Number(q.points));
    if (bad) { alert(`Give every essay a score between 0 and its points (check question ${questions.indexOf(bad) + 1}).`); return; }
    setSaving(true);
    run(async () => {
      try {
        chk(await supabase.from('exam_attempts').update({ essay_scores: essay, score: total, status: 'graded' }).eq('id', attempt.id));
        onClose();
      } finally { setSaving(false); }
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal xt-review" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{examinee?.full_name} · {exam?.title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="xt-review-sum">
            <span>Attempt #{attempt.attempt_no}</span>
            <span>Submitted {fmt(attempt.submitted_at)}</span>
            <strong>{total} / {attempt.max_score} points</strong>
          </div>
          {!questions ? <div className="panel-loading">Loading…</div> : questions.map((q, i) => (
            <div key={q.id} className={'xt-review-q ' + (q.type === 'essay' ? 'essay' : correct(q) ? 'right' : 'wrong')}>
              <div className="xt-review-top"><span>{i + 1}. {TYPE_LABEL[q.type]} · {q.points} pt{Number(q.points) === 1 ? '' : 's'}</span>
                {q.type !== 'essay' && <b>{correct(q) ? '✓ Correct' : '✗ Wrong'}</b>}
              </div>
              <p className="xt-review-prompt">{q.prompt}</p>
              <div className="xt-review-ans"><span>Answer</span><div>{show(q, given(q))}</div></div>
              {q.type !== 'essay' && <div className="xt-review-ans key"><span>Correct</span><div>{show(q, q.key)}</div></div>}
              {q.type === 'essay' && (
                <label className="xt-essay-score">Score <input className="portal-field sm" type="number" min="0" max={q.points} step="0.5" value={essay[q.id] ?? ''} onChange={(e) => setEssay({ ...essay, [q.id]: e.target.value === '' ? '' : Number(e.target.value) })} /> / {q.points}</label>
              )}
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <div className="modal-foot-right">
            <button className="portal-btn-ghost" onClick={() => run(async () => { chk(await supabase.rpc('regrade_attempt', { p_attempt: attempt.id })); onClose(); })} title="Re-check automatic answers against the current answer key">Regrade</button>
            <button className="portal-btn-ghost" onClick={onClose}>Close</button>
            {essays.length > 0 && <button className="portal-btn" onClick={save} disabled={saving}>Save grades</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Retake requests ───────────── */
export function RetakesTab({ data, reload }) {
  const { exams, examinees, assignments, retakes, attempts } = data;
  const [run, error] = useAction(reload);
  const [show, setShow] = useState('pending');
  const list = retakes.filter((r) => (show === 'pending' ? r.status === 'pending' : r.status !== 'pending'));
  const examTitle = (r) => exams.find((x) => x.id === assignments.find((a) => a.id === r.assignment_id)?.exam_id)?.title;
  const lastScore = (r) => {
    const a = attempts.filter((x) => x.assignment_id === r.assignment_id && x.examinee_id === r.examinee_id && x.status === 'graded').sort((p, q) => q.attempt_no - p.attempt_no)[0];
    return a ? `${a.score} / ${a.max_score} (${pct(a)}%)` : '—';
  };
  const decide = (r, approve) => run(async () => chk(await supabase.from('retake_requests').update({ status: approve ? 'approved' : 'denied', decided_at: new Date().toISOString() }).eq('id', r.id)));

  return (
    <div className="xt">
      {error && <div className="completer-error">{error}</div>}
      <div className="xt-card">
        <div className="xt-card-head">
          <div><h3>Retake requests</h3><p>Examinees can ask for one more attempt after finishing. Approving lets them start the exam again once.</p></div>
          <div className="xt-seg">
            {['pending', 'done'].map((s) => <button key={s} className={show === s ? 'on' : ''} onClick={() => setShow(s)}>{s === 'pending' ? `Pending (${retakes.filter((r) => r.status === 'pending').length})` : 'History'}</button>)}
          </div>
        </div>
        <div className="table-wrap">
          <table className="crm-table sm">
            <thead><tr><th>Examinee</th><th>Exam</th><th>Last score</th><th>Reason</th><th>Requested</th><th></th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="empty-row">{show === 'pending' ? 'No pending requests.' : 'No decisions yet.'}</td></tr>}
              {list.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{examinees.find((e) => e.id === r.examinee_id)?.full_name}</td>
                  <td>{examTitle(r)}</td>
                  <td>{lastScore(r)}</td>
                  <td className="xt-reason">{r.reason || <span className="xt-muted">—</span>}</td>
                  <td className="xt-muted">{fmt(r.created_at)}</td>
                  <td className="xt-row-actions">
                    {r.status === 'pending' ? (
                      <><button onClick={() => decide(r, true)}>Approve</button><button className="del" onClick={() => decide(r, false)}>Deny</button></>
                    ) : <span className={'xt-state ' + (r.status === 'denied' ? 'failed' : 'open')}>{r.status === 'used' ? 'Used' : r.status === 'approved' ? 'Approved' : 'Denied'}</span>}
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
