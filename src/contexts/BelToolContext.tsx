import { createContext, useContext } from 'react';
import type { Translations } from '@/lib/beltool-i18n';
import type { SurveyConfig, Webhook } from '@/types/beltool';
import type { Scores } from '@/lib/beltool-scoring';
import type { User } from '@/lib/beltool-data';

export interface BelToolContextValue {
  lang: string;
  setLang: (l: string) => void;
  user: User | null;
  t: Translations;
  allScores: Record<string, Scores>;
  setAllScores: React.Dispatch<React.SetStateAction<Record<string, Scores>>>;
  webhooks: Webhook[];
  setWebhooks: React.Dispatch<React.SetStateAction<Webhook[]>>;
  apiKey: string;
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
  surveyConfig: SurveyConfig;
  setSurveyConfig: React.Dispatch<React.SetStateAction<SurveyConfig>>;
}

export const BelToolContext = createContext<BelToolContextValue | null>(null);

export function useBelTool() {
  const ctx = useContext(BelToolContext);
  if (!ctx) throw new Error('useBelTool must be used within BelToolContext');
  return ctx;
}
