// Shared PIFSA config used across landing page + portal.

export const PROGRAM_PRICE = 25000; // ₱ per training program

// 2027 Calendar of Professional Certificate Programs — training durations
export const TRAINING_DURATIONS = [
  'January 30 – March 20, 2027',
  'March 13 – May 1, 2027',
  'May 15 – July 3, 2027',
  'July 17 – September 4, 2027',
  'September 18 – November 6, 2027',
  'October 23 – December 11, 2027',
];

// Training programs offered
export const TRAINING_PROGRAMS = [
  'Professional Certificate in Forensic Psychology (PCFPsy)',
  'Professional Certificate in Forensic Document Examination (PCFDE)',
  'Professional Certificate in Forensic Accounting and Investigation (PCFAI)',
  'Professional Certificate in Forensic Ballistics and Firearms Identification (PCFBFI)',
  'Professional Certificate in Legal Investigation (PCLI)',
  'Professional Certificate in Cybersecurity and Investigation (PCCI)',
  'Professional Certificate in Fraud Detection and Investigation (PCFDI)',
  'Professional Certificate in Corporate Security and Investigation (PCCSI)',
  'Professional Certificate in Strategic Intelligence (PCSI)',
  'Professional Certificate in Criminal Detection and Investigation (PCCDI)',
];

// CRM pipeline stages (in order)
export const STAGES = ['Leads', 'Applicants', 'For Requirements', 'Admitted', 'Paid'];

// Expense categories for the Revenue Dashboard
export const EXPENSE_CATEGORIES = {
  Digital: ['Paid Ads', 'Online Events', 'Social Media', 'Content Creation', 'Others'],
  Events: ['Special Events', 'Training Events', 'Board Events', 'Company Events', 'Others'],
  Print: ['Brochures', 'Flyers', 'Tarpaulins', 'Office Print Materials', 'Others'],
  Operations: ['Rent', 'Employee Salary', 'Professional Salary', 'Dividends', 'Miscellaneous', 'Utilities', 'Others'],
};

// Peso formatter
export const peso = (n) =>
  '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });

// Total a lead owes = price × number of programs
export const leadTotalDue = (lead) => (lead.programs?.length || 0) * PROGRAM_PRICE;

// Is a lead fully paid?
export const isFullyPaid = (lead) =>
  leadTotalDue(lead) > 0 && Number(lead.amount_paid || 0) >= leadTotalDue(lead);

// Requirements for admission (shown in the Process section)
export const ADMISSION_REQUIREMENTS = [
  'Scan copy of College Diploma and Transcript of Records',
  'NBI or National Police Clearance',
  'Two valid government-issued identification cards',
  'One 2x2 ID picture',
];

// How to join steps (payment + enrollment)
export const HOW_TO_JOIN = [
  'Send proof of payment with all documentary requirements to pifsa2017@gmail.com',
  'We\'ll send a confirmation upon receipt of your requirements and proof of payment',
  'Live online sessions run seven (7) Saturdays via Google Meet, 8:30 AM to 5:00 PM',
  'Training link is sent to your official email every Friday night before the session',
];

// ============ AUTOMATION BUILDER ============
export const AUTOMATION_TRIGGERS = [
  { id: 'lead_created', label: 'New lead created', desc: 'Fires when a lead submits the web form or is added manually' },
  { id: 'stage_changed', label: 'Lead reaches a stage', desc: 'Fires when a lead moves into a specific pipeline stage', needsStage: true },
  { id: 'payment_received', label: 'Payment received', desc: 'Fires when any payment is recorded on a lead' },
  { id: 'fully_paid', label: 'Lead fully paid', desc: 'Fires when a lead completes payment' },
  { id: 'form_filled', label: 'Form filled', desc: 'Fires when a lead completes a specific form' },
  { id: 'email_opened', label: 'Email opened', desc: 'Fires when a lead opens a sent email' },
  { id: 'no_reply', label: 'No reply after…', desc: 'Fires when a lead has not replied within a set time', needsHours: true },
  { id: 'date_based', label: 'Date / schedule', desc: 'Fires on a specific date or before a training duration' },
];

export const AUTOMATION_ACTIONS = [
  { id: 'send_email', label: 'Send email', icon: '✉', fields: ['subject', 'body'] },
  { id: 'send_sms', label: 'Send SMS', icon: '💬', fields: ['body'] },
  { id: 'add_note', label: 'Add note', icon: '📝', fields: ['body'] },
  { id: 'add_tag', label: 'Add tag', icon: '🏷', fields: ['tag'] },
  { id: 'move_stage', label: 'Move to stage', icon: '↗', fields: ['stage'] },
  { id: 'assign_staff', label: 'Assign to staff', icon: '👤', fields: ['staff'] },
  { id: 'delay', label: 'Wait / delay', icon: '⏱', fields: ['hours'] },
];

// Lead sources (for manual adds + display)
export const LEAD_SOURCES = [
  { id: 'meta', label: 'Meta (Facebook/IG)' },
  { id: 'google', label: 'Google' },
  { id: 'walk_in', label: 'Walk-in' },
  { id: 'flyers', label: 'Flyers' },
  { id: 'referral', label: 'Referral' },
  { id: 'landing_page', label: 'Landing Page' },
  { id: 'manual', label: 'Manual Entry' },
];
