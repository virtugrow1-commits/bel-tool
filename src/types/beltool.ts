export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
  stage: ContactStage;
}

export type ContactStage =
  | 'nieuw'
  | 'bellen'
  | 'terugbellen'
  | 'enqueteTel'
  | 'enqueteVerstuurd'
  | 'afspraak'
  | 'nietInteressant'
  | 'geenGehoor';

export interface StageMeta {
  label: string;
  color: string;
  bgClass: string;
}

export type CallPhase =
  | 'idle'
  | 'intro'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'bridge'
  | 'sent'
  | 'done'
  | 'lost'
  | 'noanswer';

export interface SurveyAnswers {
  hours: string;
  tasks: string[];
  tasksOther: string;
  growth: string;
  ai: string;
}

export const STAGE_META: Record<ContactStage, StageMeta> = {
  nieuw: { label: 'Nieuw Lead', color: 'text-info', bgClass: 'bg-info/10' },
  bellen: { label: 'In Gesprek', color: 'text-success', bgClass: 'bg-success/10' },
  terugbellen: { label: 'Terugbellen', color: 'text-warning', bgClass: 'bg-warning/10' },
  enqueteTel: { label: 'Enquête ✓', color: 'text-primary', bgClass: 'bg-primary/10' },
  enqueteVerstuurd: { label: 'Verstuurd', color: 'text-purple-400', bgClass: 'bg-purple-400/10' },
  afspraak: { label: 'Afspraak', color: 'text-success', bgClass: 'bg-success/10' },
  nietInteressant: { label: 'Afgevallen', color: 'text-destructive', bgClass: 'bg-destructive/10' },
  geenGehoor: { label: 'Geen Gehoor', color: 'text-muted-foreground', bgClass: 'bg-muted/50' },
};

export const HOUR_OPTIONS = ['0-2 uur', '3-5 uur', '6-10 uur', '10-15 uur', '15+ uur'];

export const TASK_OPTIONS = [
  'Leads nabellen / opvolgen',
  'E-mails handmatig overtypen',
  'Offertes opmaken',
  'Afspraken inplannen',
  'CRM / systemen bijwerken',
  'Administratie & facturatie',
  'Social media beheer',
];

export const TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

export const DEMO_CONTACTS: Contact[] = [
  { id: 'c1', firstName: 'Martijn', lastName: 'de Vries', company: 'De Vries Installaties B.V.', phone: '+31 6 1234 5678', email: 'martijn@devries-installaties.nl', stage: 'nieuw' },
  { id: 'c2', firstName: 'Sandra', lastName: 'Bakker', company: 'Bakker & Zn Accountants', phone: '+31 6 8765 4321', email: 's.bakker@bakkeraccountants.nl', stage: 'nieuw' },
  { id: 'c3', firstName: 'Peter', lastName: 'Jansen', company: 'Jansen Logistics', phone: '+31 6 9876 5432', email: 'p.jansen@jansenlogistics.nl', stage: 'terugbellen' },
  { id: 'c4', firstName: 'Lisa', lastName: 'Vermeer', company: 'Vermeer Marketing', phone: '+31 6 7654 3210', email: 'lisa@vermeermarketing.nl', stage: 'nieuw' },
  { id: 'c5', firstName: 'Henk', lastName: 'Smit', company: 'Smit Bouw B.V.', phone: '+31 6 5432 1098', email: 'henk@smitbouw.nl', stage: 'terugbellen' },
  { id: 'c6', firstName: 'Anouk', lastName: 'de Jong', company: 'De Jong Catering', phone: '+31 6 1122 3344', email: 'anouk@dejongcatering.nl', stage: 'nieuw' },
];
