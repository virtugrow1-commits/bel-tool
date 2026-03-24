export interface CompanyContact {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  email: string;
  linkedin?: string;
  notes?: string;
  opportunityId?: string;
  surveyAnswers?: SurveyAnswers;
}

export interface Company {
  id: string;
  name: string;
  stage: CompanyStage;
  contacts: CompanyContact[];
  industry?: string;
  website?: string;
  address?: string;
  notes?: string;
}

export interface CliqConfig {
  apiKey: string;
  locationId: string;
  pipelineId: string;
  calendarId: string;
  syncContacts: boolean;
  syncOpportunities: boolean;
  syncAppointments: boolean;
  createNotes: boolean;
}

export type CompanyStage =
  | 'nieuw'
  | 'bellen'
  | 'terugbellen'
  | 'enqueteGestart'
  | 'enqueteTel'
  | 'enqueteVerstuurd'
  | 'terugbellenGepland'
  | 'afspraak'
  | 'nietInteressant'
  | 'geenGehoor'
  | 'anderMoment';

export interface StageMeta {
  label: string;
  color: string;
}

export const STAGE_META: Record<CompanyStage, StageMeta> = {
  nieuw: { label: 'Koud', color: 'hsl(217 91% 60%)' },
  bellen: { label: 'In Gesprek', color: 'hsl(152 56% 42%)' },
  terugbellen: { label: 'Terugbellen', color: 'hsl(38 92% 50%)' },
  enqueteGestart: { label: 'Enquête gestart', color: 'hsl(188 78% 41%)' },
  enqueteTel: { label: 'Enquête ✓', color: 'hsl(174 100% 38%)' },
  enqueteVerstuurd: { label: 'Verstuurd', color: 'hsl(265 83% 57%)' },
  terugbellenGepland: { label: 'Callback', color: 'hsl(38 92% 50%)' },
  afspraak: { label: 'Afspraak', color: 'hsl(152 56% 42%)' },
  nietInteressant: { label: 'Geen interesse', color: 'hsl(0 84% 60%)' },
  geenGehoor: { label: 'Geen Gehoor', color: 'hsl(220 9% 46%)' },
  anderMoment: { label: 'Ander moment', color: 'hsl(280 60% 55%)' },
};

export type CallPhase =
  | 'idle'
  | 'precall'
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

export type CallState = 'idle' | 'dialing' | 'ringing' | 'active' | 'ended';

export interface SurveyAnswers {
  hours: string;
  tasks: string[];
  tasksOther: string;
  growth: string;
  ai: string;
}

export interface SelectOption {
  value: string;
  label: string;
  icon: string;
}

export interface SurveyStepConfig {
  icon: string;
  title: string;
  script: string;
  tip?: string;
  fieldLabel?: string;
  type?: 'choice' | 'multi' | 'select';
  options?: string[] | SelectOption[];
  allowOther?: boolean;
}

export interface SurveyConfig {
  intro: SurveyStepConfig;
  q1: SurveyStepConfig;
  q2: SurveyStepConfig;
  q3: SurveyStepConfig;
  q4: SurveyStepConfig;
  bridge: SurveyStepConfig;
  [key: string]: SurveyStepConfig;
}

export interface Appointment {
  id: number;
  contactName: string;
  companyName: string;
  date: string;
  time: string;
  advisorId: string;
  advisorName: string;
  status: 'planned' | 'completed';
}

export interface CallbackEntry {
  id: number;
  contactId: string;
  contactName: string;
  companyName: string;
  date: string;
  time: string;
  note: string;
  status: 'scheduled' | 'done';
  userId?: string;
}

export interface Webhook {
  url: string;
  active: boolean;
}
