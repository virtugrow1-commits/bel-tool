/**
 * routes/index.ts
 * Alle route handlers voor de Bel-Tool backend.
 *
 * Endpoints:
 *   POST /call-outcome       — sla beluitkomst op in GHL
 *   POST /send-survey        — stuur enquête email
 *   POST /survey-webhook     — verwerk ingevulde enquête
 *   GET  /callback-queue     — haal contacten op die teruggebeld moeten worden
 *   POST /book-appointment   — boek afspraak in GHL
 *   GET  /logs               — event log (admin)
 *   GET  /health             — healthcheck
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  getContact,
  updateContact,
  updateCustomFields,
  addTag,
  removeTag,
  createTask,
  createNote,
  closeOpenTasks,
  sendEmail,
  createAppointment,
  getContactsByTag,
} from '../services/ghl.service';
import {
  surveyEmailHtml,
  thankYouEmailHtml,
  surveyEmailSubject,
  thankYouEmailSubject,
} from '../services/email.templates';
import { logger } from '../utils/logger';
import { calcLeadScore, labelEmoji } from '../utils/scoring';
import type {
  CallOutcomeBody,
  SendSurveyBody,
  SurveyWebhookBody,
  BookAppointmentBody,
} from '../types';

export const router = Router();

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const callOutcomeSchema = z.object({
  contactId:  z.string().min(1),
  outcome:    z.enum(['busy_interested', 'not_interested', 'no_answer', 'callback', 'appointment']),
  notes:      z.string().optional(),
  callerName: z.string().optional(),
});

const sendSurveySchema = z.object({
  contactId: z.string().min(1),
  language:  z.enum(['nl', 'en']).optional().default('nl'),
});

const surveyWebhookSchema = z.object({
  contactId:   z.string().min(1),
  answers:     z.object({
    hoursPerWeek: z.string().optional(),
    tasks:        z.array(z.string()).optional(),
    growthPhase:  z.string().optional(),
    aiStatus:     z.string().optional(),
  }).passthrough(),
  submittedAt: z.string().optional(),
});

const bookAppointmentSchema = z.object({
  contactId:  z.string().min(1),
  datetime:   z.string().min(1),
  duration:   z.number().optional().default(30),
  advisorId:  z.string().optional(),
  location:   z.string().optional(),
  notes:      z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSurveyUrl(contactId: string): string {
  const base = process.env.SURVEY_BASE_URL || 'https://enquete.cliqmakers.nl/enquete';
  return `${base}/${contactId}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

/** Due date voor taak: morgen 9:00 Amsterdam tijd */
function tomorrowDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

// ─── GET /health ──────────────────────────────────────────────────────────────

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status:    'ok',
    timestamp: isoNow(),
    env: {
      ghlConfigured:     !!process.env.GHL_API_KEY && !!process.env.GHL_LOCATION_ID,
      calendarConfigured: !!process.env.GHL_CALENDAR_ID,
      surveyUrl:          getSurveyUrl('example'),
    },
  });
});

// ─── POST /call-outcome ───────────────────────────────────────────────────────

router.post('/call-outcome', async (req: Request, res: Response) => {
  const parse = callOutcomeSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation error', details: parse.error.flatten() });
    return;
  }

  const body = parse.data as CallOutcomeBody;
  const { contactId, outcome, notes, callerName } = body;

  try {
    await logger.track('CALL_OUTCOME_SAVED', contactId, async () => {
      // 1. Update custom fields
      const fieldUpdates: Record<string, string> = {
        beltool_call_outcome: outcome,
        beltool_last_call_date: todayIso(),
      };

      if (outcome === 'busy_interested') {
        fieldUpdates.beltool_interest_level   = 'warm';
        fieldUpdates.beltool_callback_required = 'true';
        fieldUpdates.beltool_lead_status       = 'survey_pending';
      } else if (outcome === 'callback') {
        fieldUpdates.beltool_callback_required = 'true';
        fieldUpdates.beltool_lead_status       = 'callback_scheduled';
      } else if (outcome === 'not_interested') {
        fieldUpdates.beltool_callback_required = 'false';
        fieldUpdates.beltool_lead_status       = 'not_interested';
      } else if (outcome === 'no_answer') {
        fieldUpdates.beltool_lead_status = 'no_answer';
      }

      await updateCustomFields(contactId, fieldUpdates);

      // 2. Tags
      const tagsToRemove = ['beltool-geen-gehoor', 'beltool-terugbellen', 'beltool-in-gesprek'];
      const tagMap: Record<string, string> = {
        busy_interested: 'beltool-interesse',
        not_interested:  'beltool-afgevallen',
        no_answer:       'beltool-geen-gehoor',
        callback:        'beltool-terugbellen',
        appointment:     'beltool-afspraak-gepland',
      };
      await removeTag(contactId, tagsToRemove).catch(() => {});
      await addTag(contactId, tagMap[outcome]);

      // 3. Notitie
      const noteLines = [
        `📞 Belresultaat: ${outcome}`,
        callerName ? `👤 Beller: ${callerName}` : '',
        notes ? `📝 ${notes}` : '',
        `🕐 ${new Date().toLocaleString('nl-NL')}`,
      ].filter(Boolean).join('\n');
      await createNote(contactId, noteLines);

      // 4. Survey automatisch sturen bij interesse
      if (outcome === 'busy_interested') {
        const contact = await getContact(contactId);
        if (contact.email) {
          const surveyUrl = getSurveyUrl(contactId);
          await sendEmail(
            contactId,
            surveyEmailSubject(contact.firstName || 'daar'),
            surveyEmailHtml({
              firstName:   contact.firstName || '',
              companyName: contact.companyName,
              surveyUrl,
              callerName,
            }),
          );
          await addTag(contactId, 'survey-sent');
          await updateCustomFields(contactId, {
            beltool_survey_sent_at: isoNow(),
          });
          logger.success('SURVEY_SENT', contactId, { surveyUrl });
        }
      }
    }, { outcome, notes });

    res.json({ success: true, contactId, outcome });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to save call outcome', message: msg });
  }
});

// ─── POST /send-survey ────────────────────────────────────────────────────────

router.post('/send-survey', async (req: Request, res: Response) => {
  const parse = sendSurveySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation error', details: parse.error.flatten() });
    return;
  }

  const { contactId } = parse.data as SendSurveyBody;

  try {
    const result = await logger.track('SURVEY_SENT', contactId, async () => {
      const contact    = await getContact(contactId);
      const surveyUrl  = getSurveyUrl(contactId);

      if (!contact.email) {
        throw new Error('Contact heeft geen e-mailadres — kan enquête niet sturen');
      }

      await sendEmail(
        contactId,
        surveyEmailSubject(contact.firstName || 'daar'),
        surveyEmailHtml({
          firstName:   contact.firstName || '',
          companyName: contact.companyName,
          surveyUrl,
        }),
      );

      await addTag(contactId, 'survey-sent');
      await updateCustomFields(contactId, {
        beltool_survey_sent_at: isoNow(),
        beltool_lead_status:    'survey_pending',
      });

      return { surveyUrl, email: contact.email };
    });

    res.json({ success: true, contactId, ...result });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to send survey', message: msg });
  }
});

// ─── POST /survey-webhook ─────────────────────────────────────────────────────

router.post('/survey-webhook', async (req: Request, res: Response) => {
  const parse = surveyWebhookSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation error', details: parse.error.flatten() });
    return;
  }

  const body = parse.data as SurveyWebhookBody;
  const { contactId, answers, submittedAt } = body;
  const completedAt = submittedAt || isoNow();

  try {
    await logger.track('SURVEY_COMPLETED', contactId, async () => {
      const contact    = await getContact(contactId);
      const { score, label } = calcLeadScore(answers);
      const emoji      = labelEmoji(label);
      const leadLabel  = `${emoji} ${label.toUpperCase()}` as '🔥 HOT' | '☀️ WARM' | '❄️ COLD';

      // 1. Update GHL custom fields
      const tasksStr = (answers.tasks || []).join(', ');
      await updateCustomFields(contactId, {
        beltool_survey_completed_at: completedAt,
        beltool_lead_status:         'callback_ready',
        beltool_callback_required:   'true',
        beltool_lead_score:          String(score),
        beltool_interest_level:      label,
        ...(answers.hoursPerWeek ? { beltool_uren_per_week: answers.hoursPerWeek } : {}),
        ...(tasksStr              ? { beltool_taken:         tasksStr }             : {}),
        ...(answers.growthPhase   ? { beltool_groeifase:     answers.growthPhase }  : {}),
        ...(answers.aiStatus      ? { beltool_ai_status:     answers.aiStatus }     : {}),
      });

      // 2. Tags
      await addTag(contactId, ['survey-completed', `lead-${label}`]);
      await removeTag(contactId, ['survey-sent']).catch(() => {});

      // 3. Notitie met volledige samenvatting
      const noteLines = [
        `✅ Enquête ingevuld op ${new Date(completedAt).toLocaleString('nl-NL')}`,
        `🎯 Lead score: ${score}pts (${leadLabel})`,
        `⏱️ Uren/week: ${answers.hoursPerWeek || '-'}`,
        `🔄 Taken: ${tasksStr || '-'}`,
        `📈 Groeifase: ${answers.growthPhase || '-'}`,
        `🤖 AI status: ${answers.aiStatus || '-'}`,
      ].join('\n');
      await createNote(contactId, noteLines);

      // 4. Taak aanmaken: "Bel klant terug"
      const task = await createTask(contactId, {
        title:     'Bel klant terug — enquête ingevuld',
        body:      `${contact.firstName || ''} ${contact.companyName ? `(${contact.companyName})` : ''} heeft de enquête ingevuld. Lead score: ${score}pts (${leadLabel})`,
        dueDate:   tomorrowDueDate(),
        completed: false,
      });
      logger.success('TASK_CREATED', contactId, { taskId: task.id, title: task.title });

      // 5. Bedankmail sturen
      if (contact.email) {
        await sendEmail(
          contactId,
          thankYouEmailSubject(contact.firstName || 'daar'),
          thankYouEmailHtml({
            firstName:   contact.firstName || '',
            companyName: contact.companyName,
            leadLabel,
            score,
            answers,
          }),
        );
        logger.success('THANK_YOU_EMAIL_SENT', contactId, { email: contact.email });
      }

      return { score, label, taskId: task.id };
    }, { answers });

    res.json({ success: true, contactId });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to process survey webhook', message: msg });
  }
});

// ─── GET /callback-queue ──────────────────────────────────────────────────────

router.get('/callback-queue', async (_req: Request, res: Response) => {
  try {
    const result = await logger.track('CALLBACK_QUEUE_FETCHED', 'system', async () => {
      // Haal contacten op met tag 'survey-completed' maar zonder 'appointment-booked'
      const contacts = await getContactsByTag('survey-completed');

      const queue = contacts
        .filter(c => {
          const tags = c.tags || [];
          return tags.includes('survey-completed') && !tags.includes('appointment-booked');
        })
        .map(c => {
          const cf = Object.fromEntries(
            (c.customFields || []).map(f => [f.id, f.value || f.fieldValue || ''])
          );
          return {
            contactId:          c.id,
            firstName:          c.firstName,
            lastName:           c.lastName,
            email:              c.email,
            phone:              c.phone,
            companyName:        c.companyName,
            leadStatus:         cf.beltool_lead_status,
            interestLevel:      cf.beltool_interest_level,
            leadScore:          cf.beltool_lead_score,
            surveyCompletedAt:  cf.beltool_survey_completed_at,
            callbackRequired:   cf.beltool_callback_required === 'true',
            tags:               c.tags,
          };
        })
        .sort((a, b) => {
          // HOT leads eerst, dan WARM, dan sorteer op survey completion tijd
          const order = { hot: 0, warm: 1, cold: 2 };
          const aOrd  = order[a.interestLevel as keyof typeof order] ?? 3;
          const bOrd  = order[b.interestLevel as keyof typeof order] ?? 3;
          if (aOrd !== bOrd) return aOrd - bOrd;
          return (b.surveyCompletedAt || '').localeCompare(a.surveyCompletedAt || '');
        });

      return queue;
    });

    res.json({ success: true, count: result.length, contacts: result });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to fetch callback queue', message: msg });
  }
});

// ─── POST /book-appointment ───────────────────────────────────────────────────

router.post('/book-appointment', async (req: Request, res: Response) => {
  const parse = bookAppointmentSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation error', details: parse.error.flatten() });
    return;
  }

  const body     = parse.data as BookAppointmentBody;
  const { contactId, datetime, duration, advisorId, location, notes } = body;

  try {
    const appointment = await logger.track('APPOINTMENT_BOOKED', contactId, async () => {
      const contact = await getContact(contactId);

      // 1. Maak afspraak aan in GHL
      const appt = await createAppointment(contactId, {
        datetime,
        duration,
        advisorId,
        location,
        notes,
        title: contact.companyName
          ? `Adviesgesprek — ${contact.companyName}`
          : `Adviesgesprek — ${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      });

      // 2. Update contact velden
      await updateCustomFields(contactId, {
        beltool_appointment_status: 'booked',
        beltool_call_outcome:       'appointment_booked',
        beltool_callback_required:  'false',
        beltool_lead_status:        'appointment_booked',
        beltool_appointment_date:   datetime.split('T')[0],
      });

      // 3. Sluit open taken
      const closedCount = await closeOpenTasks(contactId);

      // 4. Tags bijwerken
      await addTag(contactId, 'appointment-booked');
      await removeTag(contactId, ['beltool-terugbellen', 'beltool-interesse']).catch(() => {});

      // 5. Bevestigingsnotitie
      const fmtDate = new Date(datetime).toLocaleString('nl-NL', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Amsterdam',
      });
      await createNote(
        contactId,
        `📅 Afspraak geboekt\n📆 ${fmtDate}\n📍 ${location || 'Google Meet'}\n${notes ? `📝 ${notes}` : ''}\n🔒 ${closedCount} taken gesloten`.trim(),
      );

      return { appointmentId: appt.id, datetime, closedTasks: closedCount };
    }, { datetime, advisorId });

    res.json({ success: true, contactId, ...appointment });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to book appointment', message: msg });
  }
});

// ─── GET /logs ────────────────────────────────────────────────────────────────

router.get('/logs', (req: Request, res: Response) => {
  const limit     = Math.min(Number(req.query.limit) || 100, 500);
  const contactId = req.query.contactId as string | undefined;
  const event     = req.query.event as string | undefined;

  let logs = logger.getAll(limit);
  if (contactId) logs = logs.filter(l => l.contactId === contactId);
  if (event)     logs = logs.filter(l => l.event === event);

  res.json({
    count: logs.length,
    stats: logger.stats(),
    logs,
  });
});
