import type { LeadScore, SurveyWebhookBody } from '../types';

export function calcLeadScore(answers: SurveyWebhookBody['answers']): LeadScore {
  const breakdown: Record<string, number> = {};
  let score = 0;

  // Uren per week
  const hours = answers.hoursPerWeek || '';
  if (hours === '15+ uur')   { breakdown.hours = 30; score += 30; }
  else if (hours === '10-15 uur') { breakdown.hours = 25; score += 25; }
  else if (hours === '6-10 uur')  { breakdown.hours = 20; score += 20; }
  else if (hours === '3-5 uur')   { breakdown.hours = 10; score += 10; }
  else                             { breakdown.hours = 0; }

  // Aantal taken
  const tasks = answers.tasks || [];
  if (tasks.length >= 4)      { breakdown.tasks = 20; score += 20; }
  else if (tasks.length >= 2) { breakdown.tasks = 12; score += 12; }
  else if (tasks.length >= 1) { breakdown.tasks = 6;  score += 6; }
  else                         { breakdown.tasks = 0; }

  // Groeifase
  const growth = answers.growthPhase || '';
  if (growth === 'Klaar voor groei')    { breakdown.growth = 25; score += 25; }
  else if (growth === 'Bijbenen')       { breakdown.growth = 12; score += 12; }
  else if (growth)                      { breakdown.growth = 8;  score += 8; }
  else                                   { breakdown.growth = 0; }

  // AI status
  const ai = answers.aiStatus || '';
  if (ai === 'Komt niet aan toe')       { breakdown.ai = 25; score += 25; }
  else if (ai === 'Al mee bezig')       { breakdown.ai = 15; score += 15; }
  else if (ai)                          { breakdown.ai = 8;  score += 8; }
  else                                   { breakdown.ai = 0; }

  const label: LeadScore['label'] = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';

  return { score, label, breakdown };
}

export function labelEmoji(label: LeadScore['label']): string {
  return label === 'hot' ? '🔥' : label === 'warm' ? '☀️' : '❄️';
}
