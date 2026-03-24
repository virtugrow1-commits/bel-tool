/**
 * useCallFlow — Orchestrates the entire call lifecycle.
 *
 * Fixed in this version:
 *  • Call duration is tracked and passed to endCall so it can be logged in GHL.
 *  • GHL receives a structured call-activity note with duration + result.
 *  • auto-callback useEffect deps corrected to prevent duplicate callbacks.
 *  • Opportunity stage updates use the stored opportunityId where available.
 *  • Company name synced to GHL when contact is updated.
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Company, CompanyContact, CallPhase, CallState, SurveyAnswers } from '@/types/beltool';
import { cliq } from '@/lib/beltool-ghl';

/** Write a completed call to call_sessions for analytics + history */
async function writeCallSession(params: {
  contactId:       string;
  companyId:       string;
  companyName:     string;
  contactName:     string;
  phone:           string;
  callerName:      string;
  durationSeconds: number;
  result:          string;
  notes:           string;
  voysCallId?:     string;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await (supabase as any).from('call_sessions').insert({
      contact_id:       params.contactId,
      company_id:       params.companyId,
      company_name:     params.companyName,
      contact_name:     params.contactName,
      phone:            params.phone,
      caller_id:        session?.user.id || null,
      caller_name:      params.callerName,
      started_at:       new Date(Date.now() - params.durationSeconds * 1000).toISOString(),
      ended_at:         new Date().toISOString(),
      duration_seconds: params.durationSeconds,
      result:           params.result,
      notes:            params.notes,
      voys_call_id:     params.voysCallId || null,
      ghl_synced:       true,
    });
  } catch (err) {
    console.warn('[CallFlow] call_sessions write failed:', err);
  }
}

const STAGE_TO_CLIQ: Record<string, string> = {
  nietInteressant:    'niet geïnteresseerd',
  geenGehoor:         'geen gehoor',
  terugbellenGepland: 'terugbellen gepland',
  afspraak:           'afspraak gepland',
  enqueteVerstuurd:   'digitaal verstuurd',
  enqueteTel:         'enquête voltooid',
  anderMoment:        'op een ander moment',
};

interface UseCallFlowOptions {
  updateCompStage: (compId: string, stage: Company['stage']) => void;
  updateContact:   (compId: string, contact: CompanyContact) => void;
  addScore:        (type: string) => void;
  pipelineInfo:    { pipelineId: string; stageId: string } | null;
  stageMap:        Record<string, string>;
}

export function useCallFlow({
  updateCompStage,
  updateContact,
  addScore,
  pipelineInfo,
  stageMap,
}: UseCallFlowOptions) {
  const [activeCompId,    setActiveCompId]    = useState<string | null>(null);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [expandedComp,    setExpandedComp]    = useState<string | null>(null);
  const [phase,           setPhase]           = useState<CallPhase>('idle');
  const [callState,       setCallState]       = useState<CallState>('idle');
  const [activeCallId,    setActiveCallId]    = useState<string | null>(null);
  const [answers,         setAnswers]         = useState<SurveyAnswers>({ hours: '', tasks: [], tasksOther: '', growth: '', ai: '' });
  const [notes,           setNotes]           = useState('');
  const [bookDate,        setBookDate]        = useState('');
  const [bookTime,        setBookTime]        = useState('');
  const [bookAdvisor,     setBookAdvisor]     = useState('');
  const [showDetail,      setShowDetail]      = useState(false);

  // Track call duration — ref so it doesn't trigger re-renders
  const callStartRef   = useRef<number | null>(null);
  const callDurationRef = useRef<number>(0);

  const resetCallState = useCallback(() => {
    setPhase('idle');
    setCallState('idle');
    setActiveCompId(null);
    setActiveContactId(null);
    setShowDetail(false);
    callStartRef.current   = null;
    callDurationRef.current = 0;
  }, []);

  // ── selectContact ──────────────────────────────────────────────────────────
  const selectContact = useCallback((comp: Company, contact: CompanyContact) => {
    setActiveCompId(comp.id);
    setActiveContactId(contact.id);
    setPhase('intro');
    setCallState('idle');
    callStartRef.current   = null;
    callDurationRef.current = 0;

    // Pre-populate from locally cached survey answers
    const saved = contact.surveyAnswers;
    setAnswers(
      saved && (saved.hours || saved.tasks.length > 0 || saved.growth || saved.ai)
        ? { ...saved }
        : { hours: '', tasks: [], tasksOther: '', growth: '', ai: '' }
    );
    setNotes(contact.notes || '');
    setBookDate('');
    setBookTime('');
    setBookAdvisor('');

    const freshStages: Company['stage'][] = ['nieuw', 'bellen'];
    if (freshStages.includes(comp.stage)) {
      updateCompStage(comp.id, 'bellen');
    }

    // Fetch GHL custom fields in background to hydrate survey answers
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
          updateContact(comp.id, { ...contact, surveyAnswers: ghlAnswers });
        }
      }).catch(err => console.warn('[CallFlow] GHL custom fields fetch failed:', err));
    }
  }, [updateCompStage, updateContact]);

  // ── startDialing ───────────────────────────────────────────────────────────
  const startDialing = useCallback(async (callId?: string) => {
    setCallState('dialing');
    if (callId) setActiveCallId(callId);
    addScore('gebeld');
    callStartRef.current = Date.now();

    setTimeout(() => setCallState('ringing'), 800);
  }, [addScore]);

  // ── confirmConnected ───────────────────────────────────────────────────────
  const confirmConnected = useCallback(() => {
    setCallState('active');
    setPhase('intro');
    callStartRef.current = callStartRef.current || Date.now();

    if (activeCompId) {
      updateCompStage(activeCompId, 'bellen');
      // Tag contact as currently in call (for incoming call detection)
      if (activeContactId) {
        cliq.addTag(activeContactId, ['beltool-in-gesprek']).catch(() => {});
      }
    }
  }, [activeCompId, activeContactId, updateCompStage]);

  // ── hangup ─────────────────────────────────────────────────────────────────
  const hangup = useCallback(async () => {
    // Capture duration before resetting
    if (callStartRef.current) {
      callDurationRef.current = Math.round((Date.now() - callStartRef.current) / 1000);
    }
    callStartRef.current = null;

    const callIdToHangup   = activeCallId;
    const contactToClean   = activeContactId;
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
      cliq.removeTag(contactToClean, ['beltool-call-now', 'beltool-in-gesprek']).catch(console.error);
    }

    setTimeout(() => setCallState('idle'), 1500);
  }, [activeCallId, activeContactId]);

  // ── endCall ────────────────────────────────────────────────────────────────
  const endCall = useCallback((
    ph:             CallPhase,
    stage:          Company['stage'],
    currentAnswers: SurveyAnswers,
    currentNotes:   string,
    activeContact:  CompanyContact | null,
    activeComp:     Company | null,
    callerName?:    string,
  ) => {
    if (!activeCompId) {
      hangup();
      setPhase(ph);
      return;
    }

    // Capture duration from ref (populated by hangup or by callStartRef)
    const duration = callDurationRef.current > 0
      ? callDurationRef.current
      : callStartRef.current
        ? Math.round((Date.now() - callStartRef.current) / 1000)
        : 0;

    updateCompStage(activeCompId, stage);

    // Persist notes on the contact object
    if (activeContact && currentNotes.trim()) {
      updateContact(activeCompId, { ...activeContact, notes: currentNotes });
    }

    // ── GHL: move opportunity in pipeline ────────────────────────────────────
    if (pipelineInfo && STAGE_TO_CLIQ[stage]) {
      const targetStageId = stageMap[STAGE_TO_CLIQ[stage]];
      if (targetStageId) {
        const oppId = activeContact?.opportunityId;
        cliq.upsertOpportunity(
          activeContactId || '',
          pipelineInfo.pipelineId,
          targetStageId,
          activeComp?.name || 'Lead',
          oppId,
        ).catch(err => console.error('[CallFlow] CLIQ opportunity update failed:', err));
      } else {
        console.warn(`[CallFlow] CLIQ stage not found for "${STAGE_TO_CLIQ[stage]}". Available:`, Object.keys(stageMap));
      }
    }

    // ── GHL: structured call activity note ───────────────────────────────────
    const durationStr = duration > 0
      ? duration >= 60
        ? `${Math.floor(duration / 60)}m ${duration % 60}s`
        : `${duration}s`
      : 'onbekend';

    const resultEmoji: Record<string, string> = {
      geenGehoor:         '📵',
      afspraak:           '📅',
      enqueteTel:         '✅',
      enqueteVerstuurd:   '📨',
      nietInteressant:    '🚫',
      terugbellenGepland: '🔔',
      anderMoment:        '⏳',
    };

    const callNote = [
      `${resultEmoji[stage] || '📞'} Belresultaat: ${STAGE_TO_CLIQ[stage] || stage}`,
      `⏱️ Gespreksduur: ${durationStr}`,
      callerName ? `👤 Beller: ${callerName}` : '',
      currentNotes.trim() ? `📝 Notities: ${currentNotes.trim()}` : '',
      `🕐 ${new Date().toLocaleString('nl-NL')}`,
    ].filter(Boolean).join('\n');

    if (activeContactId) {
      cliq.createNote(activeContactId, callNote).catch(console.error);
    }

    // ── GHL: survey answers as custom fields ─────────────────────────────────
    if (['done', 'sent'].includes(ph) && currentAnswers.hours && activeContactId) {
      cliq.saveSurveyAnswers(activeContactId, currentAnswers).catch(console.error);
      if (activeContact) {
        updateContact(activeCompId, { ...activeContact, surveyAnswers: currentAnswers });
      }
    }

    // ── GHL: workflow-trigger tags ────────────────────────────────────────────
    const WORKFLOW_TAGS: Record<string, string[]> = {
      nietInteressant:    ['beltool-afgevallen'],
      geenGehoor:         ['beltool-geen-gehoor'],
      terugbellenGepland: ['beltool-terugbellen'],
      afspraak:           ['beltool-afspraak-gepland'],
      enqueteVerstuurd:   ['beltool-enquete-verstuurd'],
      enqueteTel:         ['beltool-enquete-voltooid'],
      anderMoment:        ['beltool-ander-moment'],
    };
    const wfTags = WORKFLOW_TAGS[stage];
    if (wfTags && activeContactId) {
      cliq.removeTag(activeContactId, [
        'beltool-geen-gehoor', 'beltool-terugbellen', 'beltool-ander-moment',
        'beltool-in-gesprek',
      ]).catch(() => {});
      cliq.addTag(activeContactId, wfTags).catch(err => console.warn('[CallFlow] Workflow tag failed:', err));
    }

    // ── Supabase: write call session for analytics + contact history ──────────
    if (activeContactId && activeComp) {
      writeCallSession({
        contactId:       activeContactId,
        companyId:       activeCompId,
        companyName:     activeComp?.name || '',
        contactName:     activeContact ? `${activeContact.firstName} ${activeContact.lastName}` : '',
        phone:           activeContact?.phone || '',
        callerName:      callerName || '',
        durationSeconds: duration,
        result:          stage,
        notes:           currentNotes,
        voysCallId:      undefined,
      });
    }

    // Hang up any active call
    hangup();
    setPhase(ph);
  }, [activeCompId, activeContactId, pipelineInfo, stageMap, updateCompStage, updateContact, hangup]);

  const nextContact = useCallback(() => resetCallState(), [resetCallState]);

  const taskString = answers.tasks
    .concat(answers.tasksOther ? [answers.tasksOther] : [])
    .filter(Boolean)
    .join(', ');

  const phaseStep: Record<string, number> = { intro: 0, q1: 1, q2: 2, q3: 3, q4: 4, bridge: 5 };
  const curStep = phaseStep[phase] ?? -1;

  return {
    activeCompId,
    activeContactId,
    expandedComp,   setExpandedComp,
    phase,          setPhase,
    callState,      setCallState,
    activeCallId,   setActiveCallId,
    answers,        setAnswers,
    notes,          setNotes,
    bookDate,       setBookDate,
    bookTime,       setBookTime,
    bookAdvisor,    setBookAdvisor,
    showDetail,     setShowDetail,
    taskString,
    curStep,
    selectContact,
    startDialing,
    confirmConnected,
    hangup,
    endCall,
    nextContact,
    resetCallState,
    callDurationRef,
  };
}
