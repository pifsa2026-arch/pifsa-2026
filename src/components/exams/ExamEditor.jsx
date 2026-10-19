import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { LETTERS, newId, parseExam, parseExamText } from '../../lib/examParser.js';
import { pdfToLines } from '../../lib/pdfText.js';

export const TYPE_LABEL = { mc: 'Multiple choice', tf: 'True or false', identification: 'Identification', essay: 'Essay' };
const blankQuestion = (type = 'mc') => ({
  id: newId(), type, prompt: '', choices: type === 'mc' ? ['', '', '', ''] : [], answer: '', points: type === 'essay' ? 5 : 1, warnings: [],
});

function problemsOf(q) {
  const p = [];
  if (!q.prompt.trim()) p.push('Question text is empty.');
  if (q.type === 'mc') {
    if (q.choices.length < 2) p.push('Add at least two choices.');
    if (q.choices.some((c) => !c.trim())) p.push('Fill in or remove the empty choices.');
    const idx = LETTERS.indexOf(q.answer);
    if (idx < 0 || !q.choices[idx]?.trim()) p.push('Mark the correct choice.');
  }
  if (q.type === 'tf' && !['True', 'False'].includes(q.answer)) p.push('Choose True or False as the answer.');
  if (q.type === 'identification' && !q.answer.trim()) p.push('Enter the correct answer.');
  if (!(Number(q.points) >= 0)) p.push('Points must be zero or more.');
  return p;
}

// Import helper used by the toolbar and the "Import from PDF" entry point
export async function questionsFromPdf(file) {
  const lines = await pdfToLines(file);
  if (!lines.some((l) => l.text)) throw new Error('No text was found in this PDF. It may be a scanned image. Try "Paste text" instead.');
  const qs = parseExam(lines);
  if (!qs.length) throw new Error('No numbered questions were found. Questions should start with "1.", "2." and so on.');
  return qs;
}

export default function ExamEditor({ examId, initial, onClose, onSaved }) {
  const [meta, setMeta] = useState({ title: '', description: '', instructions: '', duration_minutes: 60, passing_score: 75, ...(initial?.meta || {}) });
  const [questions, setQuestions] = useState(initial?.questions || []);
  const [loading, setLoading] = useState(Boolean(examId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showProblems, setShowProblems] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const hadAttempts = useRef(false);

  useEffect(() => {
    if (!examId) return;
    (async () => {
      const [{ data: exam }, { data: qs }, { count }] = await Promise.all([
        supabase.from('exams').select('*').eq('id', examId).single(),
        supabase.from('exam_questions').select('*, exam_answer_keys(answer)').eq('exam_id', examId).order('position'),
        supabase.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('exam_id', examId),
      ]);
      hadAttempts.current = (count || 0) > 0;
      if (exam) setMeta({ title: exam.title, description: exam.description || '', instructions: exam.instructions || '', duration_minutes: exam.duration_minutes, passing_score: exam.passing_score });
      setQuestions((qs || []).map((q) => ({
        id: q.id, type: q.type, prompt: q.prompt, choices: q.choices || [], points: q.points, warnings: [],
        answer: (Array.isArray(q.exam_answer_keys) ? q.exam_answer_keys[0]?.answer : q.exam_answer_keys?.answer) || '',
      })));
      setLoading(false);
    })();
  }, [examId]);

  const update = (id, patch) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch, warnings: [] } : q)));
  const changeType = (q, type) => update(q.id, {
    type,
    choices: type === 'mc' ? (q.choices.length >= 2 ? q.choices : ['', '', '', '']) : [],
    answer: type === 'tf' ? (['True', 'False'].includes(q.answer) ? q.answer : '') : type === 'mc' ? '' : type === 'essay' ? '' : q.answer,
    points: type === 'essay' && Number(q.points) === 1 ? 5 : q.points,
  });
  const move = (i, dir) => setQuestions((qs) => {
    const n = [...qs]; const j = i + dir;
    if (j < 0 || j >= n.length) return qs;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  const remove = (id) => setQuestions((qs) => qs.filter((q) => q.id !== id));
  const add = (type) => setQuestions((qs) => [...qs, blankQuestion(type)]);

  const appendParsed = (qs) => setQuestions((cur) => [...cur, ...qs]);
  const importPdf = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true); setError('');
    try { appendParsed(await questionsFromPdf(file)); } catch (err) { setError(err.message); }
    setImporting(false);
  };
  const importPaste = () => {
    const qs = parseExamText(pasteText);
    if (!qs.length) { setError('No numbered questions were found in the pasted text.'); return; }
    appendParsed(qs); setPasteText(''); setPasteOpen(false); setError('');
  };

  const allProblems = questions.map((q) => problemsOf(q));
  const problemCount = allProblems.filter((p) => p.length).length;
  const totalPoints = questions.reduce((s, q) => s + (Number(q.points) || 0), 0);

  const save = async () => {
    setShowProblems(true);
    if (!meta.title.trim()) { setError('Give the exam a title.'); return; }
    if (!questions.length) { setError('Add at least one question.'); return; }
    if (problemCount) { setError(`${problemCount} question${problemCount > 1 ? 's need' : ' needs'} fixing (highlighted below).`); return; }
    if (hadAttempts.current && !window.confirm('Examinees have already taken this exam. Changing questions or answers will not change their saved scores unless you regrade them in Results. Continue?')) return;
    setSaving(true); setError('');
    try {
      const id = examId || newId();
      const examRow = {
        id, title: meta.title.trim(), description: meta.description.trim() || null, instructions: meta.instructions.trim() || null,
        duration_minutes: Math.max(1, parseInt(meta.duration_minutes, 10) || 60),
        passing_score: Math.min(100, Math.max(0, Number(meta.passing_score) || 0)), updated_at: new Date().toISOString(),
      };
      const chk = (r) => { if (r.error) throw new Error(r.error.message); return r; };
      chk(await supabase.from('exams').upsert([examRow]));
      const ids = questions.map((q) => q.id);
      chk(await supabase.from('exam_questions').delete().eq('exam_id', id).not('id', 'in', `(${ids.join(',')})`));
      chk(await supabase.from('exam_questions').upsert(questions.map((q, i) => ({
        id: q.id, exam_id: id, position: i + 1, type: q.type, prompt: q.prompt.trim(),
        choices: q.type === 'mc' ? q.choices.map((c) => c.trim()) : [], points: Number(q.points) || 0,
      }))));
      const keyed = questions.filter((q) => q.type !== 'essay');
      if (keyed.length) chk(await supabase.from('exam_answer_keys').upsert(keyed.map((q) => ({ question_id: q.id, answer: q.answer.trim() }))));
      const essays = questions.filter((q) => q.type === 'essay').map((q) => q.id);
      if (essays.length) chk(await supabase.from('exam_answer_keys').delete().in('question_id', essays));
      onSaved(id);
    } catch (err) {
      setError('Could not save: ' + err.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="panel-loading">Loading exam…</div>;

  return (
    <div className="xe">
      <div className="xe-bar">
        <button className="xe-back" onClick={onClose}>‹ All exams</button>
        <div className="xe-bar-stats">{questions.length} questions · {totalPoints} points</div>
        <div className="xe-bar-actions">
          <button className="portal-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="portal-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save exam'}</button>
        </div>
      </div>
      {error && <div className="completer-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="xe-meta">
        <input className="xe-title" placeholder="Exam title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
        <div className="xe-meta-grid">
          <label>Time limit (minutes)<input className="portal-field" type="number" min="1" value={meta.duration_minutes} onChange={(e) => setMeta({ ...meta, duration_minutes: e.target.value })} /></label>
          <label>Passing score (%)<input className="portal-field" type="number" min="0" max="100" value={meta.passing_score} onChange={(e) => setMeta({ ...meta, passing_score: e.target.value })} /></label>
          <label className="wide">Short description (shown in the exam list)<input className="portal-field" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></label>
          <label className="full">Instructions (shown before the first question)<textarea className="portal-field" rows={2} value={meta.instructions} onChange={(e) => setMeta({ ...meta, instructions: e.target.value })} /></label>
        </div>
      </div>

      <div className="xe-import">
        <span>Add questions from a file:</span>
        <button className="portal-btn-ghost" onClick={() => fileRef.current?.click()} disabled={importing}>{importing ? 'Reading PDF…' : 'Import PDF'}</button>
        <button className="portal-btn-ghost" onClick={() => setPasteOpen((v) => !v)}>Paste text</button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={importPdf} />
        <span className="xe-hint">Mark correct answers with *, ✓, bold, or an "Answer:" line.</span>
      </div>
      {pasteOpen && (
        <div className="xe-paste">
          <textarea className="portal-field" rows={8} placeholder={'1. Question text\nA. Choice\n*B. Correct choice\nC. Choice\n\n2. Another question\nAnswer: True'} value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
          <button className="portal-btn sm" onClick={importPaste} disabled={!pasteText.trim()}>Add these questions</button>
        </div>
      )}

      <ol className="xe-list">
        {questions.map((q, i) => {
          const problems = showProblems ? allProblems[i] : [];
          return (
            <li key={q.id} className={'xe-q' + (problems.length ? ' bad' : '') + (q.warnings?.length ? ' warn' : '')}>
              <div className="xe-q-head">
                <span className="xe-q-num">{i + 1}</span>
                <select className="portal-field sm" value={q.type} onChange={(e) => changeType(q, e.target.value)}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <label className="xe-points">Points <input className="portal-field sm" type="number" min="0" step="0.5" value={q.points} onChange={(e) => update(q.id, { points: e.target.value })} /></label>
                <div className="xe-q-tools">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === questions.length - 1} aria-label="Move down">↓</button>
                  <button className="del" onClick={() => remove(q.id)} aria-label="Delete question">×</button>
                </div>
              </div>
              <textarea className="portal-field xe-prompt" rows={2} placeholder="Question" value={q.prompt} onChange={(e) => update(q.id, { prompt: e.target.value })} />

              {q.type === 'mc' && (
                <div className="xe-choices">
                  {q.choices.map((c, ci) => (
                    <div key={ci} className={'xe-choice' + (q.answer === LETTERS[ci] ? ' correct' : '')}>
                      <button className="xe-mark" onClick={() => update(q.id, { answer: LETTERS[ci] })} title="Mark as correct">{LETTERS[ci]}</button>
                      <input className="portal-field sm" placeholder={`Choice ${LETTERS[ci]}`} value={c} onChange={(e) => update(q.id, { choices: q.choices.map((x, xi) => (xi === ci ? e.target.value : x)) })} />
                      {q.choices.length > 2 && (
                        <button className="xe-choice-del" aria-label="Remove choice" onClick={() => {
                          const choices = q.choices.filter((_, xi) => xi !== ci);
                          const cur = LETTERS.indexOf(q.answer);
                          update(q.id, { choices, answer: cur === ci ? '' : cur > ci ? LETTERS[cur - 1] : q.answer });
                        }}>×</button>
                      )}
                    </div>
                  ))}
                  {q.choices.length < 8 && <button className="xe-add-choice" onClick={() => update(q.id, { choices: [...q.choices, ''] })}>+ Add choice</button>}
                  <div className="xe-key-note">Click a letter to mark the correct answer. Examinees never see it.</div>
                </div>
              )}
              {q.type === 'tf' && (
                <div className="xe-tf">
                  {['True', 'False'].map((v) => (
                    <button key={v} className={q.answer === v ? 'on' : ''} onClick={() => update(q.id, { answer: v })}>{v}</button>
                  ))}
                  <span className="xe-key-note">Correct answer</span>
                </div>
              )}
              {q.type === 'identification' && (
                <div className="xe-ident">
                  <input className="portal-field sm" placeholder="Correct answer" value={q.answer} onChange={(e) => update(q.id, { answer: e.target.value })} />
                  <span className="xe-key-note">Not case-sensitive. Separate other accepted answers with | (e.g. Lombroso | Cesare Lombroso).</span>
                </div>
              )}
              {q.type === 'essay' && <div className="xe-key-note">Graded by hand in Results after the examinee submits.</div>}

              {(problems.length > 0 || q.warnings?.length > 0) && (
                <ul className="xe-problems">
                  {[...new Set([...(q.warnings || []), ...problems])].map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <div className="xe-add">
        <span>Add a question:</span>
        {Object.entries(TYPE_LABEL).map(([k, v]) => <button key={k} className="portal-btn-ghost" onClick={() => add(k)}>+ {v}</button>)}
      </div>
    </div>
  );
}
