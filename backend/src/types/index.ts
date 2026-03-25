// ─── Event logging ────────────────────────────────────────────────────────────

export type EventName =
  | 'CALL_OUTCOME_SAVED'
  | 'SURVEY_SENT'
  | 'SURVEY_COMPLETED'
  | 'TASK_CREATED'
  | 'APPOINTMENT_BOOKED'
  | 'TAG_ADDED'
  | 'CONTACT_UPDATED'
  | 'THANK_YOU_EMAIL_SENT'
  | 'CALLBACK_QUEUE_FETCHED';

export interface EventLog {
  id:         string;
  event:      EventName;
  contactId:  string;
  timestamp:  string;
  payload?:   unknown;
  status:     'success' | 'error';
  error?:     string;
  durationMs?: number;
}

// ─── GHL API types ────────────────────────────────────────────────────────────

export interface GHLContact {
  id:            string;
  firstName?:    string;
  lastName?:     string;
  email?:        string;
  phone?:        string;
  companyName?:  string;
  tags?:         string[];
  customFields?: GHLCustomField[];
}

export interface GHLCustomField {
  id:          string;
  value:       string;
  fieldValue?: string;
}

export interface GHLTask {
  id?:         string;
  title:       string;
  body?:       string;
  dueDate:     string;
  completed:   boolean;
  assignedTo?: string;
}

export interface GHLAppointment {
  id?:             string;
  calendarId:      string;
  contactId:       string;
  startTime:       string;
  endTime:         string;
  title:           string;
  appointmentStatus: 'confirmed' | 'pending' | 'cancelled' | 'showed' | 'noshow';
  notes?:          string;
  assignedUserId?: string;
}

export interface GHLOpportunity {
  id?:             string;
  pipelineId:      string;
  pipelineStageId: string;
  name:            string;
  status:          'open' | 'won' | 'lost' | 'abandoned';
  contactId:       string;
}

// ─── Request bodies ───────────────────────────────────────────────────────────

export interface CallOutcomeBody {
  contactId: string;
  outcome:   'busy_interested' | 'not_interested' | 'no_answer' | 'callback' | 'appointment';
  notes?:    string;
  callerName?: string;
}

export interface SendSurveyBody {
  contactId: string;
  language?: 'nl' | 'en';
}

export interface SurveyWebhookBody {
  contactId: string;
  answers: {
    hoursPerWeek?:  string;
    tasks?:         string[];
    growthPhase?:   string;
    aiStatus?:      string;
    [key: string]:  unknown;
  };
  submittedAt?: string;
}

export interface BookAppointmentBody {
  contactId:  string;
  datetime:   string;           // ISO 8601: "2026-04-15T10:00:00+02:00"
  duration?:  number;           // minutes, default 30
  advisorId?: string;           // GHL user ID
  location?:  string;
  notes?:     string;
}

// ─── Callback queue ───────────────────────────────────────────────────────────

export interface CallbackQueueItem {
  contactId:      string;
  firstName?:     string;
  lastName?:      string;
  email?:         string;
  phone?:         string;
  companyName?:   string;
  leadStatus?:    string;
  callbackRequired: boolean;
  surveyCompletedAt?: string;
  interestLevel?: string;
  tags?:          string[];
}

// ─── Internal contact update payload ─────────────────────────────────────────

export interface ContactUpdatePayload {
  firstName?:    string;
  lastName?:     string;
  email?:        string;
  phone?:        string;
  companyName?:  string;
  customFields?: Array<{ id: string; field_value: string }>;
}

// ─── Lead score ───────────────────────────────────────────────────────────────

export interface LeadScore {
  score:      number;
  label:      'hot' | 'warm' | 'cold';
  breakdown:  Record<string, number>;
}
