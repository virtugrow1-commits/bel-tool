import { supabase } from '@/integrations/supabase/client';
import { withRetry, isRetryableError } from '@/lib/retry';

function getAmsterdamOffset(date: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(`${date}T12:00:00Z`));

  const offsetValue = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+1';
  const match = offsetValue.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);

  if (!match) return '+01:00';

  const [, sign, hours, minutes = '00'] = match;
  return `${sign}${hours.padStart(2, '0')}:${minutes}`;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hh, mm] = time.split(':').map(Number);
  const totalMin = hh * 60 + mm + minutesToAdd;
  const endHH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
  const endMM = String(totalMin % 60).padStart(2, '0');
  return `${endHH}:${endMM}`;
}

async function callCliq(action: string, params: Record<string, unknown> = {}) {
  return withRetry(
    async () => {
      const { data, error } = await supabase.functions.invoke('ghl-proxy', {
        body: { action, ...params },
      });
      if (error) throw new Error(`CLIQ ${action} failed: ${error.message}`);
      return data;
    },
    {
      maxRetries: 2,
      baseDelay: 800,
      shouldRetry: (err) => isRetryableError(err),
      onRetry: (err, attempt) => {
        console.warn(`[CLIQ] Retrying ${action} (attempt ${attempt + 1}):`, err);
      },
    }
  );
}

export const cliq = {
  async getContacts(query?: string) {
    return callCliq('getContacts', { query, limit: 100 });
  },

  async getContact(contactId: string) {
    return callCliq('getContact', { contactId });
  },

  async createContact(data: { name: string; email?: string; phone?: string; companyName?: string; tags?: string[]; source?: string }) {
    return callCliq('createContact', data);
  },

  async updateContactStage(contactId: string, stage: string) {
    // Legacy: Add tag for the stage
    await callCliq('addTag', { contactId, tags: [stage] });
  },

  async updateContact(contactId: string, data: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    linkedin?: string;
  }) {
    const fullName = data.name || [data.firstName, data.lastName].filter(Boolean).join(' ').trim();

    return callCliq('updateContact', {
      contactId,
      ...(fullName ? { name: fullName } : {}),
      ...(typeof data.email === 'string' ? { email: data.email } : {}),
      ...(typeof data.phone === 'string' ? { phone: data.phone } : {}),
      ...(typeof data.companyName === 'string' ? { companyName: data.companyName } : {}),
      ...(typeof data.linkedin === 'string' ? { website: data.linkedin } : {}),
    });
  },

  async saveSurveyAnswers(contactId: string, answers: unknown) {
    const fields = answers as Record<string, string>;

    // Always save as a note (reliable, no custom field config needed)
    const noteBody = `📋 Bel-Tool Enquête Resultaten:\n⏱️ Uren/week: ${fields.hours || '-'}\n🔄 Taken: ${Array.isArray(fields.tasks) ? fields.tasks.join(', ') : fields.tasks || '-'}\n📈 Groeifase: ${fields.growth || '-'}\n🤖 AI status: ${fields.ai || '-'}`;
    await callCliq('createNote', { contactId, body: noteBody });

    // Try to save as custom fields (may fail if fields not configured in GHL)
    try {
      const customFields: { id: string; field_value: string }[] = [];
      if (fields.hours) customFields.push({ id: 'beltool_uren_per_week', field_value: fields.hours });
      if (fields.tasks) customFields.push({ id: 'beltool_taken', field_value: Array.isArray(fields.tasks) ? fields.tasks.join(', ') : String(fields.tasks) });
      if (fields.growth) customFields.push({ id: 'beltool_groeifase', field_value: fields.growth });
      if (fields.ai) customFields.push({ id: 'beltool_ai_status', field_value: fields.ai });

      if (customFields.length > 0) {
        await callCliq('saveCustomFields', { contactId, customFields });
      }
    } catch (err) {
      // Custom fields may not be configured yet — note was already saved
      console.warn('[CLIQ] Custom fields save failed (fields may not exist in GHL):', err);
    }
  },

  async bookAppointment(contactId: string, date: string, time: string, advisor: string, calendarId?: string, notes?: string, title?: string) {
    const offset = getAmsterdamOffset(date);
    const startTime = `${date}T${time}:00${offset}`;
    const endTime = `${date}T${addMinutesToTime(time, 30)}:00${offset}`;

    return callCliq('createAppointment', {
      contactId,
      calendarId: calendarId || 'default',
      startTime,
      endTime,
      title: title || 'Adviesgesprek',
      assignedUserId: advisor,
      notes,
    });
  },

  async createTask(contactId: string, title: string, data?: { body?: string; dueDate?: string; assignedTo?: string }) {
    return callCliq('createTask', {
      contactId,
      title,
      body: data?.body || '',
      dueDate: data?.dueDate || new Date(Date.now() + 86400000).toISOString(),
      assignedTo: data?.assignedTo,
    });
  },

  async createNote(contactId: string, note: string) {
    return callCliq('createNote', { contactId, body: note });
  },

  async logCall(contactId: string, result: string) {
    await callCliq('createNote', {
      contactId,
      body: `📞 Belresultaat: ${result}\n📅 ${new Date().toLocaleString('nl-NL')}`,
    });
  },

  async upsertOpportunity(contactId: string, pipelineId: string, stageId: string, name: string, opportunityId?: string) {
    return callCliq('upsertOpportunity', { contactId, pipelineId, stageId, name, opportunityId });
  },

  async getCalendars() {
    return callCliq('getCalendars');
  },

  async getFreeSlots(calendarId: string, startDate: string, endDate?: string) {
    return callCliq('getFreeSlots', { calendarId, startDate, endDate });
  },

  async getUsers() {
    return callCliq('getUsers');
  },

  async getPipelines() {
    return callCliq('getPipelines');
  },

  async searchOpportunities(pipelineId: string, stageId?: string, limit = 25, startAfter?: number, startAfterId?: string) {
    return callCliq('searchOpportunities', { pipelineId, stageId, limit, startAfter, startAfterId });
  },

  async triggerCall(contactId: string) {
    return callCliq('triggerCall', { contactId });
  },

  async removeTag(contactId: string, tags: string[]) {
    return callCliq('removeTag', { contactId, tags });
  },

  async addTag(contactId: string, tags: string[]) {
    return callCliq('addTag', { contactId, tags });
  },

  async sendEmail(contactId: string, _template: string) {
    // Trigger via GHL workflow/automation - add tag to trigger
    await callCliq('addTag', { contactId, tags: ['beltool-send-survey'] });
  },

  /**
   * Send a WhatsApp message via GHL Conversations API.
   * Falls back to tag-based workflow trigger if Conversations API is not available.
   */
  async sendWhatsAppMessage(contactId: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    try {
      const result = await callCliq('sendMessage', {
        type: 'WhatsApp',
        contactId,
        message,
      });
      return { success: true, messageId: result?.messageId || result?.id };
    } catch (err) {
      // Fallback: trigger via workflow tag
      console.warn('[CLIQ] WhatsApp Conversations API failed, falling back to tag:', err);
      await callCliq('addTag', { contactId, tags: ['beltool-send-whatsapp'] });
      return { success: true };
    }
  },

  /**
   * Send an SMS via GHL Conversations API.
   */
  async sendSMS(contactId: string, message: string): Promise<{ success: boolean }> {
    try {
      await callCliq('sendMessage', {
        type: 'SMS',
        contactId,
        message,
      });
      return { success: true };
    } catch (err) {
      console.warn('[CLIQ] SMS send failed:', err);
      return { success: false };
    }
  },

  /**
   * Send an email via GHL Conversations API.
   */
  async sendEmailMessage(contactId: string, subject: string, html: string): Promise<{ success: boolean }> {
    try {
      await callCliq('sendMessage', {
        type: 'Email',
        contactId,
        subject,
        html,
        message: html.replace(/<[^>]*>/g, ''), // plain text fallback
      });
      return { success: true };
    } catch (err) {
      console.warn('[CLIQ] Email send failed:', err);
      return { success: false };
    }
  },

  /**
   * Get conversation history for a contact.
   */
  async getConversation(contactId: string) {
    return callCliq('getConversation', { contactId });
  },

  async getMessages(conversationId: string, limit = 20) {
    return callCliq('getMessages', { conversationId, limit });
  },

  async triggerWebhook(url: string, payload?: unknown) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('[CLIQ] Webhook error:', e);
    }
  },
};
