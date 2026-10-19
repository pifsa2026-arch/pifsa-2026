import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { newId } from '../lib/examParser.js';
import ExamEditor, { questionsFromPdf } from '../components/exams/ExamEditor.jsx';
import { ExamineesTab, AssignmentsTab, ResultsTab, RetakesTab } from '../components/exams/ExamTabs.jsx';
import '../styles/portal.css';
import '../styles/admin.css';
import '../styles/exams.css';

const EMPTY = { exams: [], groups: [], members: [], examinees: [], assignments: [], attempts: [], retakes: [] };

export default function Exams() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [tab, setTab] = useState('exams');
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editor, setEditor] = useState(null); // { examId } or { initial }
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const q = (t, sel = '*', order) => {
      let r = supabase.from(t).select(sel);
      if (order) r = r.order(order, { ascending: false });
      return r;
    };
    const res = await Promise.all([
      q('exams', '*, exam_questions(points)', 'updated_at'), q('examinee_groups', '*'), q('examinee_group_members'),
      q('examinees', '*', 'created_at'), q('exam_assignments', '*', 'created_at'),
      q('exam_attempts', 'id, assignment_id, exam_id, examinee_id, attempt_no, started_at, submitted_at, answers, auto_score, essay_scores, score, max_score, status', 'started_at'),
      q('retake_requests', '*', 'created_at'),
    ]);
    const failed = res.find((r) => r.error);
    if (failed) setLoadError(failed.error.message);
    else setLoadError('');
    const [exams, groups, members, examinees, assignments, attempts, retakes] = res.map((r) => r.data || []);
    setData({ exams, groups: groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })), members, examinees, assignments, attempts, retakes });
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const importPdf = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true); setNotice('');
    try {
      const questions = await questionsFromPdf(file);
      setEditor({ initial: { meta: { title: file.name.replace(/\.pdf$/i, '') }, questions } });
    } catch (err) { setNotice(err.message); }
    setImporting(false);
  };

  const duplicate = async (exam) => {
    setNotice('');
    try {
      const chk = (r) => { if (r.error) throw new Error(r.error.message); return r; };
      const { data: qs } = chk(await supabase.from('exam_questions').select('*, exam_answer_keys(answer)').eq('exam_id', exam.id).order('position'));
      const id = newId();
      chk(await supabase.from('exams').insert([{ id, title: `${exam.title} (copy)`, description: exam.description, instructions: exam.instructions, duration_minutes: exam.duration_minutes, passing_score: exam.passing_score }]));
      const copies = qs.map((q) => ({ old: q, id: newId() }));
      if (copies.length) {
        chk(await supabase.from('exam_questions').insert(copies.map(({ old, id: qid }) => ({ id: qid, exam_id: id, position: old.position, type: old.type, prompt: old.prompt, choices: old.choices, points: old.points }))));
        const keys = copies.map(({ old, id: qid }) => ({ question_id: qid, answer: (Array.isArray(old.exam_answer_keys) ? old.exam_answer_keys[0]?.answer : old.exam_answer_keys?.answer) })).filter((k) => k.answer);
        if (keys.length) chk(await supabase.from('exam_answer_keys').insert(keys));
      }
      await reload();
      setEditor({ examId: id });
    } catch (err) { setNotice('Could not duplicate: ' + err.message); }
  };

  const removeExam = async (exam) => {
    const used = data.assignments.filter((a) => a.exam_id === exam.id).length;
    if (!window.confirm(used ? `"${exam.title}" is assigned ${used} time(s). Deleting it also deletes those assignments and all results. Delete anyway?` : `Delete "${exam.title}"?`)) return;
    const { error } = await supabase.from('exams').delete().eq('id', exam.id);
    if (error) setNotice('Could not delete: ' + error.message);
    reload();
  };

  const counts = {
    examinees: data.examinees.filter((e) => e.status === 'pending').length,
    results: data.attempts.filter((a) => a.status === 'submitted').length,
    retakes: data.retakes.filter((r) => r.status === 'pending').length,
  };
  const TABS = [['exams', 'Exam templates'], ['examinees', 'Examinees & groups'], ['assignments', 'Assignments'], ['results', 'Results'], ['retakes', 'Retake requests']];

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="admin-top-left">
          <img src="/images/logo.png" alt="PIFSA" />
          <div>
            <div className="admin-top-title">Online Exams</div>
            <div className="admin-top-sub">Templates, examinees, assignments and results</div>
          </div>
        </div>
        <div className="admin-top-right">
          <button className="admin-switch" onClick={() => navigate('/portal')}>CRM System</button>
          <button className="admin-switch" onClick={() => navigate('/workspace')}>Workspace</button>
          <button className="portal-signout" onClick={async () => { await signOut(); navigate('/'); }}>Sign out</button>
        </div>
      </header>

      <div className="admin-body xm">
        {!isSupabaseConfigured && <div className="notice">Online exams need a live Supabase connection.</div>}
        {loadError && <div className="notice">Could not load exam data ({loadError}). Run <code>supabase/roles_exams_chat.sql</code> in the Supabase SQL Editor first.</div>}

        {editor ? (
          <ExamEditor
            key={editor.examId || 'new'}
            examId={editor.examId}
            initial={editor.initial}
            onClose={() => setEditor(null)}
            onSaved={async () => { setEditor(null); setNotice('Exam saved.'); await reload(); }}
          />
        ) : (
          <>
            <nav className="xm-tabs">
              {TABS.map(([id, label]) => (
                <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                  {label}{counts[id] > 0 && <span className="xm-badge">{counts[id]}</span>}
                </button>
              ))}
            </nav>
            {notice && <div className={notice === 'Exam saved.' ? 'csv-ok' : 'completer-error'} style={{ marginBottom: 14 }}>{notice}</div>}

            {loading ? <div className="panel-loading">Loading…</div> : (
              <>
                {tab === 'exams' && (
                  <div>
                    <div className="xm-head">
                      <p>Exam templates can be reused and assigned to any group. Duplicate one to make another set (Set A, Set B…).</p>
                      <div className="xm-head-actions">
                        <button className="portal-btn-ghost" onClick={() => fileRef.current?.click()} disabled={importing}>{importing ? 'Reading PDF…' : 'Import PDF'}</button>
                        <button className="portal-btn" onClick={() => setEditor({ initial: { questions: [] } })}>＋ New exam</button>
                        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={importPdf} />
                      </div>
                    </div>
                    {data.exams.length === 0 ? (
                      <div className="xm-empty">
                        <h3>No exams yet</h3>
                        <p>Import a PDF where the correct answers are marked (*, ✓, bold or an "Answer:" line), or build an exam by hand.</p>
                      </div>
                    ) : (
                      <div className="xm-grid">
                        {data.exams.map((x) => {
                          const qs = x.exam_questions || [];
                          const pts = qs.reduce((s, q) => s + Number(q.points), 0);
                          const asg = data.assignments.filter((a) => a.exam_id === x.id);
                          const done = data.attempts.filter((a) => a.exam_id === x.id && a.status !== 'in_progress').length;
                          return (
                            <article className="xm-card" key={x.id}>
                              <h3>{x.title}</h3>
                              {x.description && <p className="xm-desc">{x.description}</p>}
                              <div className="xm-stats">
                                <span><b>{qs.length}</b> questions</span>
                                <span><b>{pts}</b> points</span>
                                <span><b>{x.duration_minutes}</b> min</span>
                                <span><b>{x.passing_score}%</b> to pass</span>
                              </div>
                              <div className="xm-meta">Assigned {asg.length} time{asg.length === 1 ? '' : 's'} · {done} submission{done === 1 ? '' : 's'}</div>
                              <div className="xm-actions">
                                <button onClick={() => setEditor({ examId: x.id })}>Edit</button>
                                <button onClick={() => duplicate(x)}>Duplicate</button>
                                <button onClick={() => setTab('assignments')}>Assign</button>
                                <button className="del" onClick={() => removeExam(x)}>Delete</button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {tab === 'examinees' && <ExamineesTab data={data} reload={reload} />}
                {tab === 'assignments' && <AssignmentsTab data={data} reload={reload} />}
                {tab === 'results' && <ResultsTab data={data} reload={reload} />}
                {tab === 'retakes' && <RetakesTab data={data} reload={reload} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
