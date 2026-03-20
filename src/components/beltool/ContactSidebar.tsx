import { cn } from '@/lib/utils';
import { Contact, STAGE_META, CallPhase } from '@/types/beltool';

interface ContactSidebarProps {
  contacts: Contact[];
  activeId: string | null;
  search: string;
  onSearchChange: (val: string) => void;
  onSelect: (contact: Contact) => void;
  phase: CallPhase;
  onBusy: () => void;
}

export function ContactSidebar({ contacts, activeId, search, onSearchChange, onSelect, phase, onBusy }: ContactSidebarProps) {
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return `${c.firstName} ${c.lastName} ${c.company}`.toLowerCase().includes(q);
  });

  return (
    <div className="w-[280px] shrink-0 border-r border-border bg-sidebar flex flex-col h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            C
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-foreground">CliqMakers</div>
            <div className="text-[10px] font-bold tracking-[2px] text-primary">BEL-TOOL</div>
          </div>
        </div>
        <input
          type="text"
          placeholder="Zoek contact..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-foreground/[0.04] text-foreground text-[13px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map(c => {
          const s = STAGE_META[c.stage];
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => {
                if (phase !== 'idle' && c.id !== activeId) { onBusy(); return; }
                if (phase === 'idle') onSelect(c);
              }}
              className={cn(
                'block w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150',
                isActive
                  ? 'border-[1.5px] border-primary bg-primary/[0.08]'
                  : 'border-[1.5px] border-transparent hover:bg-foreground/[0.04]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground truncate">
                  {c.firstName} {c.lastName}
                </span>
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', s.bgClass, s.color)}>
                  {s.label}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.company}</div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border text-[11px] text-muted-foreground text-center">
        {filtered.length} contacten
      </div>
    </div>
  );
}
