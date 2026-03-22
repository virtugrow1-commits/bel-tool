import { useState } from 'react';
import { cn } from '@/lib/utils';
import { OBJECTIONS, type Objection } from '@/lib/objections';

interface ObjectionPanelProps {
  contactName: string;
  onUseRebuttal?: (text: string) => void;
}

function RebuttalCard({ rebuttal, index, onUse }: { rebuttal: string; index: number; onUse?: (text: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onUse) onUse(rebuttal);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex gap-2 py-2 px-2.5 rounded-lg hover:bg-primary/[0.04] transition-colors group">
      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
        {index + 1}
      </div>
      <div className="flex-1 text-[12px] leading-relaxed text-foreground/80 italic">
        "{rebuttal}"
      </div>
      <button
        onClick={handleCopy}
        className={cn(
          'shrink-0 px-2 py-1 rounded text-[9px] font-semibold transition-all opacity-0 group-hover:opacity-100 self-start',
          copied
            ? 'bg-success/10 text-success'
            : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
        )}
      >
        {copied ? '✓' : 'Gebruik'}
      </button>
    </div>
  );
}

export function ObjectionPanel({ contactName, onUseRebuttal }: ObjectionPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const personalize = (text: string) => text.replace(/\{naam\}/g, contactName || '[Naam]');

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-destructive/[0.03]">
        <div className="text-[10px] font-bold text-destructive uppercase tracking-wider">Bezwaar? Klik voor weerlegging</div>
      </div>
      <div className="p-1.5 space-y-0.5">
        {OBJECTIONS.map(obj => {
          const isOpen = expanded === obj.id;
          return (
            <div key={obj.id}>
              <button
                onClick={() => setExpanded(isOpen ? null : obj.id)}
                className={cn(
                  'flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg text-[12px] font-semibold transition-all',
                  isOpen
                    ? 'bg-primary/[0.06] text-primary border border-primary/20'
                    : 'text-foreground/70 hover:bg-muted/50 border border-transparent'
                )}
              >
                <span className="text-[14px]">{obj.icon}</span>
                <span className="flex-1">{obj.trigger}</span>
                <span className={cn('text-[9px] text-muted-foreground transition-transform', isOpen && 'rotate-90')}>▶</span>
              </button>
              {isOpen && (
                <div className="ml-2 mr-1 mb-1 border-l-2 border-primary/20 animate-fade-in">
                  {obj.rebuttals.map((r, i) => (
                    <RebuttalCard
                      key={i}
                      rebuttal={personalize(r)}
                      index={i}
                      onUse={onUseRebuttal}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
