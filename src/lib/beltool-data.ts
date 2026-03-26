import type { Company, CompanyContact, SurveyConfig } from '@/types/beltool';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ghl_api_key?: string;
  ghl_location_id?: string;
  logo_url?: string;
  enquete_link?: string;
  booking_link?: string;
  brand_name?: string;
  whatsapp_templates?: Record<string, string>;
  voys_api_token?: string;
  voys_email?: string;
  voys_device_id?: string;
  voys_outbound_number?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'caller' | 'manager';
  avatar: string;
  deviceId?: string;
  organizationId?: string;
  organizationName?: string;
}

export interface Advisor {
  id: string;
  name: string;
  specialty: string;
}

/** No more hardcoded users — all users come from GHL */
export const USERS: User[] = [];

export const ADVISORS: Advisor[] = [
  { id: '09a9x0oU0pFO3boHXMtJ', name: 'Willem Claassen', specialty: 'AI & Automatisering' },
  { id: 'A7NVM9VI9gY1vAQCwjTc', name: 'Sophie van Dijk', specialty: 'CRM & Workflows' },
  { id: 'DzQORGpaY7nDmGdfB5qZ', name: 'Mark Bakker', specialty: 'Marketing & Sales' },
];

export const COMPANIES_INIT: Company[] = [
  {
    id: 'comp1', name: 'De Vries Installaties B.V.', stage: 'nieuw',
    contacts: [
      { id: 'c1', firstName: 'Martijn', lastName: 'de Vries', role: 'Directeur', phone: '+31 6 1234 5678', email: 'martijn@devries-installaties.nl' },
      { id: 'c1b', firstName: 'Jan', lastName: 'de Vries', role: 'Operations', phone: '+31 6 1234 9999', email: 'jan@devries-installaties.nl' },
    ],
  },
  {
    id: 'comp2', name: 'Bakker & Zn Accountants', stage: 'nieuw',
    contacts: [
      { id: 'c2', firstName: 'Sandra', lastName: 'Bakker', role: 'Partner', phone: '+31 6 8765 4321', email: 's.bakker@bakkeraccountants.nl' },
    ],
  },
  {
    id: 'comp3', name: 'Jansen Logistics', stage: 'terugbellen',
    contacts: [
      { id: 'c3', firstName: 'Peter', lastName: 'Jansen', role: 'CEO', phone: '+31 6 9876 5432', email: 'p.jansen@jansenlogistics.nl' },
      { id: 'c3b', firstName: 'Maria', lastName: 'Smeets', role: 'Office Manager', phone: '+31 6 9876 1111', email: 'm.smeets@jansenlogistics.nl' },
    ],
  },
  {
    id: 'comp4', name: 'Vermeer Marketing', stage: 'nieuw',
    contacts: [
      { id: 'c4', firstName: 'Lisa', lastName: 'Vermeer', role: 'Eigenaar', phone: '+31 6 7654 3210', email: 'lisa@vermeermarketing.nl' },
    ],
  },
  {
    id: 'comp5', name: 'Smit Bouw B.V.', stage: 'terugbellen',
    contacts: [
      { id: 'c5', firstName: 'Henk', lastName: 'Smit', role: 'Directeur', phone: '+31 6 5432 1098', email: 'henk@smitbouw.nl' },
      { id: 'c5b', firstName: 'Kees', lastName: 'Smit', role: 'Projectleider', phone: '+31 6 5432 2222', email: 'kees@smitbouw.nl' },
    ],
  },
  {
    id: 'comp6', name: 'De Jong Catering', stage: 'nieuw',
    contacts: [
      { id: 'c6', firstName: 'Anouk', lastName: 'de Jong', role: 'Eigenaar', phone: '+31 6 1122 3344', email: 'anouk@dejongcatering.nl' },
    ],
  },
  {
    id: 'comp7', name: 'Kuiper IT Solutions', stage: 'nieuw',
    contacts: [
      { id: 'c7', firstName: 'Tom', lastName: 'Kuiper', role: 'CTO', phone: '+31 6 2233 4455', email: 'tom@kuiperit.nl' },
      { id: 'c7b', firstName: 'Anna', lastName: 'Kuiper', role: 'Sales', phone: '+31 6 2233 6666', email: 'anna@kuiperit.nl' },
    ],
  },
];

export function defaultSurvey(): SurveyConfig {
  return {
    intro: {
      icon: '👋',
      title: 'Introductie',
      script: '"Goedemiddag {naam}, u spreekt met {beller} van CliqMakers. Ik bel u kort omdat we momenteel een praktijkonderzoek doen naar onnodig tijdverlies en capaciteit binnen het MKB. Mag ik u daar vier hele korte vragen over stellen?"',
      tip: 'Klinkt de prospect gehaast? Bied direct de digitale enquête aan.',
    },
    q1: {
      icon: '⏱️',
      title: 'Vraag 1 — Het Tijdlek',
      script: '"Fijn, dank u wel. Hoeveel uur bent u of uw team wekelijks kwijt aan pure \'digitale randzaken\'?"',
      tip: '',
      fieldLabel: 'Hoeveel uur per week?',
      type: 'choice',
      options: ['0-2 uur', '3-5 uur', '6-10 uur', '10-15 uur', '15+ uur'],
    },
    q2: {
      icon: '🔄',
      title: 'Vraag 2 — Repetitieve Taken',
      script: '"{uren}, dat is nog best een flinke hap tijd. Wat zijn de meest voorkomende repetitieve handelingen?"',
      tip: 'Laat een stilte vallen!',
      fieldLabel: 'Selecteer genoemde taken',
      type: 'multi',
      options: ['Leads nabellen', 'E-mails overtypen', 'Offertes opmaken', 'Afspraken inplannen', 'CRM bijwerken', 'Administratie', 'Social media'],
      allowOther: true,
    },
    q3: {
      icon: '📈',
      title: 'Vraag 3 — Groeifase',
      script: '"Bent u momenteel vooral bezig met bijbenen, of bent u klaar voor groei?"',
      tip: '',
      fieldLabel: 'Wat geeft de prospect aan?',
      type: 'select',
      options: [
        { value: 'Bijbenen', label: 'Huidig werk netjes afhandelen', icon: '🏃' },
        { value: 'Klaar voor groei', label: 'Processen staan redelijk strak', icon: '🚀' },
      ],
    },
    q4: {
      icon: '🤖',
      title: 'Vraag 4 — AI & Automatisering',
      script: '"Bent u intern al aan het kijken naar slimme automatisering of AI?"',
      tip: '',
      fieldLabel: 'Wat is de status?',
      type: 'select',
      options: [
        { value: 'Al mee bezig', label: 'Oriënteren of actief bezig', icon: '⚡' },
        { value: 'Komt niet aan toe', label: 'Waan van de dag', icon: '😅' },
      ],
    },
    bridge: {
      icon: '🤝',
      title: 'Het Aanbod & Afspraak',
      script: '"Bedankt {naam}. U verliest tijd aan {taken} en {groei}. Mag ik een gratis adviesgesprek van 15 min voor u inplannen?"',
      tip: 'Plan de afspraak nu!',
    },
  };
}

export function renderScript(
  template: string,
  contact: { firstName: string } | null,
  answers: { hours: string; tasks: string[]; tasksOther: string; growth: string; ai: string },
  callerName?: string
): string {
  const ts = answers.tasks
    .concat(answers.tasksOther ? [answers.tasksOther] : [])
    .filter(Boolean)
    .join(', ');
  const g = answers.growth === 'Klaar voor groei' ? 'wilt opschalen' : 'bent druk met huidig werk';
  return template
    .replace(/\{naam\}/g, contact?.firstName || '[Naam]')
    .replace(/\{beller\}/g, callerName || '[Beller]')
    .replace(/\{uren\}/g, answers.hours || 'Dat')
    .replace(/\{taken\}/g, ts || 'die taken')
    .replace(/\{groei\}/g, g)
    .replace(/\{ai\}/g, answers.ai || '');
}

export function getWorkdays(count: number): Date[] {
  const dates: Date[] = [];
  const d = new Date();
  while (dates.length < count) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() % 6 !== 0) dates.push(new Date(d));
  }
  return dates;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];
