/**
 * ghl.service.ts
 * Centrale service voor alle GoHighLevel API v2 calls.
 * Alle calls gaan via deze service — nooit direct vanuit routes.
 */

import axios, { AxiosError } from 'axios';
import type {
  GHLContact,
  GHLTask,
  GHLAppointment,
  ContactUpdatePayload,
} from '../types';

const GHL_BASE    = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

// ─── Axios instance met retry logic ──────────────────────────────────────────

const ghlClient = axios.create({
  baseURL: GHL_BASE,
  timeout: 15_000,
  headers: {
    'Version':      GHL_VERSION,
    'Content-Type': 'application/json',
  },
});

// Auth header injected per-request (token kan wisselen in multi-tenant setup)
function authHeader() {
  const key = process.env.GHL_API_KEY;
  if (!key) throw new Error('GHL_API_KEY is not configured');
  return { Authorization: `Bearer ${key}` };
}

function locationId(): string {
  const id = process.env.GHL_LOCATION_ID;
  if (!id) throw new Error('GHL_LOCATION_ID is not configured');
  return id;
}

// Retry on connection reset / 5xx
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable =
        (err instanceof AxiosError && (
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ECONNABORTED' ||
          (err.response?.status ?? 0) >= 500
        ));
      if (!isRetryable || i >= retries) throw err;
      await new Promise(r => setTimeout(r, 800 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

// ─── Contact ─────────────────────────────────────────────────────────────────

/**
 * Haal een contact op uit GHL.
 */
export async function getContact(contactId: string): Promise<GHLContact> {
  return withRetry(async () => {
    const { data } = await ghlClient.get(`/contacts/${contactId}`, {
      headers: authHeader(),
    });
    return data.contact || data;
  });
}

/**
 * Update contact velden en/of custom fields in GHL.
 */
export async function updateContact(
  contactId: string,
  payload: ContactUpdatePayload,
): Promise<GHLContact> {
  return withRetry(async () => {
    const { data } = await ghlClient.put(`/contacts/${contactId}`, payload, {
      headers: authHeader(),
    });
    return data.contact || data;
  });
}

/**
 * Update specifieke custom fields op een contact.
 * fieldMap: { 'beltool_call_outcome': 'busy_interested', ... }
 */
export async function updateCustomFields(
  contactId: string,
  fieldMap: Record<string, string>,
): Promise<void> {
  const customFields = Object.entries(fieldMap).map(([id, field_value]) => ({
    id,
    field_value,
  }));
  await withRetry(() =>
    ghlClient.put(
      `/contacts/${contactId}`,
      { customFields },
      { headers: authHeader() },
    ),
  );
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

/**
 * Voeg één of meerdere tags toe aan een contact.
 */
export async function addTag(
  contactId: string,
  tags: string | string[],
): Promise<void> {
  const tagArr = Array.isArray(tags) ? tags : [tags];
  await withRetry(() =>
    ghlClient.post(
      `/contacts/${contactId}/tags`,
      { tags: tagArr },
      { headers: authHeader() },
    ),
  );
}

/**
 * Verwijder tags van een contact.
 */
export async function removeTag(
  contactId: string,
  tags: string | string[],
): Promise<void> {
  const tagArr = Array.isArray(tags) ? tags : [tags];
  await withRetry(() =>
    ghlClient.delete(`/contacts/${contactId}/tags`, {
      headers: authHeader(),
      data: { tags: tagArr },
    }),
  );
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

/**
 * Maak een taak aan gekoppeld aan een contact.
 */
export async function createTask(
  contactId: string,
  task: Omit<GHLTask, 'id'>,
): Promise<GHLTask> {
  return withRetry(async () => {
    const { data } = await ghlClient.post(
      `/contacts/${contactId}/tasks`,
      {
        title:      task.title,
        body:       task.body || '',
        dueDate:    task.dueDate,
        completed:  false,
        assignedTo: task.assignedTo,
      },
      { headers: authHeader() },
    );
    return data.task || data;
  });
}

/**
 * Haal alle open taken op voor een contact en sluit ze.
 */
export async function closeOpenTasks(contactId: string): Promise<number> {
  return withRetry(async () => {
    const { data } = await ghlClient.get(`/contacts/${contactId}/tasks`, {
      headers: authHeader(),
    });
    const tasks: GHLTask[] = data.tasks || [];
    const open = tasks.filter(t => !t.completed);

    await Promise.allSettled(
      open.map(t =>
        ghlClient.put(
          `/contacts/${contactId}/tasks/${t.id}`,
          { completed: true },
          { headers: authHeader() },
        ),
      ),
    );

    return open.length;
  });
}

// ─── Notes ───────────────────────────────────────────────────────────────────

/**
 * Maak een notitie aan op een contact.
 */
export async function createNote(
  contactId: string,
  body: string,
): Promise<void> {
  await withRetry(() =>
    ghlClient.post(
      `/contacts/${contactId}/notes`,
      { body },
      { headers: authHeader() },
    ),
  );
}

// ─── Email / Messaging ───────────────────────────────────────────────────────

/**
 * Stuur een email via GHL Conversations API.
 */
export async function sendEmail(
  contactId: string,
  subject: string,
  html: string,
): Promise<void> {
  await withRetry(() =>
    ghlClient.post(
      '/conversations/messages',
      {
        type:      'Email',
        contactId,
        subject,
        html,
        message:   html.replace(/<[^>]*>/g, ''), // plain text fallback
      },
      { headers: authHeader() },
    ),
  );
}

/**
 * Stuur een WhatsApp bericht via GHL.
 */
export async function sendWhatsApp(
  contactId: string,
  message: string,
): Promise<void> {
  await withRetry(() =>
    ghlClient.post(
      '/conversations/messages',
      { type: 'WhatsApp', contactId, message },
      { headers: authHeader() },
    ),
  );
}

/**
 * Trigger een GHL workflow via een tag.
 * (Alternatief voor directe email als je GHL automations gebruikt)
 */
export async function triggerWorkflow(
  contactId: string,
  triggerTag: string,
): Promise<void> {
  await addTag(contactId, triggerTag);
}

// ─── Appointments ────────────────────────────────────────────────────────────

function getAmsterdamOffset(isoDate: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Amsterdam',
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date(isoDate));
    const tz = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+2';
    const m  = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return '+02:00';
    return `${m[1]}${m[2].padStart(2, '0')}:${(m[3] || '00')}`;
  } catch {
    return '+02:00';
  }
}

function addMinutes(isoTime: string, minutes: number): string {
  return new Date(new Date(isoTime).getTime() + minutes * 60_000).toISOString();
}

/**
 * Maak een afspraak aan in GHL.
 */
export async function createAppointment(
  contactId: string,
  params: {
    datetime:    string;    // ISO 8601
    duration?:   number;    // minutes (default 30)
    advisorId?:  string;
    title?:      string;
    notes?:      string;
    location?:   string;
  },
): Promise<GHLAppointment> {
  const calendarId = process.env.GHL_CALENDAR_ID;
  if (!calendarId) throw new Error('GHL_CALENDAR_ID is not configured');

  const duration  = params.duration || 30;
  const startTime = params.datetime;
  const endTime   = addMinutes(startTime, duration);

  return withRetry(async () => {
    const { data } = await ghlClient.post(
      '/calendars/events/appointments',
      {
        calendarId,
        locationId:        locationId(),
        contactId,
        startTime,
        endTime,
        title:             params.title || 'Adviesgesprek',
        appointmentStatus: 'confirmed',
        assignedUserId:    params.advisorId,
        notes:             params.notes,
        location:          params.location,
      },
      { headers: authHeader() },
    );
    return data.appointment || data;
  });
}

// ─── Opportunities ────────────────────────────────────────────────────────────

/**
 * Zoek opportunities voor een contact en update de stage.
 */
export async function updateOpportunityStage(
  contactId: string,
  stageId: string,
  pipelineId: string,
): Promise<void> {
  return withRetry(async () => {
    // Zoek bestaande opportunity
    const { data: searchData } = await ghlClient.get(
      `/opportunities/search?location_id=${locationId()}&contact_id=${contactId}`,
      { headers: authHeader() },
    );
    const opp = searchData?.opportunities?.[0];

    if (opp) {
      await ghlClient.put(
        `/opportunities/${opp.id}`,
        { pipelineStageId: stageId, status: 'open' },
        { headers: authHeader() },
      );
    } else {
      await ghlClient.post(
        '/opportunities/',
        {
          pipelineId,
          locationId:      locationId(),
          name:            'Lead',
          pipelineStageId: stageId,
          status:          'open',
          contactId,
        },
        { headers: authHeader() },
      );
    }
  });
}

// ─── Contacts zoeken voor callback queue ─────────────────────────────────────

/**
 * Zoek contacten waar callback_required = true en lead_status = callback_ready.
 * GHL heeft geen directe custom field filter, dus we gebruiken tags.
 */
export async function getContactsByTag(tag: string, limit = 100): Promise<GHLContact[]> {
  return withRetry(async () => {
    const { data } = await ghlClient.get(
      `/contacts/?locationId=${locationId()}&tags=${encodeURIComponent(tag)}&limit=${limit}`,
      { headers: authHeader() },
    );
    return data.contacts || [];
  });
}

/**
 * Zoek contacten via query string.
 */
export async function searchContacts(query: string, limit = 50): Promise<GHLContact[]> {
  return withRetry(async () => {
    const { data } = await ghlClient.get(
      `/contacts/?locationId=${locationId()}&query=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: authHeader() },
    );
    return data.contacts || [];
  });
}
