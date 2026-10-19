// Turns exam text lines into questions. Correct answers may be marked inline:
//   *B. Answer text   or   B. Answer text *   (asterisk)
//   ✓ next to a choice, or the choice set in bold
//   "Answer: B" / "Ans: True" / "Answer: mens rea" on its own line or at the end of the question
// Section headings such as "TRUE OR FALSE", "IDENTIFICATION" or "ESSAY" set the type for the questions below them.

export const LETTERS = 'ABCDEFGH';
const SECTION = /^(?:(?:part|test|section)\s*)?(?:[ivx]+|\d+)?\s*[.:\-–)]?\s*(multiple[\s-]*choice|true\s*(?:or|\/|-)\s*false|identification|essay)\b/i;
const QUESTION = /^(\d{1,3})\s*[.)]\s*(.*)$/;
const CHOICE = /^[*✓✔]?\s*\(?([A-Ha-h])\s*[.)]\s+(.*)$/;
const ANSWER_LINE = /^(?:correct\s+answer|answer|ans|key)\s*[:\-–]\s*(.+)$/i;
const ANSWER_TAIL = /\s*\(?\b(?:correct\s+answer|answer|ans)\s*[:\-–]\s*([^)]+?)\)?\s*$/i;
const MARK = /^\s*[*✓✔]+\s*|\s*[*✓✔]+\s*$/g;
const NOISE = /^(?:page\s+\d+(?:\s+of\s+\d+)?|\d+\s*\/\s*\d+|-\s*\d+\s*-)$/i;

const sectionType = (text) => {
  const m = text.match(SECTION);
  if (!m || text.length > 80) return null;
  const s = m[1].toLowerCase();
  if (s.startsWith('multiple')) return 'mc';
  if (s.startsWith('true')) return 'tf';
  if (s.startsWith('ident')) return 'identification';
  return 'essay';
};

const isTrueFalse = (v) => /^(t|true|f|false)$/i.test(v.trim());
const normTF = (v) => (/^t/i.test(v.trim()) ? 'True' : 'False');

// "A. Paris B. Rome C. Madrid" on one line → separate choices
function splitInlineChoices(text) {
  const parts = text.split(/\s+(?=[*✓✔]?\s*\(?[A-H]\s*[.)]\s+)/);
  return parts.length > 1 && parts.every((p) => CHOICE.test(p)) ? parts : [text];
}

export function parseExam(lines) {
  const questions = [];
  let section = null;
  let q = null;

  // piece is a whole choice such as "*B. Insanity" or "B. Insanity ✓"
  const addChoice = (piece, bold) => {
    const body = piece.match(CHOICE)[2];
    const marked = /^\s*[*✓✔]/.test(piece) || /^\s*[*✓✔]|[*✓✔]\s*$/.test(body);
    q.choices.push({ text: body.replace(MARK, '').trim(), marked, bold });
  };

  for (const { text: rawText, bold = false } of lines) {
    const text = (rawText || '').replace(/\s+/g, ' ').trim();
    if (!text || NOISE.test(text)) continue;

    const sec = sectionType(text);
    if (sec && !QUESTION.test(text)) { section = sec; q = null; continue; }

    const qm = text.match(QUESTION);
    if (qm) {
      q = { section, prompt: qm[2], choices: [], answer: null, bold };
      questions.push(q);
      const tail = q.prompt.match(ANSWER_TAIL);
      if (tail) { q.answer = tail[1].trim(); q.prompt = q.prompt.replace(ANSWER_TAIL, '').trim(); }
      continue;
    }
    if (!q) continue; // title, instructions, etc. before the first question

    const am = text.match(ANSWER_LINE);
    if (am) { q.answer = am[1].replace(MARK, '').trim(); continue; }

    const pieces = splitInlineChoices(text);
    const cm = pieces[0].match(CHOICE);
    if (cm) {
      for (const piece of pieces) addChoice(piece, bold && pieces.length === 1);
      continue;
    }

    if (q.choices.length) q.choices[q.choices.length - 1].text += ' ' + text.replace(MARK, '').trim();
    else q.prompt += ' ' + text;
  }

  return questions.map(toQuestion);
}

function toQuestion(raw) {
  const warnings = [];
  const prompt = raw.prompt.replace(MARK, '').trim();
  let choices = raw.choices.map((c) => c.text);
  let correct = raw.choices.map((c, i) => (c.marked ? i : -1)).filter((i) => i >= 0);

  // Bold counts as the mark only when exactly one choice is bold
  if (!correct.length) {
    const bolds = raw.choices.map((c, i) => (c.bold ? i : -1)).filter((i) => i >= 0);
    if (bolds.length === 1 && raw.choices.length > 1) correct = bolds;
  }
  if (!correct.length && raw.answer && choices.length) {
    const letter = raw.answer.match(/^\(?([A-Ha-h])\)?\.?$/);
    if (letter) correct = [LETTERS.indexOf(letter[1].toUpperCase())];
    else {
      const idx = choices.findIndex((c) => c.toLowerCase() === raw.answer.toLowerCase());
      if (idx >= 0) correct = [idx];
    }
  }

  let type, answer = '';
  const tfChoices = choices.length === 2 && choices.every(isTrueFalse);
  if (choices.length >= 2 && !tfChoices) {
    type = 'mc';
    if (correct.length === 1 && correct[0] < choices.length) answer = LETTERS[correct[0]];
    else if (correct.length > 1) { warnings.push('More than one choice is marked. Pick the correct one.'); answer = LETTERS[correct[0]]; }
    else warnings.push('No correct choice was marked.');
  } else if (tfChoices || raw.section === 'tf' || (raw.answer && isTrueFalse(raw.answer) && raw.section !== 'identification')) {
    type = 'tf';
    choices = [];
    const src = tfChoices && correct.length === 1 ? raw.choices[correct[0]].text : raw.answer;
    if (src && isTrueFalse(src)) answer = normTF(src);
    else warnings.push('No True or False answer was marked.');
  } else if (raw.section === 'essay' || (!raw.answer && raw.section !== 'identification' && raw.section !== 'mc')) {
    type = 'essay';
    choices = [];
    if (raw.section !== 'essay') warnings.push('No answer found, so this was set as an essay question. Change the type if needed.');
  } else {
    type = 'identification';
    choices = [];
    if (raw.answer) answer = raw.answer;
    else warnings.push('No answer was found for this identification question.');
  }
  if (type === 'mc' && choices.length === 1) warnings.push('Only one choice was found.');

  return { id: newId(), type, prompt, choices, answer, points: type === 'essay' ? 5 : 1, warnings };
}

export const newId = () =>
  (globalThis.crypto?.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }));

// Plain pasted text uses the same rules (handy when a PDF is a scan or the layout is odd)
export const parseExamText = (text) => parseExam(text.split(/\r?\n/).map((t) => ({ text: t, bold: false })));
