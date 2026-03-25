/**
 * email.templates.ts
 * HTML email templates voor survey en bedankmail.
 */

export interface SurveyEmailData {
  firstName:    string;
  companyName?: string;
  surveyUrl:    string;
  callerName?:  string;
}

export interface ThankYouEmailData {
  firstName:    string;
  companyName?: string;
  leadLabel:    '🔥 HOT' | '☀️ WARM' | '❄️ COLD';
  score:        number;
  answers: {
    hoursPerWeek?: string;
    tasks?:        string[];
    growthPhase?:  string;
    aiStatus?:     string;
  };
  callerName?: string;
}

const BRAND_COLOR = '#3B82F6';
const BASE_STYLE  = `font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.6;`;

export function surveyEmailHtml(data: SurveyEmailData): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Korte enquête van CliqMakers</title></head>
<body style="${BASE_STYLE} margin:0; padding:0; background:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding: 32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <!-- Header -->
      <tr><td style="background:${BRAND_COLOR}; padding:28px 36px;">
        <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">CliqMakers</h1>
        <p style="color:rgba(255,255,255,0.85); margin:4px 0 0; font-size:13px;">AI & Automatisering voor het MKB</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px;">
        <h2 style="margin:0 0 16px; font-size:20px; color:#1a1a1a;">Hoi ${data.firstName}! 👋</h2>
        <p style="margin:0 0 16px; color:#444;">Naar aanleiding van ons gesprek sturen we je graag een korte enquête (2 minuten). 
        Jouw antwoorden helpen ons om een concreet advies op maat voor te bereiden.</p>
        <p style="margin:0 0 28px; color:#444;">Klik op de knop hieronder om te beginnen:</p>
        <!-- CTA Button -->
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
          <tr><td align="center" style="background:${BRAND_COLOR}; border-radius:8px;">
            <a href="${data.surveyUrl}" style="display:inline-block; padding:14px 32px; color:#ffffff; text-decoration:none; font-weight:700; font-size:16px;">
              📋 Start enquête →
            </a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px; color:#888; font-size:13px;">Of kopieer deze link in je browser:</p>
        <p style="margin:0 0 24px; color:${BRAND_COLOR}; font-size:12px; word-break:break-all;">${data.surveyUrl}</p>
        <p style="margin:0; color:#444;">Met vriendelijke groet,<br>
        <strong>${data.callerName || 'Het CliqMakers team'}</strong></p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f8f9fa; padding:20px 36px; border-top:1px solid #e9ecef;">
        <p style="margin:0; font-size:12px; color:#999;">CliqMakers · AI & Automatisering · <a href="https://cliqmakers.nl" style="color:#999;">cliqmakers.nl</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`.trim();
}

export function thankYouEmailHtml(data: ThankYouEmailData): string {
  const tasksList = (data.answers.tasks || [])
    .map(t => `<li style="margin-bottom:4px;">${t}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bedankt voor jouw antwoorden!</title></head>
<body style="${BASE_STYLE} margin:0; padding:0; background:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <!-- Header -->
      <tr><td style="background:${BRAND_COLOR}; padding:28px 36px;">
        <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">CliqMakers</h1>
        <p style="color:rgba(255,255,255,0.85); margin:4px 0 0; font-size:13px;">Bedankt voor het invullen!</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px;">
        <h2 style="margin:0 0 16px; font-size:20px;">Bedankt, ${data.firstName}! 🎉</h2>
        <p style="margin:0 0 24px; color:#444;">We hebben jouw antwoorden ontvangen en gaan een concreet advies voor je voorbereiden. 
        Een van onze adviseurs neemt binnenkort contact met je op.</p>
        <!-- Summary box -->
        <div style="background:#f0f7ff; border-radius:8px; border:1px solid #bfdbfe; padding:20px; margin:0 0 24px;">
          <h3 style="margin:0 0 12px; font-size:14px; color:${BRAND_COLOR}; text-transform:uppercase; letter-spacing:0.05em;">
            📊 Jouw profiel
          </h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${data.answers.hoursPerWeek ? `<tr><td style="padding:4px 0; color:#555; font-size:13px;">⏱️ Tijdverlies per week</td><td style="color:#1a1a1a; font-size:13px; font-weight:600;">${data.answers.hoursPerWeek}</td></tr>` : ''}
            ${data.answers.growthPhase ? `<tr><td style="padding:4px 0; color:#555; font-size:13px;">📈 Groeifase</td><td style="color:#1a1a1a; font-size:13px; font-weight:600;">${data.answers.growthPhase}</td></tr>` : ''}
            ${data.answers.aiStatus ? `<tr><td style="padding:4px 0; color:#555; font-size:13px;">🤖 AI status</td><td style="color:#1a1a1a; font-size:13px; font-weight:600;">${data.answers.aiStatus}</td></tr>` : ''}
          </table>
          ${tasksList ? `<p style="margin:12px 0 4px; color:#555; font-size:13px;">🔄 Tijdrovende taken:</p><ul style="margin:0; padding-left:20px; color:#1a1a1a; font-size:13px;">${tasksList}</ul>` : ''}
          <p style="margin:16px 0 0; font-size:13px; color:#444;">
            Lead kwalificatie: <strong style="font-size:16px;">${data.leadLabel}</strong> (${data.score}pts)
          </p>
        </div>
        <p style="margin:0; color:#444;">Met vriendelijke groet,<br>
        <strong>${data.callerName || 'Het CliqMakers team'}</strong></p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f8f9fa; padding:20px 36px; border-top:1px solid #e9ecef;">
        <p style="margin:0; font-size:12px; color:#999;">CliqMakers · AI & Automatisering · <a href="https://cliqmakers.nl" style="color:#999;">cliqmakers.nl</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`.trim();
}

export function surveyEmailSubject(firstName: string): string {
  return `${firstName}, even 2 minuten? Jouw snelle vragenlijst 📋`;
}

export function thankYouEmailSubject(firstName: string): string {
  return `Bedankt ${firstName} — we nemen snel contact op 🎉`;
}
