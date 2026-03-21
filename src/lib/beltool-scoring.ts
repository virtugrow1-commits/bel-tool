import type { SurveyAnswers } from '@/types/beltool';

export interface Scores {
  gebeld: number;
  enquetes: number;
  afspraken: number;
  verstuurd: number;
  afgevallen: number;
  geenGehoor: number;
  reeks: number;
  bestReeks: number;
  callbacks: number;
  log: ActivityLogEntry[];
}

export interface ActivityLogEntry {
  time: string;
  contact: string;
  result: string;
  contactId?: string;
  companyId?: string;
}

export function initScores(): Scores {
  return {
    gebeld: 0,
    enquetes: 0,
    afspraken: 0,
    verstuurd: 0,
    afgevallen: 0,
    geenGehoor: 0,
    reeks: 0,
    bestReeks: 0,
    callbacks: 0,
    log: [],
  };
}

export function calcLeadScore(answers: SurveyAnswers): number {
  let s = 0;
  const h = answers.hours;
  if (h === '10-15 uur' || h === '15+ uur') s += 30;
  else if (h === '6-10 uur') s += 20;
  else if (h === '3-5 uur') s += 10;

  if (answers.tasks.length >= 3) s += 20;
  else if (answers.tasks.length >= 1) s += 10;

  if (answers.growth === 'Klaar voor groei') s += 25;
  else if (answers.growth) s += 10;

  if (answers.ai === 'Komt niet aan toe') s += 25;
  else if (answers.ai) s += 15;

  return s;
}

export function leadLabel(score: number): 'hot' | 'warm' | 'cold' {
  return score >= 60 ? 'hot' : score >= 35 ? 'warm' : 'cold';
}

export function fmtTime(): string {
  return new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}
