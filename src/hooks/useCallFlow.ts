import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Company, CompanyContact, CallPhase, CallState, SurveyAnswers } from '@/types/beltool';
import { cliq } from '@/lib/beltool-ghl';

const STAGE_TO_CLIQ: Record<string, string> = {
  nietInteressant: 'niet geïnteresseerd',
  geenGehoor: 'geen gehoor',
  terugbellenGepland: 'terugbellen gepland',
  afspraak: 'afspraak gepland',
  enqueteVerstuurd: 'digitaal verstuurd',
  enqueteTel: 'enquête voltooid',
  anderMoment: 'op een ander moment',
};

interface UseCallFlowOptions {
  updateCompStage: (compId: string, stage: Company['stage']) => void;
  addScore: (type: string) => void;
  pipelineInfo: { pipelineId: string; stageId: string } | null;
  stageMap: Record<string, string>;
}

export function useCallFlow({ updateCompStage, addScore, pipelineInfo, stageMap }: UseCallFlowOptions) {
  const [activeCompId, setActiveCompId] = useState<string | null>(null);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [expandedComp, setExpandedComp] = useState<string | null>(null);
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<SurveyAnswers>({ hours: '', tasks: [], tasksOther: '', growth: '', ai: '' });
  const [notes, setNotes] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookAdvisor, setBookAdvisor] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  const resetCallState = useCallback(() => {
    setPhase('idle');
    setCallState('idle');
    setActiveCompId(null);
    setActiveContactId(null);
    setShowDetail(false);
  }, []);

  const selectContact = useCallback((comp: Company, contact: CompanyContact) => {
    setActiveCompId(comp.id);
    setActiveContactId(contact.id);
    setPhase('intro');
    setCallState('idle');
    setAnswers({ hours: '', tasks: [], tasksOther: '', growth: '', ai: '' });
    setNotes('');
    setBookDate('');
    setBookTime('');
    setBookAdvisor('');
    updateCompStage(comp.id, 'bellen');
  }, [updateCompStage]);

  const startDialing = useCallback(async (callId?: string) => {
    setCallState('dialing');
    if (callId) setActiveCallId(callId);
    addScore('gebeld');

    // Transition to ringing after brief delay
    setTimeout(() => {
      setCallState('ringing');
    }, 800);
  }, [addScore]);

  const confirmConnected = useCallback(() => {
    setCallState('active');
    setPhase('intro');
    if (activeCompId) {
      updateCompStage(activeCompId, 'bellen');
      cliq.logCall(activeContactId || '', 'started');
    }
  }, [activeCompId, activeContactId, updateCompStage]);

  const hangup = useCallback(async () => {
    const callIdToHangup = activeCallId;
    const contactToClean = activeContactId;
    setCallState('ended');
    setActiveCallId(null);

    if (callIdToHangup) {
      try {
        await supabase.functions.invoke('voys-call', {
          body: { action: 'hangup', callId: callIdToHangup },
        });
      } catch (err) {
        console.error('Voys hangup failed (call may already be ended):', err);
      }
    }
    if (contactToClean) {
      cliq.removeTag(contactToClean, ['beltool-call-now']).catch(console.error);
    }
  }, [activeCallId, activeContactId]);

  const endCall = useCallback((ph: CallPhase, stage: Company['stage'], currentAnswers: SurveyAnswers, currentNotes: string, activeContact: CompanyContact | null, activeComp: Company | null) => {
    if (activeCompId) {
      updateCompStage(activeCompId, stage);

      // Move opportunity in CLIQ pipeline
      if (pipelineInfo && STAGE_TO_CLIQ[stage]) {
        const targetStageId = stageMap[STAGE_TO_CLIQ[stage]];
        if (targetStageId) {
          const oppId = activeContact?.opportunityId;
          cliq.upsertOpportunity(
            activeContactId || '', pipelineInfo.pipelineId, targetStageId,
            activeComp?.name || 'Lead', oppId
          ).catch(err => console.error('CLIQ opportunity update failed:', err));
        } else {
          console.warn(`CLIQ stage not found for "${STAGE_TO_CLIQ[stage]}". Available:`, Object.keys(stageMap));
        }
      }

      if (currentNotes.trim()) {
        cliq.createNote(activeContactId || '', currentNotes).catch(console.error);
      }
      if (['done', 'sent'].includes(ph) && currentAnswers.hours) {
        cliq.saveSurveyAnswers(activeContactId || '', currentAnswers).catch(console.error);
      }
    }

    resetCallState();
  }, [activeCompId, activeContactId, pipelineInfo, stageMap, updateCompStage, resetCallState]);

  const nextContact = useCallback(() => {
    resetCallState();
  }, [resetCallState]);

  const taskString = answers.tasks
    .concat(answers.tasksOther ? [answers.tasksOther] : [])
    .filter(Boolean)
    .join(', ');

  const phaseStep: Record<string, number> = { intro: 0, q1: 1, q2: 2, q3: 3, q4: 4, bridge: 5 };
  const curStep = phaseStep[phase] ?? -1;

  return {
    activeCompId,
    activeContactId,
    expandedComp,
    setExpandedComp,
    phase,
    setPhase,
    callState,
    setCallState,
    activeCallId,
    setActiveCallId,
    answers,
    setAnswers,
    notes,
    setNotes,
    bookDate,
    setBookDate,
    bookTime,
    setBookTime,
    bookAdvisor,
    setBookAdvisor,
    showDetail,
    setShowDetail,
    taskString,
    curStep,
    selectContact,
    startDialing,
    confirmConnected,
    hangup,
    endCall,
    nextContact,
    resetCallState,
  };
}
