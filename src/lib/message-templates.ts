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
    id: 'enquete-reminder',
    label: 'Enquête herinnering',
    icon: '🔔',
    description: 'Herinnering voor het invullen van de enquête',
    channels: ['whatsapp'],
    ghlTemplateName: 'enquete_reminder_1',
    ghlPlaceholderKeys: ['voornaam'],
    body: `Hoi {voornaam} ,

U heeft onlangs van ons een korte enquête ontvangen voor ons praktijkonderzoek.

Het invullen duurt slechts 2 minuten en helpt ons om zzp'ers en MKB beter te adviseren.

Alvast bedankt voor uw tijd!

Met vriendelijke groet,
{brandName}`,
  },
  {
    id: 'stuur-enquete',
    label: 'Enquête digitaal sturen',
    icon: '📋',
    description: 'Stuur de enquête-link na telefonisch contact',
    channels: ['whatsapp', 'sms', 'email'],
    ghlTemplateName: 'enquete_digitaal_sturen',
    ghlPlaceholderKeys: ['voornaam', 'beller'],
    subject: 'Uw praktijkonderzoek van CliqMakers',
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
    id: 'opvolg-enquete',
    label: 'Opvolging na enquête',
    icon: '📋',
    description: 'Na telefonische enquête — samenvatting + booking-link',
    channels: ['whatsapp', 'email'],
    ghlTemplateName: 'opvolging_na_enquete',
    ghlPlaceholderKeys: ['voornaam', 'uren', 'taken', 'beller'],
    subject: 'Bedankt voor uw tijd, {voornaam} — uw gratis adviesgesprek',
    body: `Hallo {voornaam},

Bedankt voor het prettige gesprek zojuist! Zoals besproken verliest u momenteel {uren} per week aan {taken}.

Graag plan ik een gratis adviesgesprek van 15 minuten voor u in, waarin we concreet bekijken hoe u die tijd terugwint.

Plan direct in via deze link:

https://adviesgesprekken.cliqmakers.nl/

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
    ghlPlaceholderKeys: ['voornaam', 'beller'],
    body: `Hallo {voornaam},

U sprak met {beller} van CliqMakers. Fijn dat u geïnteresseerd bent!

Hier is de link om direct een vrijblijvend adviesgesprek in te plannen op een moment dat u uitkomt: 

https://adviesgesprekken.cliqmakers.nl/`,
  },
  {
    id: 'booking-link',
    label: 'Booking-link sturen',
    icon: '📅',
    description: 'Alleen de booking-link, kort en krachtig',
    channels: ['whatsapp', 'sms'],
    ghlTemplateName: 'booking_link_sturen',
    ghlPlaceholderKeys: ['voornaam', 'beller'],
    body: `Hallo {voornaam}, 

hier is de link om uw gratis adviesgesprek in te plannen:  

https://adviesgesprekken.cliqmakers.nl/

 Groet, {beller} (CliqMakers)`,
  },
  {
    id: 'afspraak-bevestiging',
    label: 'Bevestiging afspraak',
    icon: '🎉',
    description: 'Bevestiging dat de afspraak is ingepland',
    channels: ['whatsapp'],
    ghlTemplateName: 'afspraak_bevestiging',
    ghlPlaceholderKeys: ['voornaam', 'datum', 'tijd', 'locatie'],
    body: `Hi {voornaam}
Je afspraak met CliqMakers is ingepland.

📅 Datum: {datum}

⏰ Tijd: {tijd}

📍 Locatie: {locatie}

We kijken ernaar uit om je te spreken!

CliqMakers`,
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
    datum?: string;
    tijd?: string;
    locatie?: string;
  }
): string {
  const surveyLink = vars.enqueteLink || `https://enquete.cliqmakers.nl/enquete/${vars.contactId || 'contact.id'}`;
  return template.body
    .replace(/\{voornaam\}/g, vars.voornaam || '[Naam]')
    .replace(/\{bedrijf\}/g, vars.bedrijf || '[Bedrijf]')
    .replace(/\{beller\}/g, vars.beller || '[Beller]')
    .replace(/\{uren\}/g, vars.uren || 'aanzienlijke uren')
    .replace(/\{taken\}/g, vars.taken || 'repetitieve taken')
    .replace(/\{enqueteLink\}/g, surveyLink)
    .replace(/\{datum\}/g, vars.datum || '[Datum]')
    .replace(/\{tijd\}/g, vars.tijd || '[Tijd]')
    .replace(/\{locatie\}/g, vars.locatie || '[Locatie]');
}

export function renderSubject(
  template: MessageTemplate,
  vars: { voornaam: string }
): string {
  return (template.subject || '')
    .replace(/\{voornaam\}/g, vars.voornaam || '[Naam]');
}

/**
 * Build the GHL WhatsApp template placeholders from template keys and variable values.
 * Returns { body: ["value1", "value2", ...] } matching {{1}}, {{2}}, etc.
 */
export function buildPlaceholders(
  template: MessageTemplate,
  vars: Record<string, string>,
): { body: string[] } {
  if (!template.ghlPlaceholderKeys?.length) return { body: [] };
  const body = template.ghlPlaceholderKeys.map(key => vars[key] || '');
  return { body };
}
