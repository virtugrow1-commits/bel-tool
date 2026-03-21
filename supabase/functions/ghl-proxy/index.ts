import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const GHL_API_KEY = Deno.env.get('GHL_API_KEY');
  if (!GHL_API_KEY) {
    return new Response(JSON.stringify({ error: 'GHL_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const GHL_LOCATION_ID = Deno.env.get('GHL_LOCATION_ID');
  if (!GHL_LOCATION_ID) {
    return new Response(JSON.stringify({ error: 'GHL_LOCATION_ID not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

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
        const res = await fetch(url, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL contacts error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET SINGLE CONTACT ───
      case 'getContact': {
        const res = await fetch(`${GHL_BASE}/contacts/${params.contactId}`, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL contact error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── UPDATE CONTACT ───
      case 'updateContact': {
        const { contactId, ...updateData } = params;
        const res = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
          method: 'PUT', headers: ghlHeaders,
          body: JSON.stringify(updateData),
        });
        if (!res.ok) throw new Error(`GHL update contact error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── ADD TAG ───
      case 'addTag': {
        const res = await fetch(`${GHL_BASE}/contacts/${params.contactId}/tags`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify({ tags: params.tags }),
        });
        if (!res.ok) throw new Error(`GHL add tag error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── CREATE NOTE ───
      case 'createNote': {
        const res = await fetch(`${GHL_BASE}/contacts/${params.contactId}/notes`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify({ body: params.body, userId: params.userId }),
        });
        if (!res.ok) throw new Error(`GHL create note error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── CREATE TASK ───
      case 'createTask': {
        const res = await fetch(`${GHL_BASE}/contacts/${params.contactId}/tasks`, {
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

      // ─── CREATE APPOINTMENT ───
      case 'createAppointment': {
        const res = await fetch(`${GHL_BASE}/calendars/events/appointments`, {
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
        const res = await fetch(`${GHL_BASE}/calendars/?locationId=${GHL_LOCATION_ID}`, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL calendars error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET PIPELINES ───
      case 'getPipelines': {
        const res = await fetch(`${GHL_BASE}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL pipelines error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── SEARCH OPPORTUNITIES (by pipeline + stage) ───
      case 'searchOpportunities': {
        const pipelineId = params.pipelineId || '';
        const stageId = params.stageId || '';
        const limit = params.limit || 100;
        let url = `${GHL_BASE}/opportunities/search?location_id=${GHL_LOCATION_ID}&limit=${limit}`;
        if (pipelineId) url += `&pipeline_id=${pipelineId}`;
        if (stageId) url += `&pipeline_stage_id=${stageId}`;
        const res = await fetch(url, { headers: ghlHeaders });
        if (!res.ok) throw new Error(`GHL search opportunities error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── CREATE/UPDATE OPPORTUNITY ───
      case 'upsertOpportunity': {
        // Search existing opportunity for this contact
        const searchRes = await fetch(
          `${GHL_BASE}/opportunities/search?location_id=${GHL_LOCATION_ID}&contact_id=${params.contactId}`,
          { headers: ghlHeaders }
        );
        const searchData = await searchRes.json();
        const existing = searchData?.opportunities?.[0];

        if (existing) {
          // Update existing opportunity stage
          const res = await fetch(`${GHL_BASE}/opportunities/${existing.id}`, {
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
          // Create new opportunity
          const res = await fetch(`${GHL_BASE}/opportunities/`, {
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
        break;
      }

      // ─── SAVE CUSTOM FIELDS (Survey answers) ───
      case 'saveCustomFields': {
        const res = await fetch(`${GHL_BASE}/contacts/${params.contactId}`, {
          method: 'PUT', headers: ghlHeaders,
          body: JSON.stringify({ customFields: params.customFields }),
        });
        if (!res.ok) throw new Error(`GHL custom fields error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── TRIGGER OUTBOUND CALL via workflow tag ───
      case 'triggerCall': {
        // Add a tag that triggers an outbound call workflow in GHL
        const callTag = `beltool-call-now`;
        const tagRes = await fetch(`${GHL_BASE}/contacts/${params.contactId}/tags`, {
          method: 'POST', headers: ghlHeaders,
          body: JSON.stringify({ tags: [callTag] }),
        });
        if (!tagRes.ok) throw new Error(`GHL trigger call error [${tagRes.status}]: ${await tagRes.text()}`);
        result = await tagRes.json();
        break;
      }

      // ─── REMOVE TAG (cleanup after call trigger) ───
      case 'removeTag': {
        const res = await fetch(`${GHL_BASE}/contacts/${params.contactId}/tags`, {
          method: 'DELETE', headers: ghlHeaders,
          body: JSON.stringify({ tags: params.tags }),
        });
        if (!res.ok) throw new Error(`GHL remove tag error [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ─── GET USERS (for assignedTo) ───
      case 'getUsers': {
        const res = await fetch(`${GHL_BASE}/users/search?companyId=${GHL_LOCATION_ID}`, { headers: ghlHeaders });
        if (!res.ok) {
          // Try location-based endpoint
          const res2 = await fetch(`${GHL_BASE}/users/?locationId=${GHL_LOCATION_ID}`, { headers: ghlHeaders });
          if (!res2.ok) throw new Error(`GHL users error [${res2.status}]: ${await res2.text()}`);
          result = await res2.json();
        } else {
          result = await res.json();
        }
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
