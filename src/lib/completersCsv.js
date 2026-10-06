export const CSV_TEMPLATE =
  'certificate_no,full_name,program,batch,completed_on\n' +
  'PIFSA-2025-FP-0001,Juan Dela Cruz,Forensic Psychology,Batch 12,2025-11-08\n';

const ALIASES = {
  certificate_no: ['certificateno', 'certificatenumber', 'certificate', 'certno', 'trainingcertificatenumber', 'trainingcertificateno'],
  full_name: ['fullname', 'name', 'completer', 'trainee'],
  program: ['program', 'programtaken', 'course', 'training', 'trainingprogram'],
  batch: ['batch', 'batchnumber', 'batchno'],
  completed_on: ['completedon', 'dateofcompletion', 'completiondate', 'datecompleted', 'date', 'finished'],
};

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const pad = (n) => String(n).padStart(2, '0');
const validYmd = (y, m, d) => {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
};

// Accepts 2025-11-08, 11/08/2025 (month first, as Excel exports it) and "November 8, 2025"
export function parseDate(raw) {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return +m[1] > 12 ? validYmd(+m[3], +m[2], +m[1]) : validYmd(+m[3], +m[1], +m[2]);
  if (!/[a-z]/i.test(s)) return null;
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : validYmd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

// Returns { rows: valid completers, problems: [{ line, reason }] } or { fatal }
export function readCompletersCsv(text, existingCertNos) {
  const table = parseCsv(text);
  if (table.length < 2) return { fatal: 'The file has no data rows. Keep the header row and add one completer per line.' };

  const header = table[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  const col = {};
  for (const [field, names] of Object.entries(ALIASES)) col[field] = header.findIndex((h) => names.includes(h));
  const missing = Object.keys(col).filter((f) => col[f] === -1);
  if (missing.length) return { fatal: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Use the template so the headers match.` };

  const seen = new Set(existingCertNos.map((c) => c.trim().toUpperCase()));
  const rows = [], problems = [];
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (f) => (cells[col[f]] || '').trim();
    const row = { certificate_no: get('certificate_no'), full_name: get('full_name'), program: get('program'), batch: get('batch'), completed_on: get('completed_on') };
    const empty = Object.keys(row).filter((f) => !row[f]);
    if (empty.length) { problems.push({ line, reason: `missing ${empty.join(', ')}` }); return; }
    const date = parseDate(row.completed_on);
    if (!date) { problems.push({ line, reason: `date "${row.completed_on}" not understood (use YYYY-MM-DD)` }); return; }
    const key = row.certificate_no.toUpperCase();
    if (seen.has(key)) { problems.push({ line, reason: `certificate number ${row.certificate_no} is already used` }); return; }
    seen.add(key);
    rows.push({ ...row, completed_on: date });
  });
  return { rows, problems };
}
