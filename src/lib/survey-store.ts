import { SurveyResponse } from '@/types/survey';

const STORAGE_KEY = 'cliqmakers_surveys';

export function getSurveys(): SurveyResponse[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveSurvey(survey: SurveyResponse): void {
  const surveys = getSurveys();
  const idx = surveys.findIndex(s => s.id === survey.id);
  if (idx >= 0) {
    surveys[idx] = survey;
  } else {
    surveys.push(survey);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
}

export function getSurveyById(id: string): SurveyResponse | undefined {
  return getSurveys().find(s => s.id === id);
}

export function deleteSurvey(id: string): void {
  const surveys = getSurveys().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
}

export function createEmptySurvey(overrides?: Partial<SurveyResponse>): SurveyResponse {
  return {
    id: crypto.randomUUID(),
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    companyName: '',
    hoursLostPerWeek: '',
    repetitiveTasks: '',
    currentPhase: '',
    aiStatus: '',
    callerNotes: '',
    status: 'nieuw',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
