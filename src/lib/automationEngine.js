// automationEngine.js
// Fires automation jobs into Supabase when CRM events happen.
// Google Apps Script polls the automation_jobs table and sends the emails.

import { supabase, isSupabaseConfigured } from './supabase.js';

// Replace {{variable}} placeholders with actual lead data
function fillTemplate(text, lead) {
  if (!text) return '';
  return text
    .replace(/\{\{name\}\}/gi, lead.full_name || '')
    .replace(/\{\{first_name\}\}/gi, (lead.full_name || '').split(' ')[0])
    .replace(/\{\{email\}\}/gi, lead.email || '')
    .replace(/\{\{phone\}\}/gi, lead.contact_number || '')
    .replace(/\{\{programs\}\}/gi, (lead.programs || []).join(', '))
    .replace(/\{\{duration\}\}/gi, lead.training_duration || '')
    .replace(/\{\{stage\}\}/gi, lead.stage || '');
}

/**
 * Call this whenever a CRM event happens.
 * eventType: 'lead_created' | 'stage_changed' | 'payment_received' | 'fully_paid'
 * lead: the lead object
 * extra: { stage } for stage_changed
 */
export async function fireAutomationEvent(eventType, lead, extra = {}) {
  if (!isSupabaseConfigured || !lead?.email) return;

  // Load all enabled automations
  const { data: automations, error } = await supabase
    .from('automations')
    .select('*')
    .eq('enabled', true);

  if (error || !automations?.length) return;

  const jobs = [];

  for (const auto of automations) {
    const t = auto.trigger || {};

    // Match event type
    if (t.type !== eventType) continue;

    // For stage_changed, must match the specific stage
    if (eventType === 'stage_changed' && t.stage && t.stage !== extra.stage) continue;

    // Queue each send_email step as a job
    for (const step of (auto.steps || [])) {
      if (step.type !== 'send_email') continue;

      jobs.push({
        automation_id: String(auto.id),
        automation_name: auto.name,
        lead_id: String(lead.id),
        to_email: lead.email,
        to_name: lead.full_name || '',
        subject: fillTemplate(step.subject, lead),
        body_text: fillTemplate(step.body, lead),
        status: 'pending',
      });
    }
  }

  if (!jobs.length) return;

  const { error: insertErr } = await supabase.from('automation_jobs').insert(jobs);
  if (insertErr) console.warn('automationEngine: failed to insert jobs', insertErr.message);
}
