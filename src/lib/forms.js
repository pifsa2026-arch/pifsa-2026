import { TRAINING_PROGRAMS, TRAINING_DURATIONS } from './config.js';
import { newId } from './examParser.js';

export const QTYPES = {
  short: 'Short answer',
  paragraph: 'Paragraph',
  email: 'Email',
  phone: 'Phone number',
  number: 'Number',
  date: 'Date',
  mc: 'Multiple choice',
  checkbox: 'Checkboxes',
  dropdown: 'Dropdown',
  file: 'File upload',
  section: 'Section title',
};
export const OPTION_TYPES = ['mc', 'checkbox', 'dropdown'];

// Questions mapped to these fields fill in the CRM lead when "Create a CRM lead" is on
export const LEAD_FIELDS = {
  full_name: 'Full name',
  email: 'Email',
  contact_number: 'Contact number',
  current_work: 'Current work / company',
  program: 'Training program',
  training_duration: 'Training duration',
};

export const THEME_COLORS = ['#00264d', '#b8860b', '#1a7048', '#7a1f2b', '#3b3f8f', '#0b6e79'];

export const question = (type = 'short', patch = {}) => ({
  id: newId(), type, label: '', help: '', required: false,
  options: OPTION_TYPES.includes(type) ? ['Option 1'] : [], lead_field: '', ...patch,
});

export const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// Short program code from a CRM program name, e.g. "... Psychology (PCFPsy)" → "PCFPsy"
export const programCode = (p) => (String(p || '').match(/\(([^)]+)\)\s*$/) || [])[1] || '';
export const programName = (p) => String(p || '').replace(/\s*\([^)]+\)\s*$/, '');

export const detailBlock = (label = '', text = '') => ({ id: newId(), label, text });

// The standard PIFSA registration form. Only the program, duration and modality usually change.
export const blankForm = () => ({
  slug: '',
  title: 'PCFPsy Class 2027-13',
  description: '',
  banner_url: '',
  theme_color: '#00264d',
  is_open: true,
  closed_message: 'Registration for this class is closed. Please contact PIFSA for the next schedule.',
  success_message: 'Thank you! Your registration and proof of payment have been received. We will confirm your slot through email or text.',
  create_lead: true,
  details: {
    class_code: 'PCFPsy Class 2027-13',
    program: TRAINING_PROGRAMS[0],
    training_duration: TRAINING_DURATIONS.find((d) => d.startsWith('January 30')) || TRAINING_DURATIONS[0],
    blocks: [
      detailBlock('Training Modality', 'Hybrid / Blended Learning, broken down into:\n* 30-day Modular Distance Learning. Study the handouts at your own pace. (February 1 to March 12, 2027)\n* 7 Saturdays Online Learning. (January 30, February 6, 13, 20, 27, March 6 & 13). Time: 8:30 AM to 5:00 PM.\n* 3 Days Face-to-Face Learning - Case Documentation, Investigative Interviewing Techniques, Mock Trial, and Graduation. (March 18 - 20, 2027). Time: 8:30 AM to 5:00 PM.'),
      detailBlock('Venue for the 3-Day Face-to-Face Training', 'Unit 12A, Pearl of the Orient Tower Condominium, Roxas Boulevard, Ermita, Manila, or such other venue as may be mutually agreed upon by all participants within the areas of Pasay City, Manila, or Parañaque City.'),
      detailBlock('Registration Fee', 'PHP 25,000.00. Payable in full or in installments.'),
      detailBlock('Down Payment upon Enrollment', 'PHP 5,000. The remaining balance of ₱20,000 will be paid in installments during the training period.'),
      detailBlock('Payment Details', 'Kindly deposit the down payment or full registration fee to the bank account below. Take a screenshot or photo of the receipt as proof of your payment and attach it to this registration form:\nBDO Unibank Account No.: 001521054051\nAccount Name: Philippine Investigation and Forensic Science Academy, Inc.\nNOTE: You can use your GCash to make a bank transfer for the registration fee.'),
      detailBlock('Deadline for Registration', '7:00 PM on January 29, 2027'),
    ],
  },
  questions: [
    question('short', { label: 'Name (First Name Middle Name Surname)', required: true, lead_field: 'full_name' }),
    question('email', { label: 'Email', required: true, lead_field: 'email' }),
    question('phone', { label: 'Contact Number', required: true, lead_field: 'contact_number' }),
    question('short', { label: 'School / Office / Institution', required: true, lead_field: 'current_work' }),
    question('short', { label: 'Designation / Position', required: true }),
    question('mc', {
      label: 'Amount Paid', required: true,
      help: '(Training Fees will be deposited only to BDO Unibank Account No. 001521054051 - Philippine Investigation and Forensic Science Academy, Inc.)',
      options: ['5,000 (Down Payment)', '25,000 (Full Payment)'],
    }),
    question('file', { label: 'Proof of Payment', required: true, help: 'Upload 1 image or PDF of your deposit receipt. Max 10 MB.' }),
  ],
});

export const PRESET_OPTIONS = {
  programs: TRAINING_PROGRAMS,
  durations: TRAINING_DURATIONS,
};

export const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
export const isFileAnswer = (v) => Boolean(v && typeof v === 'object' && !Array.isArray(v) && v.path);
export const formatAnswer = (v) => (Array.isArray(v) ? v.join(', ') : isFileAnswer(v) ? v.name : v ?? '');

// Shrinks an uploaded banner so the form stays fast to load
export function resizeImage(file, maxW = 1600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
