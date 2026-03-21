// GHL service (mock — replace with real API calls)
export const ghl = {
  async updateContactStage(id: string, stage: string) {
    console.log(`[GHL] ${id} → ${stage}`);
  },
  async saveSurveyAnswers(id: string, answers: unknown) {
    console.log('[GHL] Survey', id, answers);
  },
  async bookAppointment(id: string, date: string, time: string, advisor: string) {
    console.log('[GHL] Book', id, date, time, advisor);
  },
  async createTask(id: string, type: string, _data?: unknown) {
    console.log('[GHL] Task', id, type);
  },
  async createNote(id: string, _note: string) {
    console.log('[GHL] Note', id);
  },
  async logCall(id: string, _result: string) {
    console.log('[GHL] Call', id);
  },
  async sendEmail(id: string, _template: string) {
    console.log('[GHL] Email', id);
  },
  async sendWhatsApp(id: string, _template: string) {
    console.log('[GHL] WA', id);
  },
  async triggerWebhook(url: string, _payload?: unknown) {
    console.log('[GHL] WH', url);
  },
};
