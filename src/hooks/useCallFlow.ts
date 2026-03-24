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
  updateContact: (compId: string, contact: CompanyContact) => void;
  addScore: (type: string) => void;
  pipelineInfo: { pipelineId: string; stageId: string } | null;
  stageMap: Record<string, string>;
}

export function useCallFlow({ updateCompStage, updateContact, addScore, pipelineInfo, stageMap }: UseCallFlowOptions) {
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
    // Pre-populate from locally cached survey answers
    const saved = contact.surveyAnswers;
    setAnswers(saved && (saved.hours || saved.tasks.length > 0 || saved.growth || saved.ai)
      ? { ...saved }
      : { hours: '', tasks: [], tasksOther: '', growth: '', ai: '' });
    setNotes(contact.notes || '');
    setBookDate('');
    setBookTime('');
    setBookAdvisor('');
    // Only move to 'bellen' if the lead is still fresh; preserve existing result stages
    const freshStages: Company['stage'][] = ['nieuw', 'bellen'];
    if (freshStages.includes(comp.stage)) {
      updateCompStage(comp.id, 'bellen');
    }

    // Fetch custom fields from GHL in background to sync survey answers
    if (contact.id && !contact.id.startsWith('local-')) {
      cliq.getContact(contact.id).then((data) => {
        const cf = data?.contact?.customFields || data?.customFields || [];
        const fieldMap: Record<string, string> = {};
        for (const f of cf) {
          const key = (f.id || f.fieldKey || '').toLowerCase();
          fieldMap[key] = f.value || f.fieldValue || '';
        }
        const hours = fieldMap['beltool_uren_per_week'] || '';
        const tasksRaw = fieldMap['beltool_taken'] || '';
        const growth = fieldMap['beltool_groeifase'] || '';
        const ai = fieldMap['beltool_ai_status'] || '';
        if (hours || tasksRaw || growth || ai) {
          const tasks = tasksRaw ? tasksRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
          const ghlAnswers: SurveyAnswers = { hours, tasks, tasksOther: '', growth, ai };
          setAnswers(ghlAnswers);
          // Cache on the contact for future use
          if (updateContact) {
            updateContact(comp.id, { ...contact, surveyAnswers: ghlAnswers });
          }
        }
      }).catch((err) => {
        console.warn('[CallFlow] Failed to fetch GHL custom fields:', err);
      });
    }
  }, [updateCompStage, updateContact]);

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

    // Auto-reset to idle after brief display of 'ended'
    setTimeout(() => {
      setCallState('idle');
    }, 1500);
  }, [activeCallId, activeContactId]);

  const endCall = useCallback((ph: CallPhase, stage: Company['stage'], currentAnswers: SurveyAnswers, currentNotes: string, activeContact: CompanyContact | null, activeComp: Company | null) => {
    if (activeCompId) {
      updateCompStage(activeCompId, stage);

      // Persist notes on the contact object so they survive between sessions
      if (activeContact && currentNotes.trim()) {
        updateContact(activeCompId, { ...activeContact, notes: currentNotes });
      }

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
        // Cache survey answers on contact for persistence
        if (activeContact) {
          updateContact(activeCompId, { ...activeContact, surveyAnswers: currentAnswers });
        }
      }

      // Add workflow-trigger tags based on result
      const contactId = activeContactId || '';
      const WORKFLOW_TAGS: Record<string, string[]> = {
        nietInteressant: ['beltool-afgevallen'],
        geenGehoor: ['beltool-geen-gehoor'],
        terugbellenGepland: ['beltool-terugbellen'],
        afspraak: ['beltool-afspraak-gepland'],
        enqueteVerstuurd: ['beltool-enquete-verstuurd'],
        enqueteTel: ['beltool-enquete-voltooid'],
        anderMoment: ['beltool-ander-moment'],
      };
      const wfTags = WORKFLOW_TAGS[stage];
      if (wfTags && contactId) {
        cliq.removeTag(contactId, ['beltool-geen-gehoor', 'beltool-terugbellen', 'beltool-ander-moment']).catch(() => {});
        cliq.addTag(contactId, wfTags).catch(err => console.warn('Workflow tag failed:', err));
      }
    }

    // Hang up any active call
    hangup();
    // Show the end phase (sent/done/lost/noanswer) instead of resetting to idle
    setPhase(ph);
  }, [activeCompId, activeContactId, pipelineInfo, stageMap, updateCompStage, updateContact, hangup]);

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
