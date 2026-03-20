export interface SurveyResponse {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  // Q1: Tijdlek
  hoursLostPerWeek: string;
  // Q2: Activiteiten
  repetitiveTasks: string;
  // Q3: Groeipijn
  currentPhase: 'bijbenen' | 'klaar-voor-groei' | '';
  // Q4: AI Check
  aiStatus: 'al-bezig' | 'komt-niet-aan-toe' | '';
  // Notes
  callerNotes: string;
  // Status
  status: 'nieuw' | 'gebeld' | 'enquete-verstuurd' | 'ingevuld' | 'afspraak-gepland' | 'afgerond';
  createdAt: string;
  appointmentDate?: string;
}

export interface CallerSession {
  callerName: string;
  currentContact: Partial<SurveyResponse>;
}
