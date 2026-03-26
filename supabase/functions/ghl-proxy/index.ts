import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

// ─── Retry helper for GHL API calls ──────────────────────────────────────────
// GHL occasionally resets connections (especially from IPv6 Supabase edge IPs).
// We retry up to 3 times with exponential backoff before giving up.
function isRetryable(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return (
    msg.includes('connection') ||
    msg.includes('reset') ||
    msg.includes('sendrequest') ||
    msg.includes('client error') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('eof')
  );
}

async function fetchGHL(
  url: string,
  options: RequestInit,
  maxRetries = 2,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
      // 502/503/504 are retryable
      if ([502, 503, 504].includes(res.status) && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 600 * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt >= maxRetries) throw err;
      const delay = 600 * Math.pow(2, attempt) + Math.random() * 300;
      console.warn(`[GHL Proxy] Retry ${attempt + 1}/${maxRetries} for ${url} after: ${err}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function hasValidContactId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim() !== ':id' && !value.trim().startsWith(':');
}

function requireContactId(params: Record<string, unknown>) {
  if (!hasValidContactId(params.contactId)) {
    throw new Error('Invalid contactId: placeholder route parameter received');
  }

  return params.contactId.trim();
}

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function sanitizeContactUpdate(params: Record<string, unknown>) {
  const { contactId: _ignoredContactId, ...updateData } = params;
  const sanitized = Object.fromEntries(
    Object.entries(updateData).filter(([, value]) => value !== undefined)
  );

  if ('email' in sanitized) {
    if (isValidEmail(sanitized.email)) {
      sanitized.email = sanitized.email.trim();
    } else {
      delete sanitized.email;
    }
  }

  return sanitized;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, organizationId, ...params } = body;

    // Try to resolve API key per organization
    let GHL_API_KEY = Deno.env.get('GHL_API_KEY') || '';
    let GHL_LOCATION_ID = Deno.env.get('GHL_LOCATION_ID') || '';

    if (organizationId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const sb = createClient(supabaseUrl, supabaseKey);
        const { data: org } = await sb.from('organizations').select('ghl_api_key, ghl_location_id').eq('id', organizationId).single();
        if (org?.ghl_api_key) GHL_API_KEY = org.ghl_api_key;
        if (org?.ghl_location_id) GHL_LOCATION_ID = org.ghl_location_id;
      } catch (e) {
        console.warn('[GHL Proxy] Org lookup failed, using default keys:', e);
      }
    }

    if (!GHL_API_KEY) {
      return new Response(JSON.stringify({ error: 'GHL_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!GHL_LOCATION_ID) {
      return new Response(JSON.stringify({ error: 'GHL_LOCATION_ID not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ghlHeaders = {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Version': GHL_VERSION,
      'Content-Type': 'application/json',
    };

    let result: unknown;

    switch (action) {
      // ─── FETCH CONTACTS ───
      case 'getContacts': {
        const limit = params.limit || 100;
        const query = params.query || '';
        const url = `${GHL_BASE}/contacts/?locationId=${GHL_LOCATION_ID}&limit=${limit}${query ? `&query=${encodeURIComponent(query)}` : ''}`;
        const res = await fetchGHL(url, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL contacts error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET SINGLE CONTACT ───
      case 'getContact': {
        const contactId = requireContactId(params);
        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}`, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL contact error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── UPDATE CONTACT ───
      case 'updateContact': {
        const contactId = requireContactId(params);
        const updateData = sanitizeContactUpdate(params);
        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}`, {
          method: 'PUT', headers: ghlHeaders,
          body: JSON.stringify(updateData),
        });
        if (!res.ok) {
          const errorText = await res.text();
          // Handle duplicate contact error: retry without email
          if (res.status === 400 && errorText.includes('duplicated contacts') && 'email' in updateData) {
            console.warn('GHL duplicate contact on email, retrying without email field');
            const { email: _removed, ...withoutEmail } = updateData;
            if (Object.keys(withoutEmail).length > 0) {
              const res2 = await fetchGHL(`${GHL_BASE}/contacts/${contactId}`, {
                method: 'PUT', headers: ghlHeaders,
                body: JSON.stringify(withoutEmail),
              });
              if (!res2.ok) throw new Error(`GHL update contact error [${res2.status}]: ${await res2.text()}`);
              result = await res2.json();
            } else {
              result = { success: true, note: 'Email skipped due to duplicate constraint' };
            }
          } else {
            throw new Error(`GHL update contact error [${res.status}]: ${errorText}`);
          }
        } else {
          result = await res.json();
        }
        break;
      }

      // ─── CREATE CONTACT ───
      case 'createContact': {
        const res = await fetchGHL(`${GHL_BASE}/contacts/`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify({
            locationId: GHL_LOCATION_ID,
            name: params.name || '',
            email: params.email || '',
            phone: params.phone || '',
            companyName: params.companyName || '',
            tags: params.tags || [],
            source: params.source || 'Bel-Tool Enquête',
            ...(params.customFields ? { customFields: params.customFields } : {}),
          }),
        });
        if (!res.ok) {
          const errorText = await res.text();
          // Handle duplicate contact: return existing contact info
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson?.meta?.contactId) {
              result = { contact: { id: errorJson.meta.contactId, name: errorJson.meta.contactName }, duplicate: true };
              break;
            }
          } catch { /* not JSON, fall through */ }
          throw new Error(`GHL create contact error [${res.status}]: ${errorText}`);
        }
        result = await res.json();
        break;
      }

      // ─── ADD TAG ───
      case 'addTag': {
        const contactId = requireContactId(params);
        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}/tags`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify({ tags: params.tags }),
        });
        if (!res.ok) throw new Error(`GHL add tag error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── CREATE NOTE ───
      case 'createNote': {
        const contactId = requireContactId(params);
        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}/notes`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify({ body: params.body, userId: params.userId }),
        });
        if (!res.ok) throw new Error(`GHL create note error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── CREATE TASK ───
      case 'createTask': {
        const contactId = requireContactId(params);
        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}/tasks`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify({
            title: params.title,
            body: params.body || '',
            dueDate: params.dueDate,
            completed: false,
            assignedTo: params.assignedTo,
          }),
        });
        if (!res.ok) throw new Error(`GHL create task error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET FREE SLOTS ───
      case 'getFreeSlots': {
        const calendarId = params.calendarId;
        const startDate = params.startDate;
        const endDate = params.endDate || params.startDate;
        if (!calendarId || !startDate) throw new Error('getFreeSlots requires calendarId and startDate');
        const startMs = new Date(`${startDate}T00:00:00+02:00`).getTime();
        const endMs = new Date(`${endDate}T23:59:59+02:00`).getTime();
        const url = `${GHL_BASE}/calendars/${calendarId}/free-slots?startDate=${startMs}&endDate=${endMs}&timezone=Europe/Amsterdam`;
        const res = await fetchGHL(url, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL free-slots error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── CREATE APPOINTMENT ───
      case 'createAppointment': {
        const res = await fetchGHL(`${GHL_BASE}/calendars/events/appointments`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify({
            calendarId: params.calendarId,
            locationId: GHL_LOCATION_ID,
            contactId: params.contactId,
            startTime: params.startTime,
            endTime: params.endTime,
            title: params.title || 'Adviesgesprek',
            appointmentStatus: 'confirmed',
            assignedUserId: params.assignedUserId,
            notes: params.notes,
          }),
        });
        if (!res.ok) throw new Error(`GHL appointment error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET CALENDARS ───
      case 'getCalendars': {
        const res = await fetchGHL(`${GHL_BASE}/calendars/?locationId=${GHL_LOCATION_ID}`, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL calendars error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET PIPELINES ───
      case 'getPipelines': {
        const res = await fetchGHL(`${GHL_BASE}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL pipelines error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── SEARCH OPPORTUNITIES (by pipeline + stage) ───
      case 'searchOpportunities': {
        const pipelineId = params.pipelineId || '';
        const stageId = params.stageId || '';
        const limit = params.limit || 25;
        let url = `${GHL_BASE}/opportunities/search?location_id=${GHL_LOCATION_ID}&limit=${limit}`;
        if (pipelineId) url += `&pipeline_id=${pipelineId}`;
        if (stageId) url += `&pipeline_stage_id=${stageId}`;
        if (params.startAfter) url += `&startAfter=${params.startAfter}`;
        if (params.startAfterId) url += `&startAfterId=${params.startAfterId}`;
        const res = await fetchGHL(url, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL search opportunities error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── CREATE/UPDATE OPPORTUNITY ───
      case 'upsertOpportunity': {
        // If we have the opportunity ID, update directly (no search needed)
        if (params.opportunityId) {
          const res = await fetchGHL(`${GHL_BASE}/opportunities/${params.opportunityId}`, {
            method: 'PUT', headers: ghlHeaders,
            body: JSON.stringify({
              pipelineStageId: params.stageId,
              status: params.status || 'open',
              name: params.name || 'Lead',
            }),
          });
          if (!res.ok) throw new Error(`GHL update opportunity error [${res.status}]: ${await res.text()}`);
          result = await res.json();
        } else {
          // Fallback: search by contact_id
          const searchRes = await fetchGHL(
            `${GHL_BASE}/opportunities/search?location_id=${GHL_LOCATION_ID}&contact_id=${params.contactId}`,
            { headers: ghlHeaders }
          );
          const searchData = await searchRes.json();
          const existing = searchData?.opportunities?.[0];

          if (existing) {
            const res = await fetchGHL(`${GHL_BASE}/opportunities/${existing.id}`, {
              method: 'PUT', headers: ghlHeaders,
              body: JSON.stringify({
                pipelineStageId: params.stageId,
                status: params.status || 'open',
                name: params.name || existing.name,
              }),
            });
            if (!res.ok) throw new Error(`GHL update opportunity error [${res.status}]: ${await res.text()}`);
            result = await res.json();
          } else {
            const res = await fetchGHL(`${GHL_BASE}/opportunities/`, {
              method: 'POST', headers: ghlHeaders,
              body: JSON.stringify({
                pipelineId: params.pipelineId,
                locationId: GHL_LOCATION_ID,
                name: params.name || 'Nieuwe lead',
                pipelineStageId: params.stageId,
                status: 'open',
                contactId: params.contactId,
              }),
            });
            if (!res.ok) throw new Error(`GHL create opportunity error [${res.status}]: ${await res.text()}`);
            result = await res.json();
          }
        }
        break;
      }

      // ─── SAVE CUSTOM FIELDS (Survey answers) ───
      case 'saveCustomFields': {
        const contactId = requireContactId(params);
        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}`, {
          method: 'PUT', headers: ghlHeaders,
          body: JSON.stringify({ customFields: params.customFields }),
        });
        if (!res.ok) throw new Error(`GHL custom fields error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── TRIGGER OUTBOUND CALL via workflow tag ───
      case 'triggerCall': {
        const contactId = requireContactId(params);
        // Add a tag that triggers an outbound call workflow in GHL
        const callTag = `beltool-call-now`;
        const tagRes = await fetchGHL(`${GHL_BASE}/contacts/${contactId}/tags`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify({ tags: [callTag] }),
        });
        if (!tagRes.ok) throw new Error(`GHL trigger call error [${tagRes.status}]: ${await tagRes.text()}`);
        result = await tagRes.json();
        break;
      }

      // ─── REMOVE TAG (cleanup after call trigger) ───
      case 'removeTag': {
        const contactId = requireContactId(params);
        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}/tags`, {
          method: 'DELETE', headers: ghlHeaders,
          body: JSON.stringify({ tags: params.tags }),
        });
        if (!res.ok) throw new Error(`GHL remove tag error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET USERS (for assignedTo) ───
      case 'getUsers': {
        const res = await fetchGHL(`${GHL_BASE}/users/search?companyId=${GHL_LOCATION_ID}`, { headers: ghlHeaders });
        if (!res.ok) {
          // Try location-based endpoint
          const res2 = await fetchGHL(`${GHL_BASE}/users/?locationId=${GHL_LOCATION_ID}`, { headers: ghlHeaders });
          if (!res2.ok) throw new Error(`GHL users error [${res2.status}]: ${await res2.text()}`);
          result = await res2.json();
        } else {
          result = await res.json();
        }
        break;
      }

      // ─── SEND MESSAGE (WhatsApp / SMS / Email via Conversations) ───
      case 'sendMessage': {
        const isWhatsApp = (params.type || 'WhatsApp') === 'WhatsApp';
        const hasTemplate = isWhatsApp && params.templateName;

        const messageBody: Record<string, unknown> = {
          type: params.type || 'WhatsApp',
          contactId: params.contactId,
          locationId: GHL_LOCATION_ID,
          ...(params.subject ? { subject: params.subject } : {}),
          ...(params.html ? { html: params.html } : {}),
        };

        if (hasTemplate) {
          const bodyParams: string[] = params.placeholders?.body || [];
          const headerParams: string[] = params.placeholders?.header || [];
          const buttonParams: string[] = params.placeholders?.buttons || [];

          // GHL WhatsApp templates use a nested whatsapp payload.
          messageBody.message = params.message || 'Template message';
          messageBody.whatsapp = {
            type: 'template',
            template: {
              name: params.templateName,
              lang: params.templateLang || 'nl',
            },
            placeholders: {
              header: headerParams,
              body: bodyParams,
              buttons: buttonParams,
            },
          };
        } else if (params.message) {
          messageBody.message = params.message;
        }

        console.log('[GHL Proxy] sendMessage payload:', JSON.stringify(messageBody));

        const res = await fetchGHL(`${GHL_BASE}/conversations/messages`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify(messageBody),
        });
        if (!res.ok) throw new Error(`GHL send message error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET CONVERSATION BY CONTACT ───
      case 'getConversation': {
        const res = await fetchGHL(
          `${GHL_BASE}/conversations/search?locationId=${GHL_LOCATION_ID}&contactId=${params.contactId}`,
          { headers: ghlHeaders }
        );
        if (!res.ok) throw new Error(`GHL conversation search error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET MESSAGES IN CONVERSATION ───
      case 'getMessages': {
        const limit = params.limit || 20;
        const res = await fetchGHL(
          `${GHL_BASE}/conversations/${params.conversationId}/messages?limit=${limit}`,
          { headers: ghlHeaders }
        );
        if (!res.ok) throw new Error(`GHL messages error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET NOTES FOR CONTACT ───
      case 'getNotes': {
        const contactId = requireContactId(params);
        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}/notes`, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL get notes error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET TASKS FOR CONTACT ───
      case 'getTasks': {
        const contactId = requireContactId(params);
        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}/tasks`, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL get tasks error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── COMPLETE TASK ───
      case 'completeTask': {
        const contactId = requireContactId(params);
        const taskId = params.taskId as string;
        if (!taskId) throw new Error('completeTask requires taskId');
        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}/tasks/${taskId}`, {
          method: 'PUT', headers: ghlHeaders,
          body: JSON.stringify({ completed: true }),
        });
        if (!res.ok) throw new Error(`GHL complete task error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET APPOINTMENTS FOR CONTACT ───
      case 'getAppointments': {
        const contactId = requireContactId(params);
        const res = await fetchGHL(
          `${GHL_BASE}/contacts/${contactId}/appointments`,
          { headers: ghlHeaders }
        );
        if (!res.ok) throw new Error(`GHL get appointments error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── UPDATE APPOINTMENT STATUS ───
      case 'updateAppointment': {
        const appointmentId = params.appointmentId as string;
        if (!appointmentId) throw new Error('updateAppointment requires appointmentId');
        const res = await fetchGHL(`${GHL_BASE}/calendars/events/appointments/${appointmentId}`, {
          method: 'PUT', headers: ghlHeaders,
          body: JSON.stringify({
            ...(params.status ? { appointmentStatus: params.status } : {}),
            ...(params.notes  ? { notes: params.notes } : {}),
          }),
        });
        if (!res.ok) throw new Error(`GHL update appointment error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── STRUCTURED CALL ACTIVITY LOG ───
      // Creates a rich note in GHL that captures the full call outcome.
      case 'logCallActivity': {
        const contactId = requireContactId(params);
        const durationSec = typeof params.durationSeconds === 'number' ? params.durationSeconds : 0;
        const durationStr = durationSec > 0
          ? durationSec >= 60
            ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
            : `${durationSec}s`
          : 'onbekend';

        const resultEmoji: Record<string, string> = {
          geenGehoor:         '📵',
          afspraak:           '📅',
          enqueteTel:         '✅',
          enqueteVerstuurd:   '📨',
          nietInteressant:    '🚫',
          terugbellenGepland: '🔔',
          anderMoment:        '⏳',
          gestart:            '📞',
        };

        const emoji = resultEmoji[params.result as string] || '📞';
        const lines = [
          `${emoji} Belresultaat: ${params.resultLabel || params.result}`,
          `⏱️ Gespreksduur: ${durationStr}`,
          params.callerName ? `👤 Beller: ${params.callerName}` : '',
          params.notes      ? `📝 Notities: ${params.notes}` : '',
          `🕐 ${new Date().toLocaleString('nl-NL')}`,
        ].filter(Boolean).join('\n');

        const res = await fetchGHL(`${GHL_BASE}/contacts/${contactId}/notes`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify({ body: lines }),
        });
        if (!res.ok) throw new Error(`GHL log call activity error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── ADD TO DNC LIST (via Supabase — GHL doesn't have native DNC API) ───
      // This action is handled client-side via Supabase; included here as a no-op
      // so the proxy doesn't throw on unknown action if called accidentally.
      case 'addToDNC': {
        result = { success: true, note: 'DNC updates handled via Supabase' };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('GHL proxy error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
