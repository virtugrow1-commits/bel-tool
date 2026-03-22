import { useState } from 'react';
import { cn } from '@/lib/utils';

interface VoicemailScriptProps {
  contactName: string;
  companyName: string;
  callerName: string;
  onDone: () => void;
  onSkip: () => void;
}

const VM_SCRIPTS = [
  {
    id: 'kort',
    label: 'Kort (15 sec)',
    icon: '⚡',
    template: 'Goedemorgen {contact}, u spreekt met {caller} van CliqMakers. Ik probeerde u te bereiken over een kort onderzoek naar tijdverlies in het MKB. Ik probeer het later nog een keer. Fijne dag!',
  },
  {
    id: 'uitgebreid',
    label: 'Uitgebreid (25 sec)',
    icon: '📋',
    template: 'Goedemorgen {contact}, u spreekt met {caller} van CliqMakers. We doen momenteel een praktijkonderzoek bij MKB-bedrijven zoals {company} naar onnodig tijdverlies door handmatig werk. Ik zou u hier graag kort over spreken. U kunt mij terugbellen, of ik probeer het later nog een keer. Fijne dag!',
  },
];

export function VoicemailScript({ contactName, companyName, callerName, onDone, onSkip }: VoicemailScriptProps) {
  const [selected, setSelected] = useState('kort');

  const script = VM_SCRIPTS.find(s => s.id === selected);
  const rendered = (script?.template || '')
    .replace(/\{contact\}/g, contactName)
    .replace(/\{company\}/g, companyName)
    .replace(/\{caller\}/g, callerName);

  return (
    <div className="bg-info/[0.04] border border-info/15 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[16px]">📱</span>
        <div className="text-[13px] font-bold text-info">Voicemail inspreken</div>
      </div>

      {/* Script variant selector */}
      <div className="flex gap-1.5 mb-3">
        {VM_SCRIPTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-[11px] font-semibold border transition-all',
              selected === s.id
                ? 'border-info/30 bg-info/[0.08] text-info'
                : 'border-border text-muted-foreground hover:border-info/20'
            )}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Script text */}
      <div className="bg-card border border-border rounded-lg p-3 mb-3">
        <p className="text-[13px] leading-relaxed text-foreground italic">
          "{rendered}"
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onDone}
          className="flex-1 py-2.5 rounded-lg bg-info text-white text-[12px] font-semibold hover:bg-info/90 active:scale-[0.97] transition-all"
        >
          VM ingesproken — Volgende
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2.5 rounded-lg bg-muted text-muted-foreground text-[12px] font-semibold hover:bg-muted/80 active:scale-[0.97] transition-all border border-border"
        >
          Overslaan
        </button>
      </div>
    </div>
  );
}
