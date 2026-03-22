import type { SurveyAnswers } from '@/types/beltool';

export interface MessageTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
  channels: ('whatsapp' | 'sms' | 'email')[];
  /** Template with placeholders: {voornaam}, {bedrijf}, {taken}, {uren}, {beller}, {bookingLink} */
  body: string;
  /** Email subject (only for email channel) */
  subject?: string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'opvolg-enquete',
    label: 'Opvolging na enquête',
    icon: '📋',
    description: 'Na telefonische enquête — samenvatting + booking-link',
    channels: ['whatsapp', 'email'],
    subject: 'Bedankt voor uw tijd, {voornaam} — uw gratis adviesgesprek',
    body: `Hallo {voornaam},

Bedankt voor het prettige gesprek zojuist! Zoals besproken verliest u momenteel {uren} per week aan {taken}.

Graag plan ik een gratis adviesgesprek van 15 minuten voor u in, waarin we concreet bekijken hoe u die tijd terugwint.

Plan direct in via deze link:
{bookingLink}

Met vriendelijke groet,
{beller} — CliqMakers`,
  },
  {
    id: 'opvolg-interesse',
    label: 'Had interesse, geen tijd',
    icon: '⏰',
    description: 'Prospect had interesse maar geen tijd voor enquête',
    channels: ['whatsapp', 'sms'],
    body: `Hallo {voornaam}, u spreek met {beller} van CliqMakers. Fijn dat u geïnteresseerd bent! Hier is de link om direct een gratis adviesgesprek in te plannen op een moment dat u uitkomt: {bookingLink}`,
  },
  {
    id: 'opvolg-geen-gehoor',
    label: 'Geen gehoor — eerste poging',
    icon: '📵',
    description: 'Na niet bereikt — kort bericht met booking-link',
    channels: ['whatsapp', 'sms'],
    body: `Hallo {voornaam}, ik probeerde u zojuist te bereiken namens CliqMakers. We doen een kort onderzoek naar tijdverlies in het MKB en hebben een gratis aanbod voor {bedrijf}. Mag ik u terugbellen, of plan hier direct in: {bookingLink}`,
  },
  {
    id: 'booking-link',
    label: 'Booking-link sturen',
    icon: '📅',
    description: 'Alleen de booking-link, kort en krachtig',
    channels: ['whatsapp', 'sms'],
    body: `Hallo {voornaam}, hier is de link om uw gratis adviesgesprek in te plannen: {bookingLink} — Groet, {beller} (CliqMakers)`,
  },
  {
    id: 'bedankt-afspraak',
    label: 'Bevestiging na afspraak',
    icon: '🎉',
    description: 'Bevestiging dat de afspraak is ingepland',
    channels: ['whatsapp', 'email'],
    subject: 'Uw adviesgesprek is bevestigd, {voornaam}',
    body: `Hallo {voornaam},

Uw gratis adviesgesprek is ingepland! U ontvangt een aparte kalender-uitnodiging met de details.

Mocht u van tevoren al vragen hebben, antwoord gerust op dit bericht.

Tot snel!
{beller} — CliqMakers`,
  },
  {
    id: 'terugbellen-herinnering',
    label: 'Herinnering terugbelafspraak',
    icon: '🔔',
    description: 'Vooraankondiging dat je morgen belt',
    channels: ['whatsapp', 'sms'],
    body: `Hallo {voornaam}, even een kort berichtje: ik bel u morgen kort terug zoals afgesproken, namens CliqMakers. Tot dan! — {beller}`,
  },
];

export function renderTemplate(
  template: MessageTemplate,
  vars: {
    voornaam: string;
    bedrijf: string;
    beller: string;
    uren?: string;
    taken?: string;
    bookingLink?: string;
  }
): string {
  const link = vars.bookingLink || 'https://cliqmakers.nl/afspraak';
  return template.body
    .replace(/\{voornaam\}/g, vars.voornaam || '[Naam]')
    .replace(/\{bedrijf\}/g, vars.bedrijf || '[Bedrijf]')
    .replace(/\{beller\}/g, vars.beller || '[Beller]')
    .replace(/\{uren\}/g, vars.uren || 'aanzienlijke uren')
    .replace(/\{taken\}/g, vars.taken || 'repetitieve taken')
    .replace(/\{bookingLink\}/g, link);
}

export function renderSubject(
  template: MessageTemplate,
  vars: { voornaam: string }
): string {
  return (template.subject || '')
    .replace(/\{voornaam\}/g, vars.voornaam || '[Naam]');
}
