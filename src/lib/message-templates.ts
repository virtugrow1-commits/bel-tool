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
  /** GHL WhatsApp template name (for approved template sending) */
  ghlTemplateName?: string;
  /**
   * Ordered list of variable keys that map to GHL template placeholders {{1}}, {{2}}, etc.
   * E.g. ['voornaam', 'beller'] means {{1}} = voornaam, {{2}} = beller
   */
  ghlPlaceholderKeys?: string[];
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'opvolg-enquete',
    label: 'Opvolging na enquête',
    icon: '📋',
    description: 'Na telefonische enquête — samenvatting + booking-link',
    channels: ['whatsapp', 'email'],
    ghlTemplateName: 'opvolging_na_enquete',
    ghlPlaceholderKeys: ['voornaam', 'uren', 'taken', 'bookingLink', 'beller'],
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
    ghlTemplateName: 'had_interesse_geen_tijd',
    ghlPlaceholderKeys: ['voornaam', 'beller', 'bookingLink'],
    body: `Hallo {voornaam}, u sprak met {beller} van CliqMakers. Fijn dat u geïnteresseerd bent! Hier is de link om direct een gratis adviesgesprek in te plannen op een moment dat u uitkomt: {bookingLink}`,
  },
  {
    id: 'stuur-enquete',
    label: 'Enquête digitaal sturen',
    icon: '📋',
    description: 'Stuur de 4-vragen enquête via link',
    channels: ['whatsapp', 'sms', 'email'],
    ghlTemplateName: 'enquete_digitaal_sturen',
    ghlPlaceholderKeys: ['voornaam', 'beller'],
    body: `Hallo {voornaam},

Zoals zojuist besproken stuur ik u hierbij de link naar ons praktijkonderzoek:

{enqueteLink}

in de behoeften en uitdagingen van ondernemers.

Alvast hartelijk dank voor uw tijd!

Met vriendelijke groet,

{beller}

Team CliqMakers`,
  },
  {
    id: 'opvolg-geen-gehoor',
    label: 'Geen gehoor — eerste poging',
    icon: '📵',
    description: 'Na niet bereikt — kort bericht met enquête-link',
    channels: ['whatsapp', 'sms'],
    ghlTemplateName: 'geen_gehoor_eerste_poging',
    ghlPlaceholderKeys: ['voornaam', 'enqueteLink'],
    body: `Hallo {voornaam}, ik probeerde u zojuist te bereiken namens CliqMakers. We doen een kort onderzoek naar tijdverlies in het MKB. Wilt u de 4 vragen even digitaal invullen? Kost maar 2 minuten: {enqueteLink}`,
  },
  {
    id: 'booking-link',
    label: 'Booking-link sturen',
    icon: '📅',
    description: 'Alleen de booking-link, kort en krachtig',
    channels: ['whatsapp', 'sms'],
    ghlTemplateName: 'booking_link_sturen',
    ghlPlaceholderKeys: ['voornaam', 'bookingLink', 'beller'],
    body: `Hallo {voornaam}, hier is de link om uw gratis adviesgesprek in te plannen: {bookingLink} — Groet, {beller} (CliqMakers)`,
  },
  {
    id: 'bedankt-afspraak',
    label: 'Bevestiging na afspraak',
    icon: '🎉',
    description: 'Bevestiging dat de afspraak is ingepland',
    channels: ['whatsapp', 'email'],
    ghlTemplateName: 'bevestiging_na_afspraak',
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
    ghlTemplateName: 'herinnering_terugbelafspraak',
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
    enqueteLink?: string;
    contactId?: string;
  }
): string {
  const bookLink = vars.bookingLink || 'https://adviesgesprekken.cliqmakers.nl/';
  const surveyLink = vars.enqueteLink || `https://enquete.cliqmakers.nl/enquete/${vars.contactId || 'contact.id'}`;
  return template.body
    .replace(/\{voornaam\}/g, vars.voornaam || '[Naam]')
    .replace(/\{bedrijf\}/g, vars.bedrijf || '[Bedrijf]')
    .replace(/\{beller\}/g, vars.beller || '[Beller]')
    .replace(/\{uren\}/g, vars.uren || 'aanzienlijke uren')
    .replace(/\{taken\}/g, vars.taken || 'repetitieve taken')
    .replace(/\{bookingLink\}/g, bookLink)
    .replace(/\{enqueteLink\}/g, surveyLink);
}

export function renderSubject(
  template: MessageTemplate,
  vars: { voornaam: string }
): string {
  return (template.subject || '')
    .replace(/\{voornaam\}/g, vars.voornaam || '[Naam]');
}
