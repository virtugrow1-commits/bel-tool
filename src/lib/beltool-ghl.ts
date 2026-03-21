import { supabase } from '@/integrations/supabase/client';

async function callGHL(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('ghl-proxy', {
    body: { action, ...params },
  });
  if (error) throw new Error(`GHL ${action} failed: ${error.message}`);
  return data;
}

export const ghl = {
  async getContacts(query?: string) {
    return callGHL('getContacts', { query, limit: 100 });
  },

  async getContact(contactId: string) {
    return callGHL('getContact', { contactId });
  },

  async updateContactStage(contactId: string, stage: string) {
    // Add tag for the stage
    await callGHL('addTag', { contactId, tags: [stage] });
  },

  async saveSurveyAnswers(contactId: string, answers: unknown) {
    // Save as custom fields on the contact
    const fields = answers as Record<string, string>;
    const customFields: { id: string; field_value: string }[] = [];
    
    // Map survey answers to custom field keys
    // These should match your GHL custom fields
    if (fields.hours) customFields.push({ id: 'beltool_uren_per_week', field_value: fields.hours });
    if (fields.tasks) customFields.push({ id: 'beltool_taken', field_value: Array.isArray(fields.tasks) ? fields.tasks.join(', ') : String(fields.tasks) });
    if (fields.growth) customFields.push({ id: 'beltool_groeifase', field_value: fields.growth });
    if (fields.ai) customFields.push({ id: 'beltool_ai_status', field_value: fields.ai });

    if (customFields.length > 0) {
      await callGHL('saveCustomFields', { contactId, customFields });
    }

    // Also create a note with the full survey summary
    const noteBody = `📋 Bel-Tool Enquête Resultaten:\n⏱️ Uren/week: ${fields.hours || '-'}\n🔄 Taken: ${Array.isArray(fields.tasks) ? fields.tasks.join(', ') : fields.tasks || '-'}\n📈 Groeifase: ${fields.growth || '-'}\n🤖 AI status: ${fields.ai || '-'}`;
    await callGHL('createNote', { contactId, body: noteBody });
  },

  async bookAppointment(contactId: string, date: string, time: string, advisor: string, calendarId?: string, notes?: string) {
    const startTime = `${date}T${time}:00+02:00`;
    const endDate = new Date(`${date}T${time}:00`);
    endDate.setMinutes(endDate.getMinutes() + 15);
    const endTime = `${date}T${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00+02:00`;

    return callGHL('createAppointment', {
      contactId,
      calendarId: calendarId || 'default',
      startTime,
      endTime,
      title: 'Adviesgesprek - Bel-Tool',
      assignedUserId: advisor,
      notes,
    });
  },

  async createTask(contactId: string, title: string, data?: { body?: string; dueDate?: string; assignedTo?: string }) {
    return callGHL('createTask', {
      contactId,
      title,
      body: data?.body || '',
      dueDate: data?.dueDate || new Date(Date.now() + 86400000).toISOString(),
      assignedTo: data?.assignedTo,
    });
  },

  async createNote(contactId: string, note: string) {
    return callGHL('createNote', { contactId, body: note });
  },

  async logCall(contactId: string, result: string) {
    await callGHL('createNote', {
      contactId,
      body: `📞 Belresultaat: ${result}\n📅 ${new Date().toLocaleString('nl-NL')}`,
    });
  },

  async upsertOpportunity(contactId: string, pipelineId: string, stageId: string, name: string) {
    return callGHL('upsertOpportunity', { contactId, pipelineId, stageId, name });
  },

  async getCalendars() {
    return callGHL('getCalendars');
  },

  async getPipelines() {
    return callGHL('getPipelines');
  },

  async searchOpportunities(pipelineId: string, stageId?: string) {
    return callGHL('searchOpportunities', { pipelineId, stageId, limit: 100 });
  },

  async triggerCall(contactId: string) {
    return callGHL('triggerCall', { contactId });
  },

  async removeTag(contactId: string, tags: string[]) {
    return callGHL('removeTag', { contactId, tags });
  },

  async sendEmail(contactId: string, _template: string) {
    // Trigger via GHL workflow/automation - add tag to trigger
    await callGHL('addTag', { contactId, tags: ['beltool-send-survey'] });
  },

  async sendWhatsApp(contactId: string, _template: string) {
    // Trigger via GHL workflow/automation - add tag to trigger
    await callGHL('addTag', { contactId, tags: ['beltool-send-whatsapp'] });
  },

  async triggerWebhook(url: string, payload?: unknown) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('[GHL] Webhook error:', e);
    }
  },
};
