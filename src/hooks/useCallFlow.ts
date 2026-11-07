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
import { useState, useCallback, useRef, useEffect } from 'react';
import { invokeAuthenticated } from '@/lib/authenticated-functions';
import { nextCallState, type DeviceStatus } from '@/lib/call-status';
import { supabase } from '@/integrations/supabase/client';
import type { Company, CompanyContact, CallPhase, CallState, SurveyAnswers } from '@/types/beltool';
import { cliq } from '@/lib/beltool-ghl';
import { saveCallResult } from '@/lib/call-results';

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
  organizationId,
}: UseCallFlowOptions & { organizationId?: string }) {
  const [activeCompId,    setActiveCompId]    = useState<string | null>(null);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [expandedComp,    setExpandedComp]    = useState<string | null>(null);
  const [phase,           setPhase]           = useState<CallPhase>('idle');
  const [callState,       setCallState]       = useState<CallState>('idle');
  const [activeCallId,    setActiveCallId]    = useState<string | null>(null);
  const [answers,         setAnswers]         = useState<SurveyAnswers>({ hours: '', tasks: [], tasksOther: '', growth: '', ai: '' });
  const [notes,           setNotes]           = useState('');
  const [saveError,setSaveError]=useState('');
  const [saving,setSaving]=useState(false);
  const requestRef=useRef(crypto.randomUUID());
  const retryRef=useRef<(() => Promise<boolean>) | null>(null);
  const savingRef=useRef(false);
  const [bookDate,        setBookDate]        = useState('');
  const [bookTime,        setBookTime]        = useState('');
  const [bookAdvisor,     setBookAdvisor]     = useState('');
  const [showDetail,      setShowDetail]      = useState(false);

  // Track call duration — ref so it doesn't trigger re-renders
  const callStartRef   = useRef<number | null>(null);
  const callDurationRef = useRef<number>(0);

  const resetCallState = useCallback(() => {
    pollRef.current.stopped = true;
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
    requestRef.current=crypto.randomUUID();setSaveError('');retryRef.current=null;
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
  const pollRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; until: number; answered: boolean; stopped: boolean }>({ timer: null, until: 0, answered: false, stopped: true });
  const hangupRef = useRef<() => void>(() => {});
  const stopPolling = useCallback(() => {
    const p = pollRef.current; p.stopped = true;
    if (p.timer) clearTimeout(p.timer); p.timer = null;
  }, []);
  useEffect(() => stopPolling, [stopPolling]);

  const startDialing = useCallback(async (callId?: string) => {
    setCallState('dialing');
    if (callId) setActiveCallId(callId);
    addScore('gebeld');
    callStartRef.current = null; // duration starts when the contact answers (status 5)
    callDurationRef.current = 0;
    stopPolling();
    const p = pollRef.current;
    p.stopped = false; p.answered = false; p.until = Date.now() + 3 * 60 * 1000; // ringing window; extended once answered
    const tick = async () => {
      if (p.stopped || Date.now() > p.until) { p.stopped = true; return; }
      // Paused while the tab is hidden to spare the VoIPzeker limit (30/min)
      if (typeof document !== 'undefined' && document.hidden) { p.timer = setTimeout(tick, 2000); return; }
      let delay = 2000;
      try {
        const { data, error } = await invokeAuthenticated('voipzeker-call', { body: { action: 'status' } });
        if (p.stopped) return;
        if (error) delay = 5000;
        else if (data?.success && typeof data.status === 'number') {
          const step = nextCallState(data.status as DeviceStatus, p.answered);
          if (step === 'ringing') setCallState(s => (s === 'active' ? s : 'ringing'));
          if (step === 'active' && !p.answered) {
            p.answered = true;
            callStartRef.current = Date.now();
            setCallState('active');
            p.until = Date.now() + 4 * 60 * 60 * 1000;
          }
          if (step === 'ended') { p.stopped = true; hangupRef.current(); return; }
        }
      } catch { delay = 5000; }
      if (p.answered) delay = Math.max(delay, 5000); // slower while active, until ended
      if (!p.stopped) p.timer = setTimeout(tick, delay);
    };
    p.timer = setTimeout(tick, 1500);
  }, [addScore, stopPolling]);

  // ── confirmConnected ───────────────────────────────────────────────────────
  const confirmConnected = useCallback(() => {
    setCallState('active');
    setPhase('intro');
    pollRef.current.answered = true; pollRef.current.until = Date.now() + 4 * 60 * 60 * 1000; // manual fallback; keep polling (5s) to detect the end
    callStartRef.current = callStartRef.current || Date.now();

    if (activeCompId) {
      updateCompStage(activeCompId, 'bellen');
      // Tag contact as currently in call (for incoming call detection)
      if (activeContactId) {
        cliq.addTag(activeContactId, ['beltool-in-gesprek']).catch(() => {});
      }
    }
  }, [activeCompId, activeContactId, updateCompStage, stopPolling]);

  // ── hangup ─────────────────────────────────────────────────────────────────
  const hangup = useCallback(async () => {
    stopPolling();
    // Capture duration before resetting
    if (callStartRef.current) {
      callDurationRef.current = Math.round((Date.now() - callStartRef.current) / 1000);
    }
    callStartRef.current = null;

    const contactToClean   = activeContactId;
    setCallState('ended');
    setActiveCallId(null);

    // VoIPzeker biedt geen remote hangup — het gesprek wordt op het toestel beëindigd.


    if (contactToClean) {
      cliq.removeTag(contactToClean, ['beltool-call-now', 'beltool-in-gesprek']).catch(console.error);
    }

    setTimeout(() => setCallState('idle'), 1500);
  }, [activeContactId, stopPolling]);
  hangupRef.current = () => { void hangup(); };

  // ── endCall ────────────────────────────────────────────────────────────────
  const endCall = useCallback(async (
    ph:CallPhase,stage:Company['stage'],currentAnswers:SurveyAnswers,currentNotes:string,
    activeContact:CompanyContact | null,activeComp:Company | null,callerName?:string,
    callback?:{date:string;time:string;note:string}, resultOverride?:string,
  ):Promise<boolean> => {
    if(savingRef.current || !activeContact || !activeComp)return false;
    const duration=callDurationRef.current || (callStartRef.current?Math.round((Date.now()-callStartRef.current)/1000):0);
    const payload={requestId:requestRef.current,contactId:activeContact.id,companyId:activeComp.id,companyName:activeComp.name,contactName:`${activeContact.firstName} ${activeContact.lastName}`,phone:activeContact.phone,...(activeContact.country?{country:activeContact.country}:{}),result:resultOverride || stage,durationSeconds:duration,notes:currentNotes,...(callback?{callback}:{})};
    const persist=async():Promise<boolean>=>{
      savingRef.current=true;setSaving(true);setSaveError('');
      try{
        await saveCallResult(payload);
        updateCompStage(activeComp.id,stage);
        updateContact(activeComp.id,{...activeContact,notes:currentNotes,surveyAnswers:currentAnswers});
        await hangup();setPhase(ph);retryRef.current=null;return true;
      }catch(e){setSaveError(e instanceof Error?e.message:'Gesprek opslaan mislukt');return false;}
      finally{savingRef.current=false;setSaving(false);}
    };
    retryRef.current=persist;
    return persist();
  },[updateCompStage,updateContact,hangup]);
  const retrySave=useCallback(async()=>{if(retryRef.current)await retryRef.current();},[]);

  const nextContact = useCallback(() => {if(!savingRef.current && !retryRef.current)resetCallState();}, [resetCallState]);

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
    callDurationRef, saveError, saving, retrySave,
  };
}
