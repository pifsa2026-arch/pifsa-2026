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
  section: 'Section title',
};
export const OPTION_TYPES = ['mc', 'checkbox', 'dropdown'];

// Questions mapped to these fields fill in the CRM lead when "Create a CRM lead" is on
export const LEAD_FIELDS = {
  full_name: 'Full name',
  email: 'Email',
  contact_number: 'Contact number',
  program: 'Training program',
  training_duration: 'Training duration',
};

export const THEME_COLORS = ['#00264d', '#b8860b', '#1a7048', '#7a1f2b', '#3b3f8f', '#0b6e79'];

export const question = (type = 'short', patch = {}) => ({
  id: newId(), type, label: '', help: '', required: false,
  options: OPTION_TYPES.includes(type) ? ['Option 1'] : [], lead_field: '', ...patch,
});

export const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export const blankForm = () => ({
  slug: '',
  title: 'Application Form',
  description: 'Fill out this form to apply for a PIFSA professional certificate program. We will contact you with the next steps.',
  banner_url: '',
  theme_color: '#00264d',
  is_open: true,
  closed_message: 'This form is no longer accepting responses. Please contact PIFSA for the next schedule.',
  success_message: 'Thank you! Your application has been received. We will contact you through email or text.',
  create_lead: true,
  questions: [
    question('short', { label: 'Full name', required: true, lead_field: 'full_name', help: 'As it should appear on your certificate' }),
    question('email', { label: 'Email address', required: true, lead_field: 'email' }),
    question('phone', { label: 'Contact number', required: true, lead_field: 'contact_number' }),
    question('dropdown', { label: 'Training program', required: true, lead_field: 'program', options: [...TRAINING_PROGRAMS] }),
    question('dropdown', { label: 'Training duration', required: true, lead_field: 'training_duration', options: [...TRAINING_DURATIONS] }),
  ],
});

export const PRESET_OPTIONS = {
  programs: TRAINING_PROGRAMS,
  durations: TRAINING_DURATIONS,
};

export const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
export const formatAnswer = (v) => (Array.isArray(v) ? v.join(', ') : v ?? '');

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
