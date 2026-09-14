// Course icons (gold-on-navy SVGs). currentColor = gold.
const svgAttrs = 'width="56" height="56" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

export const COURSES = [
  {
    icon: `<svg ${svgAttrs}><circle cx="24" cy="16" r="9"/><path d="M24 25v0M12 44c0-7 5-12 12-12s12 5 12 12"/><path d="M20 15h8M24 11v8"/></svg>`,
    code: 'PCFPsy',
    title: 'Professional Certificate in Forensic Psychology',
    desc: 'Apply psychological principles to investigation — offender profiling, competency assessment, and expert testimony in legal settings.',
    items: ['Criminal Profiling', 'Competency Assessment', 'Behavioral Analysis', 'Expert Testimony'],
  },
  {
    icon: `<svg ${svgAttrs}><path d="M12 6h16l8 8v28a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M28 6v8h8"/><path d="M16 24h16M16 30h16M16 36h10"/></svg>`,
    code: 'PCFDE',
    title: 'Professional Certificate in Forensic Document Examination',
    desc: 'Detect forgery and alteration — handwriting analysis, signature verification, and questioned-document examination.',
    items: ['Handwriting Analysis', 'Signature Verification', 'Ink & Paper Analysis', 'Forgery Detection'],
  },
  {
    icon: `<svg ${svgAttrs}><rect x="8" y="10" width="32" height="28" rx="2"/><path d="M8 18h32"/><path d="M14 26h6M14 32h6M28 26l4 4 6-6"/></svg>`,
    code: 'PCFAI',
    title: 'Professional Certificate in Forensic Accounting and Investigation',
    desc: 'Trace financial crime — fraud examination, forensic auditing, asset tracing, and litigation support.',
    items: ['Forensic Auditing', 'Asset Tracing', 'Financial Analysis', 'Litigation Support'],
  },
  {
    icon: `<svg ${svgAttrs}><path d="M20 6l6 4-8 12-6-4z"/><path d="M18 22l-6 10c-1 2 0 4 2 5l4 2"/><circle cx="30" cy="34" r="8"/><path d="M30 30v8M26 34h8"/></svg>`,
    code: 'PCFBFI',
    title: 'Professional Certificate in Forensic Ballistics and Firearms Identification',
    desc: 'Examine firearms and ammunition — bullet comparison, trajectory analysis, and gunshot residue identification.',
    items: ['Bullet Comparison', 'Trajectory Analysis', 'Firearm ID', 'GSR Analysis'],
  },
  {
    icon: `<svg ${svgAttrs}><path d="M24 4l14 5v9c0 9-6 16-14 20-8-4-14-11-14-20V9z"/><path d="M18 22l4 4 8-8"/></svg>`,
    code: 'PCLI',
    title: 'Professional Certificate in Legal Investigation',
    desc: 'Build court-ready cases — evidence gathering, legal procedure, case documentation, and rules of evidence.',
    items: ['Evidence Gathering', 'Legal Procedure', 'Case Documentation', 'Rules of Evidence'],
  },
  {
    icon: `<svg ${svgAttrs}><path d="M24 4l14 5v9c0 9-6 16-14 20-8-4-14-11-14-20V9z"/><circle cx="24" cy="21" r="4"/><path d="M24 25v6"/></svg>`,
    code: 'PCCI',
    title: 'Professional Certificate in Cybersecurity and Investigation',
    desc: 'Investigate the digital frontier — cybercrime response, digital forensics, network security, and threat assessment.',
    items: ['Digital Forensics', 'Cybercrime Response', 'Network Security', 'Threat Assessment'],
  },
  {
    icon: `<svg ${svgAttrs}><circle cx="20" cy="20" r="12"/><path d="M29 29l10 10"/><path d="M20 14v6l4 3"/></svg>`,
    code: 'PCFDI',
    title: 'Professional Certificate in Fraud Detection and Investigation',
    desc: 'Uncover and document fraud — detection methodologies, white-collar crime investigation, and case building.',
    items: ['Fraud Detection', 'White-Collar Crime', 'Case Building', 'Prevention Strategy'],
  },
  {
    icon: `<svg ${svgAttrs}><rect x="6" y="14" width="36" height="26" rx="2"/><path d="M17 14v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4"/><path d="M6 26h36"/><path d="M22 26v3h4v-3"/></svg>`,
    code: 'PCCSI',
    title: 'Professional Certificate in Corporate Security and Investigation',
    desc: 'Protect the enterprise — corporate risk, background screening, due diligence, and internal investigations.',
    items: ['Corporate Risk', 'Background Screening', 'Due Diligence', 'Internal Investigation'],
  },
  {
    icon: `<svg ${svgAttrs}><circle cx="24" cy="24" r="4"/><circle cx="24" cy="24" r="11"/><circle cx="24" cy="24" r="18"/><path d="M24 2v8M24 38v8M2 24h8M38 24h8"/></svg>`,
    code: 'PCSI',
    title: 'Professional Certificate in Strategic Intelligence',
    desc: 'Turn information into insight — intelligence gathering, analysis, operational planning, and strategic assessment.',
    items: ['Intelligence Gathering', 'Analysis', 'Operational Planning', 'Strategic Assessment'],
  },
  {
    icon: `<svg ${svgAttrs}><circle cx="21" cy="21" r="13"/><path d="M30.5 30.5L42 42"/><path d="M21 15c-2 0-3.5 1.5-3.5 3.5M21 27c3.5 0 5.5-2.5 5.5-6"/></svg>`,
    code: 'PCCDI',
    title: 'Professional Certificate in Criminal Detection and Investigation',
    desc: 'Master field investigation — crime scene analysis, evidence collection, witness interviews, and case management.',
    items: ['Crime Scene Analysis', 'Evidence Collection', 'Witness Interviews', 'Case Management'],
  },
];

export const TEAM = [
  {
    initials: 'DR', badge: 'Leadership', name: 'Dr. Ramon Santos', role: 'Executive Director',
    bio: '30+ years in law enforcement and criminal investigation. Former PNP Chief Investigator with extensive expertise in complex case management.',
    tags: ['Criminal Investigation', 'Case Management'],
  },
  {
    initials: 'MA', badge: 'Curriculum', name: 'Maria Alvarez', role: 'Head of Curriculum',
    bio: 'International forensic training specialist. Expert in digital forensics and cyber investigation with certifications from leading institutions.',
    tags: ['Digital Forensics', 'Cyber Investigation'],
  },
  {
    initials: 'JL', badge: 'Instruction', name: 'James Liu', role: 'Senior Instructor',
    bio: 'Certified fraud investigator with 20+ years corporate and financial crime expertise. Published author in investigative sciences.',
    tags: ['Fraud Investigation', 'Financial Crime'],
  },
];

export const PROCESS_STEPS = [
  { t: 'Get in touch', tag: 'Getting Started', d: 'Reach out with your goals and the certification you are aiming for. We take the time to understand your background and point you to the right program.', icon: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M42 32v6a4 4 0 0 1-4 4c-16 0-30-14-30-30a4 4 0 0 1 4-4h6l3 9-4 3a20 20 0 0 0 10 10l3-4z"/></svg>' },
  { t: 'Assess and enroll', tag: 'Planning', d: 'We review your experience, map out the right course track, and get you enrolled with a clear plan for what lies ahead.', icon: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6h20l8 8v28a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M34 6v8h8"/><path d="M19 26l4 4 8-8"/></svg>' },
  { t: 'Train with experts', tag: 'Development', d: 'Learn from experienced investigators and forensic professionals through hands-on modules, real case studies, and practical exercises.', icon: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l18 8-18 8-18-8z"/><path d="M12 19v10c0 3 6 6 12 6s12-3 12-6V19"/><path d="M42 14v10"/></svg>' },
  { t: 'Get certified', tag: 'Completion', d: 'Complete your assessments, earn your industry-recognized certification, and join a network of trained investigative professionals.', icon: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="18" r="12"/><path d="M17 28l-3 14 10-5 10 5-3-14"/><path d="M19 18l3 3 6-6"/></svg>' },
];

export const GALLERY = [
  { src: '/images/gallery-1.jpg',  cap: 'Training seminar with participants and faculty' },
  { src: '/images/gallery-2.jpg',  cap: 'Moot Court Presentation & Joint Closing Ceremony — Forensic Psychology' },
  { src: '/images/gallery-3.jpg',  cap: 'Certificate of Participation awarding ceremony' },
  { src: '/images/gallery-4.jpg',  cap: 'Graduates proudly displaying their certificates of completion' },
  { src: '/images/gallery-5.jpg',  cap: 'Forensic Psychology graduation and closing rites' },
  { src: '/images/gallery-6.jpg',  cap: 'Joint Closing Ceremony — Forensic Psychology, Investigation & Document Examination' },
  { src: '/images/gallery-7.jpg',  cap: 'Forensic Investigation graduates with faculty at closing ceremony' },
  { src: '/images/gallery-8.jpg',  cap: 'Postgraduate closing ceremony with faculty in academic regalia' },
  { src: '/images/gallery-9.jpg',  cap: 'Moot Court Presentation & Joint Closing Ceremony with certification board' },
  { src: '/images/gallery-10.jpg', cap: 'Postgraduate certificate awarding with faculty and guest officials' },
];

export const HERO_PILLS = [
  'Cyber Security & Investigation', 'Digital Forensic Examination', 'Fraud Investigation',
  'Corporate Intelligence', 'Law Enforcement Intelligence', 'Criminal Investigation',
  'Evidence Collection', 'Cyber Threat Assessment', 'Due Diligence',
];

export const ABOUT_STATS = [
  { target: 500, suffix: '+', label: 'Trained Professionals' },
  { target: 8, suffix: '', label: 'Specialized Courses' },
  { target: 15, suffix: '+', label: 'Years in Service' },
  { target: 95, suffix: '%', label: 'Graduate Satisfaction' },
];

export const TEAM_STATS = [
  { target: 15, suffix: '+', label: 'Years training investigators' },
  { target: 40, suffix: '+', label: 'Expert instructors and mentors' },
  { target: 7, suffix: '', label: 'Accredited certification tracks' },
  { target: 100, suffix: '%', label: 'Practitioner-led curriculum' },
];
