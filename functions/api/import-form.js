// Cloudflare Pages Function: GET /api/import-form?url=<Google Form link>
// Fetches a public Google Form and returns its title, description and questions.
// Only Google Forms addresses are accepted, so this cannot be used to fetch other sites.

const ALLOWED_HOSTS = ['docs.google.com', 'forms.gle', 'forms.google.com'];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Google item type ids → our question types
const TYPE = { 0: 'short', 1: 'paragraph', 2: 'mc', 3: 'dropdown', 4: 'checkbox', 5: 'mc', 9: 'date', 10: 'short' };
const SKIPPED = { 7: 'grid', 11: 'image', 12: 'video', 13: 'file upload' };

export function parseGoogleForm(html) {
  const m = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/);
  if (!m) return null;
  const data = JSON.parse(m[1]);
  const info = data[1] || [];
  const items = info[1] || [];
  const questions = [];
  const skipped = [];

  for (const item of items) {
    const [, title, description, typeId, entries] = item;
    const label = (title || '').trim();
    const help = (description || '').trim();
    if (typeId === 6 || typeId === 8) {
      if (label || help) questions.push({ type: 'section', label: label || 'Section', help, required: false, options: [] });
      continue;
    }
    if (!(typeId in TYPE)) {
      skipped.push(`${label || 'Untitled'} (${SKIPPED[typeId] || 'unsupported question type'})`);
      continue;
    }
    const entry = (entries && entries[0]) || [];
    let options = [];
    if (typeId === 5) {
      options = (entry[1] || []).map((o) => String(o[0]));
    } else if ([2, 3, 4].includes(typeId)) {
      options = (entry[1] || []).map((o) => String(o[0] ?? '').trim()).filter(Boolean);
    }
    let type = TYPE[typeId];
    if (type === 'short') {
      if (/e-?mail/i.test(label)) type = 'email';
      else if (/(contact|mobile|phone|cell(ular)?)\s*(no|number|#)?/i.test(label)) type = 'phone';
    }
    questions.push({ type, label: label || 'Untitled question', help, required: Boolean(entry[2]), options });
  }

  return {
    title: (info[8] || data[3] || '').trim(),
    description: (info[0] || '').trim(),
    questions,
    skipped,
  };
}

export async function onRequestGet({ request }) {
  const raw = new URL(request.url).searchParams.get('url') || '';
  let target;
  try { target = new URL(raw.trim()); } catch { return json({ error: 'That is not a valid link.' }, 400); }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.includes(target.hostname)) {
    return json({ error: 'Only Google Forms links can be imported (docs.google.com/forms/… or forms.gle/…).' }, 400);
  }

  // People often paste the editor link; the public /viewform page is the one that has the questions
  target.pathname = target.pathname.replace(/\/(edit|prefill|viewanalytics)[^/]*$/, '/viewform');

  const res = await fetch(target.toString(), {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PIFSA form importer)', 'Accept-Language': 'en' },
  });
  const finalUrl = new URL(res.url);
  if (finalUrl.hostname === 'accounts.google.com') {
    return json({ error: 'This form requires signing in to Google. In Google Forms, turn off "Restrict to users in your organization" and "Collect email addresses: Verified", or share the link to the live form, then try again.' }, 422);
  }
  if (finalUrl.hostname !== 'docs.google.com' || !finalUrl.pathname.startsWith('/forms/')) {
    return json({ error: 'That link did not lead to a Google Form.' }, 400);
  }
  if (!res.ok) return json({ error: `Google returned an error (${res.status}). Check that the form link is correct and the form is published.` }, 502);

  const html = await res.text();
  let form;
  try { form = parseGoogleForm(html); } catch { form = null; }
  if (!form) {
    return json({ error: 'Could not read the questions from that page. Use the link people open to fill out the form (it ends in /viewform), not the editor link.' }, 422);
  }
  return json(form);
}
