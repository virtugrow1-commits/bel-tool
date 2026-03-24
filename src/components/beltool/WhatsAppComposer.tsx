import { useState } from 'react';
import { cn } from '@/lib/utils';
import { cliq } from '@/lib/beltool-ghl';
import { MESSAGE_TEMPLATES, renderTemplate, renderSubject, type MessageTemplate } from '@/lib/message-templates';
import type { CompanyContact, Company, SurveyAnswers } from '@/types/beltool';

type Channel = 'whatsapp' | 'sms' | 'email';
type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

interface WhatsAppComposerProps {
  contact: CompanyContact;
  company: Company;
  callerName: string;
  answers?: SurveyAnswers;
  bookingLink?: string;
  /** Pre-select a template context */
  context?: 'enquete' | 'geen-gehoor' | 'interesse' | 'afspraak' | 'terugbellen';
  onSent?: (channel: Channel, template: string) => void;
  onClose: () => void;
}

const CHANNEL_CONFIG: Record<Channel, { icon: string; label: string; color: string }> = {
  whatsapp: { icon: '💬', label: 'WhatsApp', color: 'hsl(142 70% 40%)' },
  sms: { icon: '📱', label: 'SMS', color: 'hsl(210 80% 52%)' },
  email: { icon: '📧', label: 'Email', color: 'hsl(265 83% 57%)' },
};

const CONTEXT_TO_TEMPLATE: Record<string, string> = {
  'enquete': 'stuur-enquete',
  'geen-gehoor': 'opvolg-geen-gehoor',
  'interesse': 'opvolg-interesse',
  'afspraak': 'bedankt-afspraak',
  'terugbellen': 'terugbellen-herinnering',
};

export function WhatsAppComposer({ contact, company, callerName, answers, bookingLink, context, onSent, onClose }: WhatsAppComposerProps) {
  const defaultTemplateId = context ? CONTEXT_TO_TEMPLATE[context] : MESSAGE_TEMPLATES[0].id;
  const [selectedTemplate, setSelectedTemplate] = useState<string>(defaultTemplateId || MESSAGE_TEMPLATES[0].id);
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [editing, setEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  const [status, setStatus] = useState<SendStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const template = MESSAGE_TEMPLATES.find(t => t.id === selectedTemplate) || MESSAGE_TEMPLATES[0];
  const taskString = answers
    ? answers.tasks.concat(answers.tasksOther ? [answers.tasksOther] : []).filter(Boolean).join(', ')
    : '';

  const enqueteLink = `${window.location.origin}/enquete/${contact.id}`;

  const vars = {
    voornaam: contact.firstName,
    bedrijf: company.name,
    beller: callerName,
    uren: answers?.hours || '',
    taken: taskString,
    bookingLink: bookingLink || 'https://cliqmakers.nl/afspraak',
    enqueteLink,
  };

  const renderedMessage = editing ? editedMessage : renderTemplate(template, vars);
  const renderedSubject = renderSubject(template, { voornaam: contact.firstName });

  const availableChannels = template.channels;

  // Switch to available channel if current isn't supported
  const effectiveChannel = availableChannels.includes(channel) ? channel : availableChannels[0];

  const handleSend = async () => {
    if (!contact.id || !renderedMessage.trim()) return;
    if (effectiveChannel === 'email' && !contact.email?.trim()) {
      setStatus('error');
      setErrorMsg('Geen e-mailadres bekend — vul eerst het e-mailadres in bij contactgegevens.');
      setTimeout(() => setStatus('idle'), 4000);
      return;
    }
    setStatus('sending');
    setErrorMsg('');

    try {
      if (effectiveChannel === 'whatsapp') {
        const result = await cliq.sendWhatsAppMessage(contact.id, renderedMessage);
        if (!result.success) throw new Error('WhatsApp verzending mislukt');
      } else if (effectiveChannel === 'sms') {
        const result = await cliq.sendSMS(contact.id, renderedMessage);
        if (!result.success) throw new Error('SMS verzending mislukt');
      } else if (effectiveChannel === 'email') {
        const htmlBody = renderedMessage.replace(/\n/g, '<br>');
        const result = await cliq.sendEmailMessage(contact.id, renderedSubject, htmlBody);
        if (!result.success) throw new Error('Email verzending mislukt');
      }

      // Log as note in CRM
      cliq.createNote(contact.id, `📨 ${CHANNEL_CONFIG[effectiveChannel].label} verstuurd: "${template.label}" — ${new Date().toLocaleString('nl-NL')}`).catch(() => {});

      setStatus('sent');
      onSent?.(effectiveChannel, template.id);

      // Auto-close after 2s
      setTimeout(() => onClose(), 2000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Verzending mislukt');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const startEditing = () => {
    setEditedMessage(renderedMessage);
    setEditing(true);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">💬</span>
          <div>
            <div className="text-[13px] font-bold text-foreground">Bericht sturen naar {contact.firstName}</div>
            <div className="text-[11px] text-muted-foreground">{contact.phone} · {company.name}</div>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-sm transition-colors">✕</button>
      </div>

      <div className="p-4 space-y-3">
        {/* Channel selector */}
        <div className="flex gap-1.5">
          {(['whatsapp', 'sms', 'email'] as Channel[]).map(ch => {
            const cfg = CHANNEL_CONFIG[ch];
            const available = availableChannels.includes(ch);
            return (
              <button
                key={ch}
                onClick={() => available && setChannel(ch)}
                disabled={!available}
                className={cn(
                  'flex-1 py-2 px-2 rounded-lg text-[11px] font-semibold border transition-all',
                  effectiveChannel === ch
                    ? 'border-primary/30 bg-primary/[0.06] text-primary'
                    : available
                    ? 'border-border text-muted-foreground hover:border-primary/20'
                    : 'border-border/30 text-muted-foreground/30 cursor-not-allowed'
                )}
              >
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Template picker */}
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Template</div>
          <div className="grid grid-cols-2 gap-1.5">
            {MESSAGE_TEMPLATES.filter(t => t.channels.includes(effectiveChannel)).map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedTemplate(t.id); setEditing(false); }}
                className={cn(
                  'text-left px-3 py-2 rounded-lg border text-[11px] transition-all',
                  selectedTemplate === t.id
                    ? 'border-primary/30 bg-primary/[0.06]'
                    : 'border-border hover:border-primary/20'
                )}
              >
                <span className="text-[13px]">{t.icon}</span>
                <span className={cn('ml-1 font-semibold', selectedTemplate === t.id ? 'text-primary' : 'text-foreground/70')}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Message preview / edit */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {editing ? 'Bericht bewerken' : 'Voorbeeld'}
            </div>
            {!editing && status === 'idle' && (
              <button onClick={startEditing} className="text-[10px] text-primary font-semibold hover:underline">
                Bewerken
              </button>
            )}
            {editing && (
              <button onClick={() => setEditing(false)} className="text-[10px] text-muted-foreground font-semibold hover:underline">
                Reset
              </button>
            )}
          </div>

          {effectiveChannel === 'email' && renderedSubject && (
            <div className="px-3 py-2 rounded-t-lg border border-b-0 border-border bg-muted/30 text-[12px]">
              <span className="text-muted-foreground">Onderwerp: </span>
              <span className="font-semibold text-foreground">{renderedSubject}</span>
            </div>
          )}

          <div className={cn(
            'border rounded-lg overflow-hidden',
            effectiveChannel === 'email' && renderedSubject ? 'rounded-t-none' : '',
            effectiveChannel === 'whatsapp' ? 'bg-[#E7F5EC] dark:bg-[#0B3B25]' : 'bg-card'
          )}>
            {editing ? (
              <textarea
                value={editedMessage}
                onChange={e => setEditedMessage(e.target.value)}
                className="w-full p-3 text-[13px] leading-relaxed bg-transparent text-foreground outline-none resize-y min-h-[120px]"
                autoFocus
              />
            ) : (
              <div className="p-3 text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap min-h-[80px]">
                {renderedMessage}
              </div>
            )}
          </div>

          <div className="text-[10px] text-muted-foreground mt-1">
            {renderedMessage.length} tekens
            {effectiveChannel === 'sms' && renderedMessage.length > 160 && (
              <span className="text-warning ml-1">({Math.ceil(renderedMessage.length / 160)} SMS berichten)</span>
            )}
          </div>
        </div>

        {/* Error */}
        {status === 'error' && (
          <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-[12px] text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-muted text-muted-foreground text-[12px] font-semibold hover:bg-muted/80 active:scale-[0.97] transition-all border border-border"
          >
            Annuleren
          </button>
          <button
            onClick={handleSend}
            disabled={status !== 'idle' || !renderedMessage.trim()}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-[12px] font-semibold active:scale-[0.97] transition-all text-white',
              status === 'sent'
                ? 'bg-success'
                : status === 'error'
                ? 'bg-destructive'
                : 'bg-primary hover:bg-primary/90',
              (status === 'sending' || !renderedMessage.trim()) && 'opacity-60 cursor-not-allowed'
            )}
          >
            {status === 'idle' && `${CHANNEL_CONFIG[effectiveChannel].icon} Verstuur via ${CHANNEL_CONFIG[effectiveChannel].label}`}
            {status === 'sending' && (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Versturen...
              </span>
            )}
            {status === 'sent' && '✓ Verstuurd!'}
            {status === 'error' && 'Mislukt — probeer opnieuw'}
          </button>
        </div>
      </div>
    </div>
  );
}
